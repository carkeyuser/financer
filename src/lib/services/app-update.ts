import { spawn } from "child_process"
import { accessSync, constants, existsSync } from "fs"
import { join } from "path"
import {
  getDeployMode,
  getHostAppDir,
  isAppUpdateEnabled,
  readPackageVersion,
} from "@/lib/config/app-update"
import type { AppUpdateEvent } from "@/lib/validations/app-update"
import type { VersionInfo } from "@/lib/validations/app-update"
import { assertUpdateAvailable, getRemoteUpdateStatus } from "@/lib/services/update-availability"

const RATE_LIMIT_MS = 5 * 60 * 1000

let updateInProgress = false
let lastSuccessfulStartAt = 0

export async function getVersionInfo(): Promise<VersionInfo> {
  const updateEnabled = isAppUpdateEnabled()
  const version = readPackageVersion()
  const remote = await getRemoteUpdateStatus(version)
  return {
    version,
    updateEnabled,
    deployMode: updateEnabled ? getDeployMode() : null,
    latestVersion: remote.latestVersion,
    updateAvailable: remote.updateAvailable,
  }
}

export type UpdateStartError =
  | { code: "not_available"; message: string }
  | { code: "no_update"; message: string }
  | { code: "in_progress"; message: string }
  | { code: "rate_limited"; message: string }

export async function tryAcquireUpdate(): Promise<UpdateStartError | null> {
  if (!isAppUpdateEnabled()) {
    return { code: "not_available", message: "In-App-Update ist nicht aktiviert" }
  }
  const noUpdate = await assertUpdateAvailable(readPackageVersion())
  if (noUpdate) {
    return { code: "no_update", message: noUpdate }
  }
  if (updateInProgress) {
    return { code: "in_progress", message: "Ein Update läuft bereits" }
  }
  const now = Date.now()
  if (lastSuccessfulStartAt > 0 && now - lastSuccessfulStartAt < RATE_LIMIT_MS) {
    return { code: "rate_limited", message: "Bitte einen Moment warten und erneut versuchen" }
  }
  updateInProgress = true
  return null
}

export function markUpdateRateLimited(): void {
  lastSuccessfulStartAt = Date.now()
}

export function releaseUpdateLock(): void {
  updateInProgress = false
}

function warnIfGitNotWritable(hostDir: string, emit: (event: AppUpdateEvent) => void): void {
  const gitDir = join(hostDir, ".git")
  if (!existsSync(gitDir)) return
  try {
    accessSync(gitDir, constants.W_OK)
  } catch {
    emit({
      type: "log",
      level: "info",
      message:
        "→ Hinweis: .git nicht beschreibbar — update.sh nutzt Docker-Git (root), falls konfiguriert. Siehe plan/deploy.md",
    })
  }
}

/** Test-only reset */
export function resetUpdateStateForTests(): void {
  updateInProgress = false
  lastSuccessfulStartAt = 0
}

export type SpawnUpdateFn = (
  hostDir: string,
  onLine: (stream: "stdout" | "stderr", line: string) => void
) => Promise<number>

/** Standalone Node often has a minimal PATH — use absolute bash from the image. */
export function resolveBashPath(): string {
  const candidates = [
    process.env.FINANCER_BASH_PATH,
    "/bin/bash",
    "/usr/bin/bash",
  ].filter((p): p is string => Boolean(p))
  for (const p of candidates) {
    if (p === "/bin/bash" || p === "/usr/bin/bash") {
      if (existsSync(p)) return p
    } else if (existsSync(p)) {
      return p
    }
  }
  throw new Error(
    "bash nicht im App-Container — Image v0.1.1+ pullen und Container neu erstellen"
  )
}

const defaultSpawnUpdate: SpawnUpdateFn = (hostDir, onLine) =>
  new Promise((resolve, reject) => {
    let bashBin: string
    try {
      bashBin = resolveBashPath()
    } catch (err) {
      reject(err)
      return
    }
    const scriptPath = join(hostDir, "scripts", "update.sh")
    if (!existsSync(scriptPath)) {
      reject(new Error("Update-Skript fehlt im Deploy-Verzeichnis (/deploy/scripts/update.sh)"))
      return
    }
    const child = spawn(bashBin, [scriptPath], {
      cwd: hostDir,
      env: {
        ...process.env,
        APP_DIR: hostDir,
        PATH: process.env.PATH ?? "/bin:/usr/bin:/sbin:/usr/local/bin",
      },
    })

    const handleData = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
      const text = chunk.toString("utf8")
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (line.length > 0) onLine(stream, line)
      }
    }

    child.stdout?.on("data", handleData("stdout"))
    child.stderr?.on("data", handleData("stderr"))
    child.on("error", reject)
    child.on("close", (code) => resolve(code ?? 1))
  })

let spawnUpdateImpl: SpawnUpdateFn = defaultSpawnUpdate

export function setSpawnUpdateForTests(fn: SpawnUpdateFn | null): void {
  spawnUpdateImpl = fn ?? defaultSpawnUpdate
}

export async function runAppUpdate(
  emit: (event: AppUpdateEvent) => void,
  options?: { spawnUpdate?: SpawnUpdateFn }
): Promise<void> {
  const hostDir = getHostAppDir()
  const spawnUpdate = options?.spawnUpdate ?? spawnUpdateImpl

  try {
    emit({ type: "log", level: "info", message: `→ Starte Update in ${hostDir} …` })
    warnIfGitNotWritable(hostDir, emit)

    const exitCode = await spawnUpdate(hostDir, (stream, line) => {
      emit({
        type: "log",
        level: stream === "stderr" && /fehler|error|✗/i.test(line) ? "error" : "info",
        message: line,
      })
    })

    if (exitCode !== 0) {
      emit({
        type: "error",
        error: `Update beendet mit Exit-Code ${exitCode}`,
      })
      return
    }

    markUpdateRateLimited()
    emit({ type: "complete", data: { ok: true } })
  } finally {
    releaseUpdateLock()
  }
}

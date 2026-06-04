import { spawn } from "child_process"
import { join } from "path"
import {
  getDeployMode,
  getHostAppDir,
  isAppUpdateEnabled,
  readPackageVersion,
} from "@/lib/config/app-update"
import type { AppUpdateEvent } from "@/lib/validations/app-update"
import type { VersionInfo } from "@/lib/validations/app-update"

const RATE_LIMIT_MS = 5 * 60 * 1000

let updateInProgress = false
let lastSuccessfulStartAt = 0

export function getVersionInfo(): VersionInfo {
  const updateEnabled = isAppUpdateEnabled()
  return {
    version: readPackageVersion(),
    updateEnabled,
    deployMode: updateEnabled ? getDeployMode() : null,
  }
}

export type UpdateStartError =
  | { code: "not_available"; message: string }
  | { code: "in_progress"; message: string }
  | { code: "rate_limited"; message: string }

export function tryAcquireUpdate(): UpdateStartError | null {
  if (!isAppUpdateEnabled()) {
    return { code: "not_available", message: "In-App-Update ist nicht aktiviert" }
  }
  if (updateInProgress) {
    return { code: "in_progress", message: "Ein Update läuft bereits" }
  }
  const now = Date.now()
  if (lastSuccessfulStartAt > 0 && now - lastSuccessfulStartAt < RATE_LIMIT_MS) {
    return { code: "rate_limited", message: "Bitte einen Moment warten und erneut versuchen" }
  }
  updateInProgress = true
  lastSuccessfulStartAt = now
  return null
}

export function releaseUpdateLock(): void {
  updateInProgress = false
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

const defaultSpawnUpdate: SpawnUpdateFn = (hostDir, onLine) =>
  new Promise((resolve, reject) => {
    const scriptPath = join(hostDir, "scripts", "update.sh")
    const child = spawn("bash", [scriptPath], {
      cwd: hostDir,
      env: { ...process.env, APP_DIR: hostDir },
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

    emit({ type: "complete", data: { ok: true } })
  } finally {
    releaseUpdateLock()
  }
}

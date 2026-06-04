import { compareVersions } from "@/data/release-notes"
import { getDeployMode, getHostAppDir, isAppUpdateEnabled } from "@/lib/config/app-update"
import { existsSync } from "fs"
import { execFile } from "child_process"
import { join } from "path"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const CACHE_MS = 5 * 60 * 1000
const GITHUB_REPO = process.env.FINANCER_GITHUB_REPO ?? "carkeyuser/financer"

type RemoteCache = {
  at: number
  latestVersion: string | null
  gitBehind: boolean | null
  githubOk: boolean
}

let remoteCache: RemoteCache | null = null

export function resetUpdateAvailabilityCacheForTests(): void {
  remoteCache = null
}

function normalizeVersion(tag: string): string {
  return tag.trim().replace(/^v/i, "")
}

async function fetchLatestGitHubRelease(): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "financer-app-update",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { tag_name?: string }
    if (!data.tag_name) return null
    return normalizeVersion(data.tag_name)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function isGitBehindOriginMain(hostDir: string): Promise<boolean | null> {
  if (!existsSync(join(hostDir, ".git"))) return null
  try {
    const gitEnv = {
      ...process.env,
      PATH: process.env.PATH ?? "/bin:/usr/bin:/sbin:/usr/local/bin",
      GIT_TERMINAL_PROMPT: "0",
    }
    await execFileAsync("git", ["-C", hostDir, "fetch", "--quiet", "origin", "main"], {
      env: gitEnv,
      timeout: 20_000,
    })
    const { stdout } = await execFileAsync(
      "git",
      ["-C", hostDir, "rev-list", "--count", "HEAD..origin/main"],
      { env: gitEnv, timeout: 5_000 }
    )
    const count = Number.parseInt(stdout.trim(), 10)
    return Number.isFinite(count) && count > 0
  } catch {
    return null
  }
}

async function loadRemoteCache(): Promise<RemoteCache> {
  const now = Date.now()
  if (remoteCache && now - remoteCache.at < CACHE_MS) {
    return remoteCache
  }

  const hostDir = getHostAppDir()
  const [latestVersion, gitBehind] = await Promise.all([
    fetchLatestGitHubRelease(),
    isGitBehindOriginMain(hostDir),
  ])

  remoteCache = {
    at: now,
    latestVersion,
    gitBehind,
    githubOk: latestVersion !== null,
  }
  return remoteCache
}

export type RemoteUpdateStatus = {
  latestVersion: string | null
  /** null = check inconclusive — allow manual update */
  updateAvailable: boolean | null
}

export async function getRemoteUpdateStatus(currentVersion: string): Promise<RemoteUpdateStatus> {
  if (!isAppUpdateEnabled()) {
    return { latestVersion: null, updateAvailable: null }
  }

  const remote = await loadRemoteCache()
  const semverBehind =
    remote.latestVersion !== null &&
    compareVersions(currentVersion, remote.latestVersion) < 0

  const gitBehind = remote.gitBehind === true

  if (semverBehind || gitBehind) {
    return {
      latestVersion: remote.latestVersion,
      updateAvailable: true,
    }
  }

  if (remote.githubOk || remote.gitBehind === false) {
    return {
      latestVersion: remote.latestVersion ?? currentVersion,
      updateAvailable: false,
    }
  }

  return { latestVersion: remote.latestVersion, updateAvailable: null }
}

export async function assertUpdateAvailable(currentVersion: string): Promise<string | null> {
  const status = await getRemoteUpdateStatus(currentVersion)
  if (status.updateAvailable === false) {
    return "Kein neues Update verfügbar"
  }
  return null
}

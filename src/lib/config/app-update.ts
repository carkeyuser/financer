import { readFileSync } from "fs"
import { join } from "path"

export type DeployMode = "build" | "ghcr"

const TRUTHY = new Set(["1", "true", "yes", "on"])

export function isAppUpdateEnabled(): boolean {
  const v = process.env.FINANCER_UPDATE_ENABLED?.trim().toLowerCase()
  return v !== undefined && TRUTHY.has(v)
}

export function getHostAppDir(): string {
  const dir = process.env.FINANCER_HOST_APP_DIR?.trim()
  return dir && dir.length > 0 ? dir : "/deploy"
}

export function getDeployMode(): DeployMode | null {
  if (!isAppUpdateEnabled()) return null
  const mode = process.env.FINANCER_DEPLOY_MODE?.trim().toLowerCase()
  if (mode === "ghcr") return "ghcr"
  if (mode === "build") return "build"
  return "build"
}

export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"
}

/** Server-side package version (same as build when env is set). */
export function readPackageVersion(): string {
  try {
    const pkgPath = join(process.cwd(), "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
    return pkg.version ?? getAppVersion()
  } catch {
    return getAppVersion()
  }
}

// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

vi.mock("@/lib/services/update-availability", () => ({
  getRemoteUpdateStatus: vi.fn().mockResolvedValue({
    latestVersion: "9.9.9",
    updateAvailable: true,
  }),
  assertUpdateAvailable: vi.fn().mockResolvedValue(null),
  resetUpdateAvailabilityCacheForTests: vi.fn(),
}))

describe("app-update service", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function loadService() {
    const mod = await import("@/lib/services/app-update")
    mod.resetUpdateStateForTests()
    return mod
  }

  it("getVersionInfo reflects update disabled by default", async () => {
    delete process.env.FINANCER_UPDATE_ENABLED
    const { getVersionInfo } = await loadService()
    const info = await getVersionInfo()
    expect(info.updateEnabled).toBe(false)
    expect(info.deployMode).toBeNull()
    expect(info.version).toBeTruthy()
  })

  it("getVersionInfo includes deployMode when enabled", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    process.env.FINANCER_DEPLOY_MODE = "ghcr"
    const { getVersionInfo } = await loadService()
    const info = await getVersionInfo()
    expect(info.updateEnabled).toBe(true)
    expect(info.deployMode).toBe("ghcr")
  })

  it("tryAcquireUpdate returns not_available when disabled", async () => {
    const { tryAcquireUpdate } = await loadService()
    expect((await tryAcquireUpdate())?.code).toBe("not_available")
  })

  it("tryAcquireUpdate blocks parallel updates", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    const { tryAcquireUpdate, releaseUpdateLock } = await loadService()
    expect(await tryAcquireUpdate()).toBeNull()
    expect((await tryAcquireUpdate())?.code).toBe("in_progress")
    releaseUpdateLock()
  })

  it("tryAcquireUpdate rate limits only after successful update", async () => {
    vi.useFakeTimers()
    process.env.FINANCER_UPDATE_ENABLED = "true"
    const { tryAcquireUpdate, releaseUpdateLock, markUpdateRateLimited } = await loadService()
    expect(await tryAcquireUpdate()).toBeNull()
    releaseUpdateLock()
    expect(await tryAcquireUpdate()).toBeNull()
    releaseUpdateLock()
    markUpdateRateLimited()
    expect((await tryAcquireUpdate())?.code).toBe("rate_limited")
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    expect(await tryAcquireUpdate()).toBeNull()
    vi.useRealTimers()
  })

  it("runAppUpdate streams logs and completes on exit 0", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    const { tryAcquireUpdate, runAppUpdate, setSpawnUpdateForTests, releaseUpdateLock } =
      await loadService()
    await tryAcquireUpdate()

    const events: string[] = []
    await runAppUpdate(
      (e) => {
        if (e.type === "log") events.push(e.message)
        if (e.type === "complete") events.push("complete")
      },
      {
        spawnUpdate: async (_dir, onLine) => {
          onLine("stdout", "→ git pull …")
          return 0
        },
      }
    )

    expect(events).toContain("→ git pull …")
    expect(events).toContain("complete")
    releaseUpdateLock()
    setSpawnUpdateForTests(null)
  })

  it.skipIf(process.platform === "win32")(
    "resolveBashPath prefers /bin/bash when present",
    async () => {
      const { resolveBashPath } = await loadService()
      expect(resolveBashPath()).toBe("/bin/bash")
    }
  )

  it("runAppUpdate emits error on non-zero exit", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    const { tryAcquireUpdate, runAppUpdate, setSpawnUpdateForTests } = await loadService()
    await tryAcquireUpdate()

    const types: string[] = []
    await runAppUpdate(
      (e) => types.push(e.type),
      {
        spawnUpdate: async () => 1,
      }
    )

    expect(types).toContain("error")
    expect(types).not.toContain("complete")
    setSpawnUpdateForTests(null)
  })
})

// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

describe("update-availability", () => {
  const originalEnv = process.env
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    globalThis.fetch = originalFetch
  })

  async function load() {
    const mod = await import("@/lib/services/update-availability")
    mod.resetUpdateAvailabilityCacheForTests()
    return mod
  }

  it("reports up to date when GitHub latest matches current", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.1.1" }), { status: 200 })
    )
    const { getRemoteUpdateStatus } = await load()
    const status = await getRemoteUpdateStatus("0.1.1")
    expect(status.updateAvailable).toBe(false)
    expect(status.latestVersion).toBe("0.1.1")
  })

  it("reports update available when GitHub latest is newer", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.1.2" }), { status: 200 })
    )
    const { getRemoteUpdateStatus } = await load()
    const status = await getRemoteUpdateStatus("0.1.1")
    expect(status.updateAvailable).toBe(true)
    expect(status.latestVersion).toBe("0.1.2")
  })

  it("assertUpdateAvailable blocks when up to date", async () => {
    process.env.FINANCER_UPDATE_ENABLED = "true"
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ tag_name: "v0.1.1" }), { status: 200 })
    )
    const { assertUpdateAvailable } = await load()
    expect(await assertUpdateAvailable("0.1.1")).toBe("Kein neues Update verfügbar")
  })
})

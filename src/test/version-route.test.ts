// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const requireSession = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}))

vi.mock("@/lib/services/app-update", () => ({
  getVersionInfo: async () => ({
    version: "0.1.0",
    updateEnabled: false,
    deployMode: null,
    latestVersion: null,
    updateAvailable: null,
  }),
}))

describe("GET /api/version", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSession.mockResolvedValue({
      userId: "u1",
      householdId: "hh-1",
    })
  })

  it("returns 401 without session", async () => {
    requireSession.mockResolvedValue({ error: "Nicht autorisiert", status: 401 })
    const { GET } = await import("@/app/api/version/route")
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns version info for authenticated user", async () => {
    const { GET } = await import("@/app/api/version/route")
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBe("0.1.0")
    expect(body.updateEnabled).toBe(false)
  })
})

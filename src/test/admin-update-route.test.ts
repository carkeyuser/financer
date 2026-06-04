// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const requireHouseholdAdmin = vi.fn()
const tryAcquireUpdate = vi.fn()
const runAppUpdate = vi.fn()

vi.mock("@/lib/household-auth", () => ({
  requireHouseholdAdmin: (...args: unknown[]) => requireHouseholdAdmin(...args),
}))

vi.mock("@/lib/services/app-update", () => ({
  tryAcquireUpdate: (...args: unknown[]) => tryAcquireUpdate(...args),
  runAppUpdate: (...args: unknown[]) => runAppUpdate(...args),
}))

describe("POST /api/admin/update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireHouseholdAdmin.mockResolvedValue({
      userId: "admin-1",
      householdId: "hh-1",
      membership: { role: "ADMIN" },
    })
    tryAcquireUpdate.mockReturnValue(null)
    runAppUpdate.mockImplementation(async (emit: (e: { type: string; message?: string; data?: unknown }) => void) => {
      emit({ type: "log", level: "info", message: "ok" })
      emit({ type: "complete", data: { ok: true } })
    })
  })

  it("returns 401 when not authenticated", async () => {
    requireHouseholdAdmin.mockResolvedValue({ error: "Nicht autorisiert", status: 401 })
    const { POST } = await import("@/app/api/admin/update/route")
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin", async () => {
    requireHouseholdAdmin.mockResolvedValue({ error: "Keine Berechtigung", status: 403 })
    const { POST } = await import("@/app/api/admin/update/route")
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it("returns 503 when update disabled", async () => {
    tryAcquireUpdate.mockReturnValue({
      code: "not_available",
      message: "In-App-Update ist nicht aktiviert",
    })
    const { POST } = await import("@/app/api/admin/update/route")
    const res = await POST()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toContain("nicht aktiviert")
  })

  it("returns 409 when update in progress", async () => {
    tryAcquireUpdate.mockReturnValue({
      code: "in_progress",
      message: "Ein Update läuft bereits",
    })
    const { POST } = await import("@/app/api/admin/update/route")
    const res = await POST()
    expect(res.status).toBe(409)
  })

  it("streams NDJSON on success", async () => {
    const { POST } = await import("@/app/api/admin/update/route")
    const res = await POST()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson")
    const text = await res.text()
    expect(text).toContain('"type":"log"')
    expect(text).toContain('"type":"complete"')
  })
})

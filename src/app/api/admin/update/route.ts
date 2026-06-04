import { NextResponse } from "next/server"
import { requireHouseholdAdmin } from "@/lib/household-auth"
import { createNdjsonResponse } from "@/lib/utils/ndjson-stream"
import type { AppUpdateEvent } from "@/lib/validations/app-update"
import { runAppUpdate, tryAcquireUpdate } from "@/lib/services/app-update"

export async function POST() {
  const admin = await requireHouseholdAdmin()
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const blocked = await tryAcquireUpdate()
  if (blocked) {
    const status =
      blocked.code === "not_available"
        ? 503
        : blocked.code === "no_update"
          ? 400
          : blocked.code === "in_progress"
            ? 409
            : 429
    return NextResponse.json({ error: blocked.message }, { status })
  }

  return createNdjsonResponse<AppUpdateEvent>(async (emit) => {
    await runAppUpdate(emit)
  })
}

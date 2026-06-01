import type { MessageKey } from "@/i18n/messages"

export function notificationParams(
  payload: Record<string, unknown>
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) continue
    out[k] = typeof v === "number" ? v : String(v)
  }
  return out
}

export function asNotificationMessageKey(key: string): MessageKey {
  return key as MessageKey
}

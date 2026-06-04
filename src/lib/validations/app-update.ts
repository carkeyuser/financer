import { z } from "zod"

export const appUpdateLogEventSchema = z.object({
  type: z.literal("log"),
  level: z.enum(["info", "error"]),
  message: z.string(),
})

export const appUpdateCompleteEventSchema = z.object({
  type: z.literal("complete"),
  data: z.object({ ok: z.literal(true) }),
})

export const appUpdateErrorEventSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
})

export const appUpdateEventSchema = z.discriminatedUnion("type", [
  appUpdateLogEventSchema,
  appUpdateCompleteEventSchema,
  appUpdateErrorEventSchema,
])

export type AppUpdateEvent = z.infer<typeof appUpdateEventSchema>

export const versionInfoSchema = z.object({
  version: z.string(),
  updateEnabled: z.boolean(),
  deployMode: z.enum(["build", "ghcr"]).nullable(),
})

export type VersionInfo = z.infer<typeof versionInfoSchema>

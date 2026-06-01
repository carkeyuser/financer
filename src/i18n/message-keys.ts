/** Collects dot-separated paths for all string leaves in a message tree. */
export function collectMessageKeys(
  obj: Record<string, unknown>,
  prefix = ""
): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectMessageKeys(value as Record<string, unknown>, path))
    } else if (typeof value === "string") {
      keys.push(path)
    }
  }
  return keys
}

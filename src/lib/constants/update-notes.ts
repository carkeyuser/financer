export const LAST_SEEN_VERSION_STORAGE_KEY = "financer:lastSeenVersion"

export function getLastSeenVersion(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY)
}

export function markVersionSeen(version: string): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, version)
}

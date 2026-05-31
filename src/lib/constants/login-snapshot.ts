export const LOGIN_SNAPSHOT_STORAGE_KEY = "financer:loginSnapshot"

export function markLoginSnapshotPending() {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(LOGIN_SNAPSHOT_STORAGE_KEY, "1")
}

export function consumeLoginSnapshotPending(): boolean {
  if (typeof sessionStorage === "undefined") return false
  const pending = sessionStorage.getItem(LOGIN_SNAPSHOT_STORAGE_KEY) === "1"
  if (pending) sessionStorage.removeItem(LOGIN_SNAPSHOT_STORAGE_KEY)
  return pending
}

import type { MessageKey } from "./messages"

export function assetTypeKey(type: string): MessageKey {
  return `enums.assetType.${type}` as MessageKey
}

export function entryTypeKey(type: string): MessageKey {
  return `enums.entryType.${type}` as MessageKey
}

export function roleKey(role: string): MessageKey {
  return `enums.role.${role}` as MessageKey
}

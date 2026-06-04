import type { Locale } from "./locales"
import { createTranslator, type MessageKey } from "./messages"

/** Maps API error strings / codes to i18n message keys (de + en via createTranslator). */
const API_MESSAGE_KEYS: Record<string, MessageKey> = {
  "Nicht autorisiert": "errors.unauthorized",
  Unauthorized: "errors.unauthorized",
  "Nicht gefunden": "errors.notFound",
  "Not found": "errors.notFound",
  "Keine Berechtigung": "errors.forbidden",
  "Kein Zugriff auf diesen Haushalt": "errors.noHouseholdAccess",
  "Kein Haushalt ausgewählt": "errors.noHouseholdSelected",
  "Menge würde negativ werden": "errors.quantityWouldBeNegative",
  "Asset nicht gefunden": "errors.assetNotFound",
  "Ungültiges JSON": "errors.invalidJson",
  "Ungültiges Backup-Format": "errors.invalidBackupFormat",
  "Benutzer nicht gefunden": "errors.userNotFound",
  "Der Eigentümer kann nicht bearbeitet werden": "errors.ownerCannotEdit",
  "Ungültiger Code": "errors.invalidCode",
  "Kein Secret vorhanden — zuerst Setup aufrufen": "errors.noSecretSetupFirst",
  "Code ungültig oder abgelaufen": "errors.codeInvalidOrExpired",
  "2FA ist nicht aktiv": "errors.twoFactorNotActive",
  "2FA ist bereits aktiv": "errors.twoFactorAlreadyActive",
  "Ungültige Anfrage": "errors.invalidRequest",
  "Ungültiger Request": "errors.invalidRequest",
  "Mitglied nicht gefunden": "errors.memberNotFound",
  "Nur der Eigentümer kann Benutzer anlegen": "errors.onlyOwnerCanCreateUsers",
  "Token fehlt": "errors.tokenMissing",
  "Einladung ungültig oder abgelaufen": "errors.inviteInvalid",
  "Bitte zuerst anmelden": "errors.pleaseLoginFirst",
  "Ungültige Reihenfolge": "errors.invalidOrder",
  "Einladung nicht gefunden": "errors.inviteNotFound",
  "Einladung bereits abgelaufen": "errors.inviteExpired",
  "Symbol fehlt": "errors.symbolMissing",
  "symbol und from sind erforderlich": "errors.symbolRequired",
  "Kein Passwort gesetzt": "errors.noPasswordSet",
  "Nur der Eigentümer kann Rollen ändern": "errors.onlyOwnerCanChangeRoles",
  "Die Rolle des Eigentümers kann nicht geändert werden": "errors.ownerRoleCannotChange",
  "Du kannst dich nicht selbst entfernen": "errors.cannotRemoveSelf",
  "Der Eigentümer kann nicht entfernt werden": "errors.ownerCannotRemove",
  "Du kannst dich nicht selbst löschen": "errors.cannotDeleteSelf",
  "Nur angelegte Tenant-Benutzer können hier gelöscht werden": "errors.provisionedTenantDeleteOnly",
  "Haushaltsmitglieder über die Mitgliederverwaltung entfernen": "errors.removeMembersViaManagement",
  "Benutzer hat selbst angelegte Tenant-Benutzer — zuerst diese löschen":
    "errors.deleteProvisionedTenantsFirst",
  "Benutzername bereits vergeben": "errors.usernameTaken",
  "User not in household": "errors.userNotInHousehold",
  "widgetId required": "errors.widgetIdRequired",
  "Wechselkurs konnte nicht geladen werden": "errors.fxRateLoadFailed",
  "Wechselkurse konnten nicht geladen werden": "errors.fxRatesLoadFailed",
  "interval muss 1d, 1wk oder 1mo sein": "errors.intervalInvalid",
  "Interest-Position kann nicht bearbeitet werden": "errors.interestCannotEdit",
  "Interest-Position kann nicht gelöscht werden": "errors.interestCannotDelete",
  "Interest ist eine reservierte Dividenden-Position": "errors.interestReservedDividend",
  "Keine CSV-Datei hochgeladen": "errors.noCsvUploaded",
  "Datei zu groß (max. 5 MB)": "errors.fileTooLarge",
  "Zielbenutzer nicht im Haushalt": "errors.targetUserNotInHousehold",
  "Import fehlgeschlagen": "errors.importFailed",
  "Bitte einen Moment warten und erneut versuchen": "errors.waitAndRetry",
  "Vorschau abgelaufen — bitte CSV erneut hochladen": "errors.previewExpired",
  "Stream ohne Ergebnis": "errors.streamNoResult",
  "Request failed": "errors.requestFailed",
  "Löschen fehlgeschlagen": "errors.deleteFailed",
  "Month outside simulation": "errors.monthOutsideSimulation",
  "Aktuelles Passwort ist falsch": "errors.currentPasswordIncorrect",
  "Registrierung ist deaktiviert": "errors.registrationDisabled",
  "Unbekannte Benutzernamen im Backup (kein Haushaltsmitglied)": "errors.backupUnknownUsernames",
  "Benachrichtigungen konnten nicht geladen werden": "errors.notificationsLoadFailed",
  "Snapshots konnten nicht geladen werden": "errors.snapshotsLoadFailed",
  "Briefing konnte nicht geladen werden": "errors.briefingLoadFailed",
  "In-App-Update ist nicht aktiviert": "update.notAvailable",
  "Ein Update läuft bereits": "update.inProgress",
  "Ungültiger Schritt": "errors.invalidChecklistStep",
  "year und month erforderlich": "errors.yearMonthRequired",
  NO_NET_SALARY: "errors.noNetSalary",
  INVALID_DATE: "errors.invalidDate",
  YEAR_NOT_PAST: "validation.personalIncomeYearNotPast",
  FROM_AFTER_TO: "validation.personalIncomeFromAfterTo",
  YEARS_SPAN_TOO_LARGE: "validation.personalIncomeYearsSpanTooLarge",
}

function extractFirstErrorMessage(error: unknown): string | null {
  if (error == null) return null
  if (typeof error === "string") return error
  if (typeof error !== "object") return null

  const o = error as Record<string, unknown>

  if (typeof o.error === "string") return o.error

  if (o.error && typeof o.error === "object") {
    const nested = extractFirstErrorMessage(o.error)
    if (nested) return nested
  }

  if (o.fieldErrors && typeof o.fieldErrors === "object") {
    for (const msgs of Object.values(o.fieldErrors as Record<string, string[]>)) {
      if (Array.isArray(msgs) && typeof msgs[0] === "string") return msgs[0]
    }
  }

  if (Array.isArray(o.formErrors) && typeof o.formErrors[0] === "string") {
    return o.formErrors[0]
  }

  return null
}

export function mapApiError(message: string, locale: Locale): string {
  const t = createTranslator(locale)
  const key = API_MESSAGE_KEYS[message]
  if (key) {
    if (message === "YEARS_SPAN_TOO_LARGE") {
      return t(key, { max: 30 })
    }
    return t(key)
  }
  return message
}

export function translateApiError(error: unknown, locale: Locale): string {
  const msg = extractFirstErrorMessage(error)
  if (msg) return mapApiError(msg, locale)
  return createTranslator(locale)("errors.generic")
}

export function translateFieldErrors(
  fieldErrors: Record<string, string[]>,
  locale: Locale
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(fieldErrors)) {
    result[key] = messages.map((m) => mapApiError(m, locale))
  }
  return result
}

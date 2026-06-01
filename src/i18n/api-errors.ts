import type { Locale } from "./locales"
import { createTranslator } from "./messages"

const API_ERROR_MAP: Record<string, { de: string; en: string }> = {
  "Nicht autorisiert": { de: "Nicht autorisiert", en: "Unauthorized" },
  "Nicht gefunden": { de: "Nicht gefunden", en: "Not found" },
  "Keine Berechtigung": { de: "Keine Berechtigung", en: "Forbidden" },
  "Kein Zugriff auf diesen Haushalt": { de: "Kein Zugriff auf diesen Haushalt", en: "No access to this household" },
  "Kein Haushalt ausgewählt": { de: "Kein Haushalt ausgewählt", en: "No household selected" },
  "Menge würde negativ werden": { de: "Menge würde negativ werden", en: "Quantity would become negative" },
  "Asset nicht gefunden": { de: "Asset nicht gefunden", en: "Asset not found" },
  "Ungültiges JSON": { de: "Ungültiges JSON", en: "Invalid JSON" },
  "Ungültiges Backup-Format": { de: "Ungültiges Backup-Format", en: "Invalid backup format" },
  "Benutzer nicht gefunden": { de: "Benutzer nicht gefunden", en: "User not found" },
  "Der Eigentümer kann nicht bearbeitet werden": { de: "Der Eigentümer kann nicht bearbeitet werden", en: "The owner cannot be edited" },
  "Ungültiger Code": { de: "Ungültiger Code", en: "Invalid code" },
  "Kein Secret vorhanden — zuerst Setup aufrufen": { de: "Kein Secret vorhanden — zuerst Setup aufrufen", en: "No secret — call setup first" },
  "Code ungültig oder abgelaufen": { de: "Code ungültig oder abgelaufen", en: "Code invalid or expired" },
  "2FA ist nicht aktiv": { de: "2FA ist nicht aktiv", en: "2FA is not active" },
  "2FA ist bereits aktiv": { de: "2FA ist bereits aktiv", en: "2FA is already active" },
  "Ungültige Anfrage": { de: "Ungültige Anfrage", en: "Invalid request" },
  "Mitglied nicht gefunden": { de: "Mitglied nicht gefunden", en: "Member not found" },
  "Nur der Eigentümer kann Benutzer anlegen": { de: "Nur der Eigentümer kann Benutzer anlegen", en: "Only the owner can create users" },
  "Token fehlt": { de: "Token fehlt", en: "Token missing" },
  "Einladung ungültig oder abgelaufen": { de: "Einladung ungültig oder abgelaufen", en: "Invitation invalid or expired" },
  "Bitte zuerst anmelden": { de: "Bitte zuerst anmelden", en: "Please sign in first" },
  "Ungültige Reihenfolge": { de: "Ungültige Reihenfolge", en: "Invalid order" },
  "Einladung nicht gefunden": { de: "Einladung nicht gefunden", en: "Invitation not found" },
  "Einladung bereits abgelaufen": { de: "Einladung bereits abgelaufen", en: "Invitation already expired" },
  "Symbol fehlt": { de: "Symbol fehlt", en: "Symbol missing" },
  "symbol und from sind erforderlich": { de: "symbol und from sind erforderlich", en: "symbol and from are required" },
  "Kein Passwort gesetzt": { de: "Kein Passwort gesetzt", en: "No password set" },
  "Nur der Eigentümer kann Rollen ändern": { de: "Nur der Eigentümer kann Rollen ändern", en: "Only the owner can change roles" },
  "Die Rolle des Eigentümers kann nicht geändert werden": { de: "Die Rolle des Eigentümers kann nicht geändert werden", en: "The owner's role cannot be changed" },
  "Du kannst dich nicht selbst entfernen": { de: "Du kannst dich nicht selbst entfernen", en: "You cannot remove yourself" },
  "Der Eigentümer kann nicht entfernt werden": { de: "Der Eigentümer kann nicht entfernt werden", en: "The owner cannot be removed" },
  "Du kannst dich nicht selbst löschen": { de: "Du kannst dich nicht selbst löschen", en: "You cannot delete yourself" },
  "Nur angelegte Tenant-Benutzer können hier gelöscht werden": {
    de: "Nur angelegte Tenant-Benutzer können hier gelöscht werden",
    en: "Only provisioned tenant users can be deleted here",
  },
  "Haushaltsmitglieder über die Mitgliederverwaltung entfernen": {
    de: "Haushaltsmitglieder über die Mitgliederverwaltung entfernen",
    en: "Remove household members via member management",
  },
  "Benutzer hat selbst angelegte Tenant-Benutzer — zuerst diese löschen": {
    de: "Benutzer hat selbst angelegte Tenant-Benutzer — zuerst diese löschen",
    en: "User has provisioned tenant users — delete those first",
  },
  "Benutzername bereits vergeben": { de: "Benutzername bereits vergeben", en: "Username already taken" },
  Unauthorized: { de: "Nicht autorisiert", en: "Unauthorized" },
  "User not in household": { de: "Benutzer nicht im Haushalt", en: "User not in household" },
  "Not found": { de: "Nicht gefunden", en: "Not found" },
  "widgetId required": { de: "widgetId erforderlich", en: "widgetId required" },
  "Wechselkurs konnte nicht geladen werden": {
    de: "Wechselkurs konnte nicht geladen werden",
    en: "Exchange rate could not be loaded",
  },
  "Wechselkurse konnten nicht geladen werden": {
    de: "Wechselkurse konnten nicht geladen werden",
    en: "Exchange rates could not be loaded",
  },
  "interval muss 1d, 1wk oder 1mo sein": {
    de: "interval muss 1d, 1wk oder 1mo sein",
    en: "interval must be 1d, 1wk or 1mo",
  },
  "Interest-Position kann nicht bearbeitet werden": {
    de: "Interest-Position kann nicht bearbeitet werden",
    en: "Interest position cannot be edited",
  },
  "Interest-Position kann nicht gelöscht werden": {
    de: "Interest-Position kann nicht gelöscht werden",
    en: "Interest position cannot be deleted",
  },
  "Interest ist eine reservierte Dividenden-Position": {
    de: "Interest ist eine reservierte Dividenden-Position",
    en: "Interest is a reserved dividend position",
  },
  "Keine CSV-Datei hochgeladen": { de: "Keine CSV-Datei hochgeladen", en: "No CSV file uploaded" },
  "Datei zu groß (max. 5 MB)": { de: "Datei zu groß (max. 5 MB)", en: "File too large (max. 5 MB)" },
  "Zielbenutzer nicht im Haushalt": {
    de: "Zielbenutzer nicht im Haushalt",
    en: "Target user is not in the household",
  },
  "Import fehlgeschlagen": { de: "Import fehlgeschlagen", en: "Import failed" },
  "Bitte einen Moment warten und erneut versuchen": {
    de: "Bitte einen Moment warten und erneut versuchen",
    en: "Please wait a moment and try again",
  },
  "Ungültiger Request": { de: "Ungültiger Request", en: "Invalid request" },
  "Vorschau abgelaufen — bitte CSV erneut hochladen": {
    de: "Vorschau abgelaufen — bitte CSV erneut hochladen",
    en: "Preview expired — please upload the CSV again",
  },
  "Stream ohne Ergebnis": { de: "Stream ohne Ergebnis", en: "Stream ended without result" },
  "Request failed": { de: "Anfrage fehlgeschlagen", en: "Request failed" },
  "Löschen fehlgeschlagen": { de: "Löschen fehlgeschlagen", en: "Delete failed" },
  "Month outside simulation": {
    de: "Monat liegt außerhalb der Simulation",
    en: "Month is outside the simulation",
  },
  "Aktuelles Passwort ist falsch": {
    de: "Aktuelles Passwort ist falsch",
    en: "Current password is incorrect",
  },
}

export function mapApiError(message: string, locale: Locale): string {
  const mapped = API_ERROR_MAP[message]
  if (mapped) return locale === "en" ? mapped.en : mapped.de
  return message
}

export function translateApiError(error: unknown, locale: Locale): string {
  const t = createTranslator(locale)
  if (typeof error === "string") return mapApiError(error, locale)
  if (error && typeof error === "object") {
    if ("error" in error) {
      const err = (error as { error: unknown }).error
      if (typeof err === "string") return mapApiError(err, locale)
      if (err && typeof err === "object") {
        const first = Object.values(err as Record<string, string[]>)[0]
        if (Array.isArray(first) && first[0]) return mapApiError(first[0], locale)
      }
    }
  }
  return t("errors.generic")
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

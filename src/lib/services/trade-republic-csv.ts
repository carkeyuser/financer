import { createHash } from "crypto"
import type { TrImportEventType, TrParsedRow } from "@/lib/services/tr-import-types"

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "datum", "timestamp"],
  time: ["time", "zeit", "uhrzeit"],
  product: ["product", "produkt", "name"],
  isin: ["isin", "instrument isin", "instrument", "wkn"],
  type: ["type", "typ", "transaction type", "transaktionstyp", "transaction", "transaktion"],
  quantity: ["number", "anzahl", "quantity", "shares", "stück", "menge"],
  price: ["price", "kurs", "rate"],
  totalEur: ["total eur", "eur value", "gesamt eur", "total", "betrag eur", "amount", "betrag", "gesamt", "value", "wert"],
  debit: ["debit", "belastung"],
  credit: ["credit", "gutschrift"],
  taxEur: ["tax amount", "steuer", "tax", "quellensteuer"],
  orderId: ["order id", "orderid", "order-id", "referenz", "id"],
}

const IGNORED_TYPES = new Set([
  "deposit",
  "withdrawal",
  "einzahlung",
  "auszahlung",
  "transfer",
  "überweisung",
  "round up",
  "roundup",
  "saveback",
  "card",
  "atm",
])

const PURCHASE_TYPES = new Set(["buy", "kauf", "purchase", "sparplan", "savings plan"])
const SALE_TYPES = new Set(["sell", "verkauf", "sale"])
const DIVIDEND_TYPES = new Set(["dividend", "dividende", "dividends", "coupon", "kupon", "ausschüttung", "ausschuettung", "ertrag"])
const INTEREST_TYPES = new Set(["interest", "zinsen", "zins", "interest payout", "zinsauszahlung"])

export function parseTradeRepublicCsv(content: string): TrParsedRow[] {
  const text = content.replace(/^\uFEFF/, "").trim()
  if (!text) throw new Error("EMPTY_FILE")

  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error("NO_DATA")

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader)
  const columnMap = buildColumnMap(headers)

  if (columnMap.date === undefined) throw new Error("MISSING_DATE_COLUMN")

  const rows: TrParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter)
    if (cells.every((c) => !c.trim())) continue

    const get = (key: keyof typeof HEADER_ALIASES) => {
      const idx = columnMap[key]
      return idx === undefined ? "" : (cells[idx] ?? "").trim()
    }

    const dateRaw = get("date")
    const date = parseDate(dateRaw, get("time"))
    if (!date) continue

    let product = get("product") || "Unknown"
    let isin = normalizeIsin(get("isin"))
    if (!isin) {
      isin = findIsinInCells(cells)
    }
    if (!isin && product) {
      const productAsIsin = normalizeIsin(product)
      if (productAsIsin) {
        isin = productAsIsin
        product = get("type") || "Unknown"
      }
    }
    const rawType = (get("type") || product).toLowerCase()
    const quantity = parseNumber(get("quantity"))
    const price = parseNumber(get("price"))
    const totalEur = parseTotalEur(get)
    const taxEur = parseNumber(get("taxEur"))
    const orderId = get("orderId") || null

    const eventType = classifyEvent(rawType, isin, quantity, price, totalEur)
    if (eventType === "ignored") continue

    const normalizedAmounts = normalizeTradeAmounts(quantity, price, totalEur, eventType)

    const importRef = buildImportRef(orderId, {
      date,
      isin,
      eventType,
      quantity: normalizedAmounts.quantity,
      price: normalizedAmounts.price,
      totalEur: normalizedAmounts.totalEur,
    })

    rows.push({
      rowId: `row-${i}`,
      lineNumber: i + 1,
      date,
      product,
      isin,
      quantity: normalizedAmounts.quantity === null ? null : Math.abs(normalizedAmounts.quantity),
      price: normalizedAmounts.price,
      totalEur: normalizedAmounts.totalEur === null ? null : Math.abs(normalizedAmounts.totalEur),
      taxEur: taxEur === null ? null : Math.abs(taxEur),
      orderId,
      importRef,
      eventType,
      rawType,
    })
  }

  if (rows.length === 0) throw new Error("NO_IMPORTABLE_ROWS")
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ";" : ","
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ")
}

function buildColumnMap(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const map: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {}
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [keyof typeof HEADER_ALIASES, string[]][]) {
    let idx = headers.findIndex((h) => aliases.some((a) => h === a))
    if (idx < 0) {
      idx = headers.findIndex((h) => aliases.some((a) => a.length >= 3 && h.includes(a)))
    }
    if (idx >= 0) map[key] = idx
  }
  return map
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && ch === delimiter) {
      cells.push(current)
      current = ""
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
}

function parseNumber(raw: string): number | null {
  if (!raw?.trim()) return null
  let s = raw.trim().replace(/\s/g, "")
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (s.includes(",")) {
    s = s.replace(",", ".")
  }
  s = s.replace(/[^\d.-]/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseDate(dateRaw: string, timeRaw: string): string | null {
  if (!dateRaw) return null
  const trimmed = dateRaw.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2].padStart(2, "0")}-${deMatch[1].padStart(2, "0")}`
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  if (timeRaw) {
    const combined = new Date(`${trimmed} ${timeRaw}`)
    if (!Number.isNaN(combined.getTime())) return combined.toISOString().slice(0, 10)
  }

  return null
}

function normalizeIsin(raw: string): string | null {
  const s = raw.trim().toUpperCase()
  return /^[A-Z0-9]{12}$/.test(s) ? s : null
}

function findIsinInCells(cells: string[]): string | null {
  for (const cell of cells) {
    const isin = normalizeIsin(cell)
    if (isin) return isin
  }
  return null
}

function parseTotalEur(get: (key: keyof typeof HEADER_ALIASES) => string): number | null {
  const direct = parseNumber(get("totalEur"))
  if (direct !== null && direct !== 0) return direct
  const debit = parseNumber(get("debit"))
  if (debit !== null && debit !== 0) return debit
  const credit = parseNumber(get("credit"))
  if (credit !== null && credit !== 0) return credit
  return direct
}

function classifyEvent(
  rawType: string,
  isin: string | null,
  quantity: number | null,
  price: number | null,
  totalEur: number | null
): TrImportEventType {
  const normalized = rawType.toLowerCase()
  if (IGNORED_TYPES.has(normalized) || [...IGNORED_TYPES].some((t) => normalized.includes(t))) {
    return "ignored"
  }
  if (INTEREST_TYPES.has(normalized) || [...INTEREST_TYPES].some((t) => normalized.includes(t))) {
    return "interest"
  }
  if (DIVIDEND_TYPES.has(normalized) || [...DIVIDEND_TYPES].some((t) => normalized.includes(t))) {
    return "dividend"
  }
  if (SALE_TYPES.has(normalized) || [...SALE_TYPES].some((t) => normalized.includes(t)) || (quantity !== null && quantity < 0)) {
    return "sale"
  }
  if (PURCHASE_TYPES.has(normalized) || [...PURCHASE_TYPES].some((t) => normalized.includes(t))) {
    return "purchase"
  }
  if (isin && totalEur !== null && totalEur > 0 && (quantity === null || quantity === 0) && (price === null || price === 0)) {
    return "dividend"
  }
  if (isin && quantity !== null && quantity !== 0) {
    return quantity < 0 ? "sale" : "purchase"
  }
  if (isin && totalEur !== null && totalEur > 0 && (quantity === null || quantity === 0)) {
    return "dividend"
  }
  if (!isin && totalEur !== null && totalEur > 0) {
    return "interest"
  }
  return "ignored"
}

/** Derive missing quantity/price for trades from total amount (common when CSV has Amount but no Rate). */
export function normalizeTradeAmounts(
  quantity: number | null,
  price: number | null,
  totalEur: number | null,
  eventType: TrImportEventType
): { quantity: number | null; price: number | null; totalEur: number | null } {
  if (eventType !== "purchase" && eventType !== "sale") {
    return { quantity, price, totalEur }
  }

  let qty = quantity
  let prc = price
  const total = totalEur

  if ((prc === null || prc <= 0) && total !== null && total > 0 && qty !== null && qty > 0) {
    prc = total / qty
  } else if ((qty === null || qty <= 0) && total !== null && total > 0 && prc !== null && prc > 0) {
    qty = total / prc
  } else if ((qty === null || qty <= 0) && (prc === null || prc <= 0) && total !== null && total > 0) {
    qty = 1
    prc = total
  }

  return { quantity: qty, price: prc, totalEur: total }
}

export function resolveTradeQuantityPrice(parsed: {
  quantity: number | null
  price: number | null
  totalEur: number | null
  eventType: TrImportEventType
}): { qty: number; price: number } {
  const normalized = normalizeTradeAmounts(parsed.quantity, parsed.price, parsed.totalEur, parsed.eventType)
  return {
    qty: normalized.quantity ?? 0,
    price: normalized.price ?? 0,
  }
}

export function buildImportRef(
  orderId: string | null,
  parts: {
    date: string
    isin: string | null
    eventType: TrImportEventType
    quantity: number | null
    price: number | null
    totalEur: number | null
  }
): string {
  if (orderId?.trim()) return `tr:${orderId.trim()}`
  const payload = [
    parts.date,
    parts.isin ?? "",
    parts.eventType,
    parts.quantity ?? "",
    parts.price ?? "",
    parts.totalEur ?? "",
  ].join("|")
  return `tr:hash:${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`
}

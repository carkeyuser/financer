import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/household-auth"
import { dividendPaymentSchema } from "@/lib/validations/dividend"
import { statusForDate, toDateKey } from "@/lib/utils/dividends"
import type { DividendPaymentInput } from "@/lib/validations/dividend"

function parseDateOnly(value?: string): Date {
  const date = value || new Date().toISOString().split("T")[0]
  return new Date(`${date}T12:00:00.000Z`)
}

function serializePayment(payment: {
  id: string
  assetId: string
  year: number
  exDate: Date
  payDate: Date | null
  amountPerShare: { toString(): string }
  quantity: { toString(): string }
  grossAmount: { toString(): string }
  taxAmount: { toString(): string }
  netAmount: { toString(): string }
  status: string
  note: string | null
}) {
  return {
    id: payment.id,
    assetId: payment.assetId,
    year: payment.year,
    date: toDateKey(payment.payDate ?? payment.exDate),
    amount: payment.netAmount.toString(),
    grossAmount: payment.grossAmount.toString(),
    taxAmount: payment.taxAmount.toString(),
    amountPerShare: payment.amountPerShare.toString(),
    quantity: payment.quantity.toString(),
    status: payment.status,
    note: payment.note,
  }
}

function buildAmounts(data: DividendPaymentInput) {
  const taxAmount = data.taxAmount ?? 0
  const grossAmount = data.grossAmount ?? data.amount + taxAmount
  return {
    netAmount: data.amount,
    grossAmount,
    taxAmount,
    amountPerShare: data.amountPerShare ?? 0,
    quantity: data.quantity ?? 0,
  }
}

export async function POST(request: Request) {
  const ctx = await requireSession()
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json()
  const parsed = dividendPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const asset = await prisma.asset.findFirst({
    where: { id: parsed.data.assetId, householdId: ctx.householdId },
  })
  if (!asset) return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 })

  const date = parseDateOnly(parsed.data.date)
  const year = date.getUTCFullYear()
  const amounts = buildAmounts(parsed.data)

  const payment = await prisma.dividendPayment.create({
    data: {
      householdId: ctx.householdId,
      assetId: asset.id,
      userId: asset.userId,
      year,
      exDate: date,
      payDate: date,
      amountPerShare: amounts.amountPerShare.toString(),
      quantity: amounts.quantity.toString(),
      grossAmount: amounts.grossAmount.toString(),
      taxAmount: amounts.taxAmount.toString(),
      netAmount: amounts.netAmount.toString(),
      currency: "EUR",
      eurRate: "1",
      status: statusForDate(date),
      source: "MANUAL",
      note: parsed.data.note || null,
    },
  })

  return NextResponse.json(serializePayment(payment), { status: 201 })
}

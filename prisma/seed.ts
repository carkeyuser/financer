import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const DEFAULT_FIXED_COSTS = [
  { name: "Miete",         amount: 800.0, order: 1 },
  { name: "Versicherung",  amount: 50.0,  order: 2 },
  { name: "Auto",          amount: 120.0, order: 3 },
  { name: "Strom",         amount: 80.0,  order: 4 },
  { name: "Internet",      amount: 40.0,  order: 5 },
  { name: "Lebensmittel",  amount: 300.0, order: 6 },
  { name: "Puffer",        amount: 100.0, order: 7 },
]

async function main() {
  const username1 = "demo"
  const username2 = "demo2"

  let user1 = await prisma.user.findUnique({ where: { username: username1 } })

  // Fixkosten nachträglich anlegen wenn noch keine existieren
  if (user1) {
    const membership = await prisma.householdMember.findFirst({
      where: { userId: user1.id },
      orderBy: { joinedAt: "asc" },
    })
    if (membership) {
      const existingCosts = await prisma.fixedCost.count({
        where: { householdId: membership.householdId },
      })
      if (existingCosts === 0) {
        await prisma.fixedCost.createMany({
          data: DEFAULT_FIXED_COSTS.map((c) => ({ ...c, householdId: membership.householdId })),
        })
        console.log(`✓ ${DEFAULT_FIXED_COSTS.length} Fixkosten zu bestehendem Haushalt hinzugefügt`)
      } else {
        console.log("Demo-User und Fixkosten existieren bereits — Seed übersprungen.")
      }
      return
    }
  }

  const passwordHash = await bcrypt.hash("demo1234", 12)

  const household = await prisma.household.create({ data: { name: "Demo Haushalt" } })

  user1 = await prisma.user.create({
    data: {
      name: "User1",
      username: username1,
      locale: "de",
      passwordHash,
      role: "ADMIN",
      householdMemberships: {
        create: { householdId: household.id, role: "OWNER" },
      },
    },
  })

  const user2 = await prisma.user.create({
    data: {
      name: "User2",
      username: username2,
      locale: "de",
      passwordHash,
      role: "MEMBER",
      householdMemberships: {
        create: { householdId: household.id, role: "MEMBER" },
      },
    },
  })

  await prisma.fixedCost.createMany({
    data: DEFAULT_FIXED_COSTS.map((c) => ({ ...c, householdId: household.id })),
  })

  // Beispiel-Einnahmen + Auszahlungen für 2024 (aus der Excel-Vorlage)
  const sampleMonths = [
    { month: 1,  income1: 1850, income2: 2035.31, payout: 550 },
    { month: 2,  income1: 1850, income2: 2123.16, payout: 530.20 },
    { month: 3,  income1: 1850, income2: 2104.75, payout: 585 },
    { month: 4,  income1: 1850, income2: 2104.75, payout: 605 },
    { month: 5,  income1: 1850, income2: 3188.84, payout: 950 },
    { month: 6,  income1: 1850, income2: 3188.84, payout: 850 },
    { month: 7,  income1: 1850, income2: 2435.77, payout: 650 },
    { month: 8,  income1: 1850, income2: 2104.75, payout: 580 },
    { month: 9,  income1: 2225.60, income2: 2386.19, payout: 750 },
    { month: 10, income1: 1850, income2: 2104.75, payout: 550 },
    { month: 12, income1: 1850, income2: 2152.06, payout: 600 },
  ]

  for (const m of sampleMonths) {
    await prisma.monthlyIncome.create({
      data: { householdId: household.id, userId: user1.id, year: 2024, month: m.month, amount: m.income1 },
    })
    await prisma.monthlyIncome.create({
      data: { householdId: household.id, userId: user2.id, year: 2024, month: m.month, amount: m.income2 },
    })
    await prisma.monthlyPayout.create({
      data: { householdId: household.id, userId: user1.id, year: 2024, month: m.month, amount: m.payout },
    })
    await prisma.monthlyPayout.create({
      data: { householdId: household.id, userId: user2.id, year: 2024, month: m.month, amount: m.payout },
    })
  }

  console.log(`✓ Demo-User erstellt: username="${username1}" / demo1234 (OWNER)`)
  console.log(`✓ Demo-User2 erstellt: username="${username2}" / demo1234 (MEMBER)`)
  console.log(`✓ Haushalt: ${household.name}`)
  console.log(`✓ ${DEFAULT_FIXED_COSTS.length} Fixkosten angelegt (Gesamt: ${DEFAULT_FIXED_COSTS.reduce((s, c) => s + c.amount, 0).toFixed(2)} €)`)
  console.log(`✓ ${sampleMonths.length} Monate Beispieldaten (2024)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

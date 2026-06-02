import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
dotenv.config({ path: path.resolve(__dirname, "../.env") })

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { fixedCostsForHousehold } from "../src/lib/constants/default-fixed-costs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const username1 = "demo"
  const username2 = "demo2"

  let user1 = await prisma.user.findUnique({ where: { username: username1 } })

  // Backfill fixed costs when none exist yet
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
          data: fixedCostsForHousehold(membership.householdId),
        })
        console.log(`✓ Default fixed costs added to existing household`)
      } else {
        console.log("Demo users and fixed costs already exist — seed skipped.")
      }
      return
    }
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "demo1234"
  if (!process.env.SEED_DEMO_PASSWORD) {
    console.warn(
      "⚠ SEED_DEMO_PASSWORD nicht gesetzt — Demo-Passwort ist \"demo1234\" (nur für lokale Entwicklung)."
    )
  }
  const passwordHash = await bcrypt.hash(demoPassword, 12)

  const household = await prisma.household.create({ data: { name: "Demo Household" } })

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

  const fixedCosts = fixedCostsForHousehold(household.id)
  await prisma.fixedCost.createMany({ data: fixedCosts })

  // Demo income + payouts for 2024 (fictional round amounts)
  const sampleMonths = [
    { month: 1,  income1: 3000, income2: 3200, payout: 500 },
    { month: 2,  income1: 3000, income2: 3200, payout: 500 },
    { month: 3,  income1: 3000, income2: 3300, payout: 550 },
    { month: 4,  income1: 3000, income2: 3300, payout: 550 },
    { month: 5,  income1: 3000, income2: 4000, payout: 800 },
    { month: 6,  income1: 3000, income2: 4000, payout: 750 },
    { month: 7,  income1: 3000, income2: 3500, payout: 600 },
    { month: 8,  income1: 3000, income2: 3300, payout: 550 },
    { month: 9,  income1: 3500, income2: 3600, payout: 700 },
    { month: 10, income1: 3000, income2: 3300, payout: 500 },
    { month: 12, income1: 3000, income2: 3400, payout: 550 },
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

  const totalFixed = fixedCosts.reduce((s, c) => s + c.amount, 0)
  console.log(`✓ Demo user created: username="${username1}" (OWNER)`)
  console.log(`✓ Demo user2 created: username="${username2}" (MEMBER)`)
  if (!process.env.SEED_DEMO_PASSWORD) {
    console.log("  Passwort: demo1234 (setze SEED_DEMO_PASSWORD für ein anderes Demo-Passwort)")
  }
  console.log(`✓ Household: ${household.name}`)
  console.log(`✓ ${fixedCosts.length} fixed costs created (total: ${totalFixed.toFixed(2)} €)`)
  console.log(`✓ ${sampleMonths.length} months of sample data (2024)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

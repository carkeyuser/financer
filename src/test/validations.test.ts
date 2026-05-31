import { describe, it, expect } from "vitest"
import { registerSchema, loginSchema } from "@/lib/validations/auth"
import { assetSchema, assetEntrySchema, assetEditSchema } from "@/lib/validations/asset"
import { backupSchema } from "@/lib/validations/backup"
import {
  createSimulationSchema,
  updateSimulationMonthSchema,
} from "@/lib/validations/household-finance-simulation"
import { buildCreateUserSchema } from "@/lib/validations/household"

describe("registerSchema", () => {
  const validBase = {
    name: "Max Mustermann",
    username: "maxmuster",
    password: "geheim123",
    householdName: "Musterfamilie",
  }

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(validBase).success).toBe(true)
  })

  it("rejects name shorter than 2 chars", () => {
    const result = registerSchema.safeParse({ ...validBase, name: "M" })
    expect(result.success).toBe(false)
  })

  it("rejects username shorter than 3 chars", () => {
    const result = registerSchema.safeParse({ ...validBase, username: "ab" })
    expect(result.success).toBe(false)
  })

  it("rejects username longer than 32 chars", () => {
    const result = registerSchema.safeParse({ ...validBase, username: "a".repeat(33) })
    expect(result.success).toBe(false)
  })

  it("rejects username with invalid characters", () => {
    const result = registerSchema.safeParse({ ...validBase, username: "max@user!" })
    expect(result.success).toBe(false)
  })

  it("accepts username with allowed special chars (. _ -)", () => {
    expect(registerSchema.safeParse({ ...validBase, username: "max.user_1-ok" }).success).toBe(true)
  })

  it("rejects password shorter than 8 chars", () => {
    const result = registerSchema.safeParse({ ...validBase, password: "kurz" })
    expect(result.success).toBe(false)
  })

  it("requires householdName when no inviteToken", () => {
    const { householdName: _, ...noHousehold } = validBase
    const result = registerSchema.safeParse(noHousehold)
    expect(result.success).toBe(false)
  })

  it("allows missing householdName when inviteToken is present", () => {
    const { householdName: _, ...noHousehold } = validBase
    const result = registerSchema.safeParse({ ...noHousehold, inviteToken: "tok123" })
    expect(result.success).toBe(true)
  })
})

describe("buildCreateUserSchema", () => {
  const schema = buildCreateUserSchema("de")
  const validBase = {
    name: "Tenant User",
    username: "tenantuser",
    password: "geheim123",
    tenancy: "household" as const,
  }

  it("accepts household tenancy", () => {
    expect(schema.safeParse(validBase).success).toBe(true)
  })

  it("accepts tenant tenancy without householdName", () => {
    expect(schema.safeParse({ ...validBase, tenancy: "tenant" }).success).toBe(true)
  })

  it("accepts tenant tenancy with householdName", () => {
    expect(
      schema.safeParse({ ...validBase, tenancy: "tenant", householdName: "Firma A" }).success
    ).toBe(true)
  })

  it("rejects tenant tenancy with empty householdName string", () => {
    expect(
      schema.safeParse({ ...validBase, tenancy: "tenant", householdName: "   " }).success
    ).toBe(false)
  })
})

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ username: "user", password: "pass" }).success).toBe(true)
  })

  it("rejects empty username", () => {
    expect(loginSchema.safeParse({ username: "", password: "pass" }).success).toBe(false)
  })

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ username: "user", password: "" }).success).toBe(false)
  })
})

describe("assetSchema", () => {
  const validAsset = {
    ticker: "AAPL",
    name: "Apple Inc.",
    type: "STOCK" as const,
    currency: "USD",
    account: "Trade Republic",
    purchaseDate: "2024-01-01",
    purchasePrice: 180,
    quantity: 10,
  }

  it("accepts valid asset", () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true)
  })

  it("rejects invalid asset type", () => {
    const result = assetSchema.safeParse({ ...validAsset, type: "INVALID" })
    expect(result.success).toBe(false)
  })

  it("rejects negative purchasePrice", () => {
    const result = assetSchema.safeParse({ ...validAsset, purchasePrice: -5 })
    expect(result.success).toBe(false)
  })

  it("rejects zero purchasePrice", () => {
    const result = assetSchema.safeParse({ ...validAsset, purchasePrice: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects negative quantity", () => {
    const result = assetSchema.safeParse({ ...validAsset, quantity: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects zero quantity", () => {
    const result = assetSchema.safeParse({ ...validAsset, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it("accepts all valid asset types", () => {
    const types = ["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"] as const
    for (const type of types) {
      expect(assetSchema.safeParse({ ...validAsset, type }).success).toBe(true)
    }
  })
})

describe("assetEntrySchema", () => {
  const validEntry = {
    assetId: "asset-id-1",
    type: "PURCHASE" as const,
    price: 150,
    quantity: 5,
    date: "2024-06-01",
  }

  it("accepts valid entry", () => {
    expect(assetEntrySchema.safeParse(validEntry).success).toBe(true)
  })

  it("accepts PRICE_UPDATE without quantity", () => {
    const update = { assetId: "a1", type: "PRICE_UPDATE" as const, price: 160, date: "2024-06-01" }
    expect(assetEntrySchema.safeParse(update).success).toBe(true)
  })

  it("rejects negative price", () => {
    expect(assetEntrySchema.safeParse({ ...validEntry, price: -10 }).success).toBe(false)
  })

  it("rejects zero price", () => {
    expect(assetEntrySchema.safeParse({ ...validEntry, price: 0 }).success).toBe(false)
  })

  it("rejects invalid entry type", () => {
    expect(assetEntrySchema.safeParse({ ...validEntry, type: "DIVIDEND" }).success).toBe(false)
  })
})

describe("backupSchema", () => {
  const validBackup = {
    version: 1,
    exportedAt: "2026-05-27T00:00:00.000Z",
    household: { name: "Musterfamilie", currency: "EUR" },
    members: [{ username: "max", name: "Max", role: "OWNER" as const }],
    fixedCosts: [],
    monthlyIncomes: [],
    monthlyPayouts: [],
    fixedCostSnapshots: [],
    assets: [
      {
        username: "max",
        ticker: "AAPL",
        name: "Apple Inc.",
        type: "STOCK" as const,
        currency: "USD",
        isin: null,
        wkn: null,
        notes: null,
        account: "Depot",
        quantity: "12.500000",
        order: 0,
        entries: [
          {
            type: "QUANTITY_UPDATE" as const,
            price: "150.000000",
            quantity: "12.500000",
            date: "2026-05-27T00:00:00.000Z",
            note: null,
          },
          {
            type: "VWAP_UPDATE" as const,
            price: "145.000000",
            quantity: "12.500000",
            date: "2026-05-27T00:00:00.000Z",
            note: null,
          },
        ],
        dividends: [
          {
            username: "max",
            year: 2026,
            exDate: "2026-05-27T00:00:00.000Z",
            payDate: null,
            amountPerShare: "1.230000",
            quantity: "12.500000",
            grossAmount: "15.38",
            taxAmount: "0.00",
            netAmount: "15.38",
            currency: "EUR",
            eurRate: "1.000000",
            status: "RECEIVED" as const,
            source: "MANUAL" as const,
            note: null,
          },
        ],
      },
    ],
    simulations: [
      {
        createdByUsername: "max",
        name: "Basis-Szenario",
        startYear: 2026,
        startMonth: 5,
        endYear: 2026,
        endMonth: 6,
        months: [
          {
            year: 2026,
            month: 5,
            fixedCosts: "1200.00",
            entries: [
              { username: "max", type: "INCOME" as const, amount: "3000.00" },
              { username: "max", type: "PAYOUT" as const, amount: "900.00" },
            ],
          },
        ],
      },
    ],
  }

  it("accepts exported correction entry types, dividends and simulations", () => {
    expect(backupSchema.safeParse(validBackup).success).toBe(true)
  })

  it("accepts older backups without dividends and simulations", () => {
    const olderBackup = JSON.parse(JSON.stringify(validBackup))
    delete olderBackup.simulations
    delete olderBackup.assets[0].dividends

    expect(backupSchema.safeParse(olderBackup).success).toBe(true)
  })

  it("rejects unknown asset entry types", () => {
    const invalidBackup = {
      ...validBackup,
      assets: [
        {
          ...validBackup.assets[0],
          entries: [{ ...validBackup.assets[0].entries[0], type: "DIVIDEND" }],
        },
      ],
    }

    expect(backupSchema.safeParse(invalidBackup).success).toBe(false)
  })

  it("rejects unknown simulation entry types", () => {
    const invalidBackup = {
      ...validBackup,
      simulations: [
        {
          ...validBackup.simulations[0],
          months: [
            {
              ...validBackup.simulations[0].months[0],
              entries: [{ ...validBackup.simulations[0].months[0].entries[0], type: "BONUS" }],
            },
          ],
        },
      ],
    }

    expect(backupSchema.safeParse(invalidBackup).success).toBe(false)
  })
})

describe("assetEditSchema", () => {
  it("accepts valid edit", () => {
    const result = assetEditSchema.safeParse({ name: "Apple Inc.", type: "STOCK", account: "DKB" })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = assetEditSchema.safeParse({ name: "", type: "STOCK", account: "DKB" })
    expect(result.success).toBe(false)
  })

  it("rejects missing account", () => {
    const result = assetEditSchema.safeParse({ name: "Test", type: "STOCK" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid type", () => {
    const result = assetEditSchema.safeParse({ name: "Test", type: "INVALID", account: "DKB" })
    expect(result.success).toBe(false)
  })

  it("accepts optional fields", () => {
    const result = assetEditSchema.safeParse({
      name: "Test",
      type: "ETF",
      account: "Comdirect",
      isin: "DE000A0D9PT0",
      wkn: "A0D9PT",
      notes: "Langfristig halten",
    })
    expect(result.success).toBe(true)
  })
})

describe("createSimulationSchema", () => {
  const validSimulation = {
    name: "Teilzeit",
    startYear: 2026,
    startMonth: 10,
    endYear: 2027,
    endMonth: 3,
  }

  it("accepts a custom range across years", () => {
    expect(createSimulationSchema.safeParse(validSimulation).success).toBe(true)
  })

  it("rejects an end month before the start month", () => {
    expect(createSimulationSchema.safeParse({ ...validSimulation, endYear: 2026, endMonth: 9 }).success).toBe(false)
  })

  it("rejects ranges longer than 36 months", () => {
    expect(createSimulationSchema.safeParse({ ...validSimulation, endYear: 2030, endMonth: 1 }).success).toBe(false)
  })
})

describe("updateSimulationMonthSchema", () => {
  const validMonth = {
    year: 2026,
    month: 10,
    fixedCosts: 2500,
    incomes: [{ userId: "u1", amount: 3000 }],
    payouts: [{ userId: "u1", amount: 1000 }],
  }

  it("accepts valid month values", () => {
    expect(updateSimulationMonthSchema.safeParse(validMonth).success).toBe(true)
  })

  it("rejects negative amounts", () => {
    expect(updateSimulationMonthSchema.safeParse({ ...validMonth, fixedCosts: -1 }).success).toBe(false)
    expect(updateSimulationMonthSchema.safeParse({ ...validMonth, incomes: [{ userId: "u1", amount: -1 }] }).success).toBe(false)
  })

  it("rejects duplicate users per value type", () => {
    expect(
      updateSimulationMonthSchema.safeParse({
        ...validMonth,
        incomes: [
          { userId: "u1", amount: 1000 },
          { userId: "u1", amount: 1200 },
        ],
      }).success
    ).toBe(false)
  })
})

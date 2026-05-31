/** Standard-Fixkosten bei neuem Haushalt (Register + Tenant-Provisioning). */
export const DEFAULT_FIXED_COSTS = [
  { name: "Miete", amount: 900.0, order: 1 },
  { name: "Allianz Invest + Rent", amount: 400.0, order: 2 },
  { name: "Versicherung", amount: 220.0, order: 3 },
  { name: "Auto", amount: 269.6, order: 4 },
  { name: "Gym", amount: 90.0, order: 5 },
  { name: "Strom", amount: 80.0, order: 6 },
  { name: "Verpflegung", amount: 450.0, order: 7 },
  { name: "Tanken", amount: 150.0, order: 8 },
  { name: "Internet", amount: 80.0, order: 9 },
  { name: "Puffer", amount: 100.0, order: 10 },
] as const

export function fixedCostsForHousehold(householdId: string) {
  return DEFAULT_FIXED_COSTS.map((c) => ({ ...c, householdId }))
}

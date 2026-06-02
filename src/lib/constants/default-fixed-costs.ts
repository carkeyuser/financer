/** Standard fixed costs for new households (register + tenant provisioning). */
export const DEFAULT_FIXED_COSTS = [
  { name: "Housing", amount: 900.0, order: 1 },
  { name: "Insurance", amount: 220.0, order: 2 },
  { name: "Transport", amount: 270.0, order: 3 },
  { name: "Subscriptions", amount: 90.0, order: 4 },
  { name: "Utilities", amount: 80.0, order: 5 },
  { name: "Groceries", amount: 450.0, order: 6 },
  { name: "Internet", amount: 80.0, order: 7 },
  { name: "Reserve", amount: 100.0, order: 8 },
] as const

export function fixedCostsForHousehold(householdId: string) {
  return DEFAULT_FIXED_COSTS.map((c) => ({ ...c, householdId }))
}

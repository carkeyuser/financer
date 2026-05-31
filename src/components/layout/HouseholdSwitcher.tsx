"use client"

import { useHousehold, useSwitchHousehold } from "@/hooks/useHousehold"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { useI18n } from "@/i18n/context"

export function HouseholdSwitcher() {
  const { t } = useI18n()
  const { data: session } = useSession()
  const { data, isLoading } = useHousehold()
  const switchMutation = useSwitchHousehold()

  const households = data?.households ?? []
  if (isLoading || households.length <= 1) return null

  const currentId = session?.user?.householdId ?? households[0]?.id

  return (
    <Select
      value={currentId ?? undefined}
      onValueChange={(id) => switchMutation.mutate(id)}
      disabled={switchMutation.isPending}
    >
      <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none px-0 w-full">
        <SelectValue placeholder={t("household.selectHousehold")} />
      </SelectTrigger>
      <SelectContent>
        {households.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {h.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

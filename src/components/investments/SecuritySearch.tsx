"use client"

import { useState } from "react"
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useSecuritySearch, fetchSecurityPrice, type SecurityResult } from "@/hooks/useSecuritySearch"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel } from "@/i18n/messages"

interface SelectedSecurity {
  symbol: string
  name: string
  assetType: "STOCK" | "ETF" | "CRYPTO" | "BOND" | "OTHER"
  currency: string
  currentPrice: number | null
  currentPriceEur: number | null
}

interface SecuritySearchProps {
  onSelect: (security: SelectedSecurity) => void
  selectedSymbol?: string
}

export function SecuritySearch({ onSelect, selectedSymbol }: SecuritySearchProps) {
  const { locale, t, formatMoney, formatNumber } = useI18n()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [confirmed, setConfirmed] = useState<SelectedSecurity | null>(null)

  const { data, isFetching } = useSecuritySearch(inputValue)

  async function handleSelect(result: SecurityResult) {
    setOpen(false)
    setLoadingPrice(true)
    setConfirmed(null)

    try {
      const priceData = await fetchSecurityPrice(result.symbol)
      const security: SelectedSecurity = {
        symbol: result.symbol,
        name: result.name,
        assetType: result.assetType,
        currency: priceData?.currency ?? "EUR",
        currentPrice: priceData?.price ?? null,
        currentPriceEur: priceData?.priceEur ?? null,
      }
      setConfirmed(security)
      onSelect(security)
    } finally {
      setLoadingPrice(false)
    }
  }

  function formatNativePrice(price: number, currency: string) {
    if (currency === "EUR") {
      return formatMoney(price, "EUR")
    }
    return `${formatNumber(price, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="flex items-center gap-2 w-full px-3 py-2 border rounded-md text-sm text-left bg-background hover:bg-accent transition-colors"
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className={selectedSymbol ? "text-foreground" : "text-muted-foreground"}>
            {selectedSymbol ?? t("investments.searchTickerPlaceholder")}
          </span>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />}
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[420px]" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("investments.searchExamplePlaceholder")}
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {inputValue.length >= 2 && !isFetching && (
                <CommandEmpty>{t("investments.noSecurityFound")}</CommandEmpty>
              )}
              {data && data.length > 0 && (
                <CommandGroup>
                  {data.map((result) => (
                    <CommandItem
                      key={result.symbol}
                      value={result.symbol}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.symbol}
                          {result.exchange ? ` · ${result.exchange}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {assetTypeLabel(locale, result.assetType) ?? result.typeDisp}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {loadingPrice && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("investments.fetchingPrice")}
        </div>
      )}

      {confirmed && !loadingPrice && (
        <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
          {confirmed.currentPrice != null ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          )}
          <span>
            <span className="font-medium">{confirmed.name}</span>
            {" · "}
            {confirmed.symbol}
            {confirmed.currentPrice != null ? (
              <span className="text-muted-foreground">
                {" · "}
                {confirmed.currentPriceEur != null && confirmed.currency !== "EUR" ? (
                  <>
                    <span className="text-foreground font-medium">
                      {formatMoney(confirmed.currentPriceEur, "EUR")}
                    </span>
                    {" ("}
                    {formatNativePrice(confirmed.currentPrice, confirmed.currency)}
                    {")"}
                  </>
                ) : (
                  formatNativePrice(confirmed.currentPrice, confirmed.currency)
                )}
              </span>
            ) : (
              <span className="text-muted-foreground"> · {t("investments.priceUnavailable")}</span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

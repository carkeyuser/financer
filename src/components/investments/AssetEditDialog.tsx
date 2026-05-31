"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAssetEditSchema, type AssetEditInput } from "@/lib/validations/asset"
import { useUpdateAsset, type Asset } from "@/hooks/useAssets"
import { useI18n } from "@/i18n/context"
import { assetTypeLabel } from "@/i18n/messages"

const TYPE_VALUES = ["STOCK", "ETF", "CRYPTO", "BOND", "OTHER"] as const
const ACCOUNT_SUGGESTIONS = ["Comdirect", "Trade Republic", "DKB", "Flatex", "N26", "Volksbank", "Consorsbank", "ING"]

interface Props {
  asset: Asset
  open: boolean
  onClose: () => void
}

export function AssetEditDialog({ asset, open, onClose }: Props) {
  const { locale, t, translateApiError } = useI18n()
  const assetEditSchema = useMemo(() => createAssetEditSchema(locale), [locale])
  const updateAsset = useUpdateAsset()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<AssetEditInput>({
      resolver: zodResolver(assetEditSchema),
      defaultValues: {
        name: asset.name,
        type: asset.type,
        account: asset.account,
        isin: asset.isin ?? "",
        wkn: asset.wkn ?? "",
        notes: asset.notes ?? "",
      },
    })

  useEffect(() => {
    if (open) {
      reset({
        name: asset.name,
        type: asset.type,
        account: asset.account,
        isin: asset.isin ?? "",
        wkn: asset.wkn ?? "",
        notes: asset.notes ?? "",
      })
    }
  }, [open, asset, reset])

  async function onSubmit(data: AssetEditInput) {
    try {
      await updateAsset.mutateAsync({ id: asset.id, data })
      toast.success(t("investments.positionUpdated"))
      onClose()
    } catch (err: unknown) {
      toast.error(translateApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("investments.editPosition")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-name">{t("common.name")}</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>{t("common.type")}</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as AssetEditInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {assetTypeLabel(locale, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-account">{t("investments.account")}</Label>
            <Input
              id="edit-account"
              list="edit-account-suggestions"
              {...register("account")}
            />
            <datalist id="edit-account-suggestions">
              {ACCOUNT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
            {errors.account && <p className="text-sm text-destructive">{errors.account.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-isin">ISIN</Label>
              <Input id="edit-isin" placeholder={t("investments.isinPlaceholder")} {...register("isin")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-wkn">WKN</Label>
              <Input id="edit-wkn" placeholder={t("investments.wknPlaceholder")} {...register("wkn")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-notes">{t("investments.noteOptional")}</Label>
            <Input id="edit-notes" placeholder={t("common.optional")} {...register("notes")} />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

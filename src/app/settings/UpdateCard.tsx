"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useHousehold } from "@/hooks/useHousehold"
import { useAppUpdate, type UpdateLogLine } from "@/hooks/useAppUpdate"
import { useI18n } from "@/i18n/context"
import { translateApiError } from "@/i18n/api-errors"
import { APP_VERSION } from "@/lib/constants/app-version"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const COUNTDOWN_SECONDS = 10
const HEALTH_POLL_MS = 2000

type Phase = "idle" | "running" | "restarting" | "error"

export function UpdateCard() {
  const { locale, t } = useI18n()
  const { data: household } = useHousehold()
  const updateMutation = useAppUpdate()
  const logEndRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [logs, setLogs] = useState<UpdateLogLine[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  const canManage =
    household?.myRole === "OWNER" || household?.myRole === "ADMIN"

  const { data: versionInfo } = useQuery({
    queryKey: ["app-version"],
    queryFn: async () => {
      const res = await fetch("/api/version")
      if (!res.ok) throw new Error("version")
      return res.json() as Promise<{
        version: string
        updateEnabled: boolean
        deployMode: "build" | "ghcr" | null
        latestVersion: string | null
        updateAvailable: boolean | null
      }>
    },
    staleTime: 60_000,
  })

  const version = versionInfo?.version ?? APP_VERSION
  const updateEnabled = versionInfo?.updateEnabled ?? false
  const upToDate = updateEnabled && versionInfo?.updateAvailable === false
  const updateReady = updateEnabled && versionInfo?.updateAvailable !== false

  useEffect(() => {
    if (phase === "running" || phase === "restarting") {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, phase])

  const startRestartPhase = useCallback(() => {
    setPhase("restarting")
    setCountdown(COUNTDOWN_SECONDS)
  }, [])

  useEffect(() => {
    if (phase !== "restarting") return

    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)

    return () => clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (phase !== "restarting") return

    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch("/auth/login", { cache: "no-store" })
        if (res.ok && !cancelled) {
          window.location.reload()
        }
      } catch {
        /* server down during restart */
      }
    }

    const interval = setInterval(() => {
      void poll()
    }, HEALTH_POLL_MS)
    void poll()

    const reloadTimer = setTimeout(() => {
      if (!cancelled) window.location.reload()
    }, COUNTDOWN_SECONDS * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(reloadTimer)
    }
  }, [phase])

  async function handleUpdate() {
    setConfirmOpen(false)
    setLogs([])
    setPhase("running")

    const collected: UpdateLogLine[] = []
    try {
      await updateMutation.mutateAsync({
        onLog: (line) => {
          collected.push(line)
          setLogs((prev) => [...prev, line])
        },
      })
      startRestartPhase()
    } catch (err) {
      const sawSuccess = collected.some((l) => /update fertig/i.test(l.message))
      if (sawSuccess) {
        startRestartPhase()
        return
      }
      const message = err instanceof Error ? err.message : t("update.failed")
      setLogs((prev) => [...prev, { level: "error", message }])
      setPhase("error")
      toast.error(translateApiError(message, locale))
    }
  }

  const isBusy = phase === "running" || phase === "restarting" || updateMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("update.title")}</CardTitle>
        <CardDescription>
          {t("update.versionLine", { version })}
          {versionInfo?.deployMode
            ? ` · ${t("update.deployMode", { mode: versionInfo.deployMode })}`
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && !updateEnabled && (
          <p className="text-sm text-muted-foreground rounded-md border px-3 py-2">
            {t("update.disabledHint")}
          </p>
        )}

        {canManage && updateEnabled && upToDate && (
          <p className="text-sm text-muted-foreground rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
            {t("update.upToDate", { version })}
          </p>
        )}

        {canManage && updateEnabled && versionInfo?.updateAvailable === true && versionInfo.latestVersion && (
          <p className="text-sm text-muted-foreground rounded-md border px-3 py-2">
            {t("update.updateAvailable", {
              version,
              latest: versionInfo.latestVersion,
            })}
          </p>
        )}

        {canManage && updateEnabled && versionInfo?.updateAvailable === null && (
          <p className="text-sm text-muted-foreground text-xs">{t("update.checkFailed")}</p>
        )}

        {canManage && updateReady && (
          <>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              {t("update.warning")}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setConfirmOpen(true)}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {phase === "running"
                ? t("update.running")
                : phase === "restarting"
                  ? t("update.restarting", { seconds: countdown })
                  : t("update.button")}
            </Button>
          </>
        )}

        {!canManage && (
          <p className="text-sm text-muted-foreground">{t("update.adminOnly")}</p>
        )}

        {logs.length > 0 && (
          <div
            className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs space-y-0.5"
            role="log"
            aria-live="polite"
          >
            {logs.map((line, i) => (
              <div
                key={`${i}-${line.message.slice(0, 24)}`}
                className={line.level === "error" ? "text-destructive" : "text-foreground"}
              >
                {line.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {phase === "restarting" && (
          <p className="text-sm text-muted-foreground">{t("update.restartHint", { seconds: countdown })}</p>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("update.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("update.confirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleUpdate()}>
                {t("update.button")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

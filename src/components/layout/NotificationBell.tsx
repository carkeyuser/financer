"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  CalendarDays,
  DollarSign,
  PiggyBank,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from "@/hooks/useDailyHabit"
import { useI18n } from "@/i18n/context"
import { asNotificationMessageKey, notificationParams } from "@/lib/utils/notification-i18n"
import { cn } from "@/lib/utils"

function NotificationIcon({ type }: { type: string }) {
  const className = "h-4 w-4 shrink-0"
  switch (type) {
    case "PRICE_MOVE":
      return <TrendingUp className={className} />
    case "CALENDAR":
      return <CalendarDays className={className} />
    case "HOUSEHOLD_MONTH":
    case "HOUSEHOLD_PARTNER_PENDING":
      return <Users className={className} />
    case "QUARTER_BONUS":
      return <PiggyBank className={className} />
    case "DIVIDEND_EXPECTED":
      return <DollarSign className={className} />
    default:
      return <Bell className={className} />
  }
}

function NotificationList({
  items,
  onItemClick,
  onMarkAll,
  markingAll,
}: {
  items: NotificationItem[]
  onItemClick: (item: NotificationItem) => void
  onMarkAll: () => void
  markingAll: boolean
}) {
  const { t, getDateFnsLocale } = useI18n()
  const locale = getDateFnsLocale()

  if (items.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        {t("notifications.empty")}
      </p>
    )
  }

  return (
    <div className="flex flex-col max-h-[min(24rem,70vh)]">
      <ul className="overflow-y-auto flex-1 divide-y">
        {items.map((item) => {
          const params = notificationParams(item.payload)
          const title = t(asNotificationMessageKey(item.titleKey), params)
          const body = t(asNotificationMessageKey(item.bodyKey), params)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className={cn(
                  "w-full text-left px-2 py-2.5 hover:bg-accent transition-colors flex gap-2",
                  !item.read && "bg-muted/40"
                )}
              >
                <NotificationIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale })}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          disabled={markingAll || items.every((i) => i.read)}
          onClick={onMarkAll}
        >
          {t("notifications.markAllRead")}
        </Button>
      </div>
    </div>
  )
}

export function NotificationBell({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const router = useRouter()
  const { t } = useI18n()
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unread = data?.unreadCount ?? 0
  const badgeLabel = unread > 9 ? "9+" : String(unread)

  const handleClick = async (item: NotificationItem) => {
    if (!item.read) await markRead.mutateAsync(item.id)
    const href = typeof item.payload.href === "string" ? item.payload.href : "/dashboard"
    router.push(href)
  }

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative shrink-0"
      aria-label={t("notifications.title")}
    >
      <Bell className="h-5 w-5" />
      {!isLoading && unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {badgeLabel}
        </span>
      )}
    </Button>
  )

  const list = (
    <NotificationList
      items={data?.items ?? []}
      onItemClick={handleClick}
      onMarkAll={() => markAll.mutate()}
      markingAll={markAll.isPending}
    />
  )

  if (variant === "mobile") {
    return (
      <Sheet>
        <SheetTrigger render={trigger} />
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader>
            <SheetTitle>{t("notifications.title")}</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{list}</div>
          <Link href="/heute" className="block text-center text-xs text-muted-foreground mt-4 hover:underline">
            {t("today.title")}
          </Link>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b font-medium text-sm">{t("notifications.title")}</div>
        {list}
      </PopoverContent>
    </Popover>
  )
}

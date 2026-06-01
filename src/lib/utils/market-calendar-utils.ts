import type { CalendarEvent } from "@/lib/services/nasdaq-calendar"

export function filterCalendarEventsWithinDays(
  events: CalendarEvent[],
  daysAhead: number,
  now: Date = new Date()
): CalendarEvent[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + daysAhead)
  end.setHours(23, 59, 59, 999)

  return events
    .filter((e) => {
      const d = new Date(e.date)
      return d >= start && d <= end
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

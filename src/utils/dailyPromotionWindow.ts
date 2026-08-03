import { defaultBusinessCalendar } from '@/utils/datetime'

const PROMOTION_START_HOUR = 5

/** Ventana fija del modal de promoción del día, calculada en hora Colombia. */
export function getTodayDailyPromotionWindow(nowMs = Date.now()) {
  const dayStart = defaultBusinessCalendar.startOfZonedDayAsDate(nowMs)
  const dayEnd = defaultBusinessCalendar.endOfZonedDayAsDate(nowMs)
  const startsAt = new Date(dayStart.getTime() + PROMOTION_START_HOUR * 60 * 60 * 1000)

  return {
    startsAt: startsAt.toISOString(),
    endsAt: dayEnd.toISOString(),
  }
}

import { describe, expect, it } from 'vitest'
import { getTodayDailyPromotionWindow } from '@/utils/dailyPromotionWindow'

describe('getTodayDailyPromotionWindow', () => {
  it('crea la vigencia de 05:00 a 23:59:59.999 para el día actual en Colombia', () => {
    const now = new Date('2026-08-04T02:00:00.000Z').getTime()

    expect(getTodayDailyPromotionWindow(now)).toEqual({
      startsAt: '2026-08-03T10:00:00.000Z',
      endsAt: '2026-08-04T04:59:59.999Z',
    })
  })
})

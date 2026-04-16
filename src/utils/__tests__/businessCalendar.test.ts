import { describe, expect, it } from 'vitest'
import {
	endOfZonedDayAsDate,
	formatYmd,
	startOfZonedDayAsDate,
	zonedDayFromPickerLocalDate,
} from '@/utils/datetime/businessCalendar'
import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'

describe('businessCalendar', () => {
	const tz = DEFAULT_BUSINESS_TIMEZONE

	it('formatYmd usa calendario Bogotá para un instante UTC conocido', () => {
		// 2024-06-15 00:00:00 America/Bogota = 2024-06-15T05:00:00.000Z
		expect(formatYmd(new Date('2024-06-15T05:00:00.000Z'), tz)).toBe('2024-06-15')
		// Aún 14-jun local BOG
		expect(formatYmd(new Date('2024-06-15T04:59:59.000Z'), tz)).toBe('2024-06-14')
	})

	it('startOfZonedDayAsDate ancla a 00:00 en la zona', () => {
		const mid = new Date('2024-06-15T14:30:00.000Z')
		const start = startOfZonedDayAsDate(mid, tz)
		expect(formatYmd(start, tz)).toBe('2024-06-15')
		expect(start.toISOString()).toBe('2024-06-15T05:00:00.000Z')
	})

	it('endOfZonedDayAsDate cierra el día en la zona', () => {
		const mid = new Date('2024-06-15T14:30:00.000Z')
		const end = endOfZonedDayAsDate(mid, tz)
		expect(formatYmd(end, tz)).toBe('2024-06-15')
		expect(end.toISOString()).toBe('2024-06-16T04:59:59.999Z')
	})

	it('zonedDayFromPickerLocalDate interpreta Y/M/D local como pared en zona de negocio', () => {
		const picker = new Date(2024, 5, 15, 0, 0, 0, 0)
		const z = zonedDayFromPickerLocalDate(picker, tz)
		expect(formatYmd(z, tz)).toBe('2024-06-15')
	})
})

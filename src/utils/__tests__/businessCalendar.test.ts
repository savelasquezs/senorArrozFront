import { describe, expect, it } from 'vitest'
import {
	createBusinessCalendar,
	defaultBusinessCalendar,
} from '@/utils/datetime/businessCalendar'
import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'

describe('businessCalendar', () => {
	const tz = DEFAULT_BUSINESS_TIMEZONE
	const cal = createBusinessCalendar(tz)

	it('createBusinessCalendar y defaultBusinessCalendar coinciden en zona', () => {
		expect(cal.timeZone).toBe(tz)
		expect(defaultBusinessCalendar.timeZone).toBe(tz)
	})

	it('formatYmd usa calendario Bogotá para un instante UTC conocido', () => {
		expect(cal.formatYmd(new Date('2024-06-15T05:00:00.000Z'))).toBe('2024-06-15')
		expect(cal.formatYmd(new Date('2024-06-15T04:59:59.000Z'))).toBe('2024-06-14')
	})

	it('startOfZonedDayAsDate ancla a 00:00 en la zona', () => {
		const mid = new Date('2024-06-15T14:30:00.000Z')
		const start = cal.startOfZonedDayAsDate(mid)
		expect(cal.formatYmd(start)).toBe('2024-06-15')
		expect(start.toISOString()).toBe('2024-06-15T05:00:00.000Z')
	})

	it('endOfZonedDayAsDate cierra el día en la zona', () => {
		const mid = new Date('2024-06-15T14:30:00.000Z')
		const end = cal.endOfZonedDayAsDate(mid)
		expect(cal.formatYmd(end)).toBe('2024-06-15')
		expect(end.toISOString()).toBe('2024-06-16T04:59:59.999Z')
	})

	it('zonedDayFromPickerLocalDate interpreta Y/M/D local como pared en zona de negocio', () => {
		const picker = new Date(2024, 5, 15, 0, 0, 0, 0)
		const z = cal.zonedDayFromPickerLocalDate(picker)
		expect(cal.formatYmd(z)).toBe('2024-06-15')
	})

	it('formatDateShort y formatTime usan pared horaria de negocio', () => {
		const iso = '2024-06-15T14:30:00.000Z'
		expect(defaultBusinessCalendar.formatDateShort(iso)).toMatch(/15\/06\/2024/)
		expect(defaultBusinessCalendar.formatTime(iso)).toMatch(/^\d{2}:\d{2}$/)
	})

	it('claves YYYY-MM-DD y YYYY-MM se interpretan como día calendario en la zona (mediodía local)', () => {
		expect(cal.formatDayPaddedShortMonth('2024-06-15')).toMatch(/15 jun/i)
		expect(cal.formatShortMonthYear('2024-06')).toMatch(/jun.*2024/i)
	})

	it('formatWeekdayDayShortMonth incluye día y mes en locale es', () => {
		const s = cal.formatWeekdayDayShortMonth(new Date('2024-06-15T12:00:00.000Z'))
		expect(s).toMatch(/15/)
		expect(s.toLowerCase()).toMatch(/jun/)
	})
})

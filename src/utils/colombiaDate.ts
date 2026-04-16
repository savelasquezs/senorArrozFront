import { defaultBusinessCalendar } from '@/utils/datetime'

/** Fecha calendario YYYY-MM-DD en zona America/Bogotá. */
export function formatYmdBogota(date: Date): string {
	return defaultBusinessCalendar.formatYmd(date)
}

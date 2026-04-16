import { formatYmd } from '@/utils/datetime/businessCalendar'

/** Fecha calendario YYYY-MM-DD en zona America/Bogotá. */
export function formatYmdBogota(date: Date): string {
	return formatYmd(date)
}

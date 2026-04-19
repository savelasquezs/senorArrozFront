import { createBusinessCalendar } from '@/utils/datetime/businessCalendar'
import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'
import type { BusinessCalendar, BusinessTimeZone } from '@/utils/datetime/businessCalendar'

/**
 * Calendario de negocio. Hoy usa zona fija; puede pasarse otra IANA (p. ej. sucursal en Pinia).
 * Devuelve el mismo objeto API que `defaultBusinessCalendar`.
 */
export function useDateTime(timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE): BusinessCalendar {
	return createBusinessCalendar(timeZone)
}

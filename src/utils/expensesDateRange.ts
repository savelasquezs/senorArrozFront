import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'
import { getDateRangeForPreset } from '@/utils/dashboardPeriodPresets'
import { defaultBusinessCalendar } from '@/utils/datetime'

export interface ExpenseApiDateRange {
    fromDate: string
    toDate: string
}

/**
 * Convierte un preset del dashboard (zona America/Bogotá) a par FromDate/ToDate para el API de encabezados.
 */
export function presetToExpenseApiDateRange(
    preset: DashboardPeriodPresetId,
    now: Date = new Date(),
    customRange?: [Date, Date] | null,
): ExpenseApiDateRange {
    const [a, b] = getDateRangeForPreset(preset, now, customRange ?? undefined)
    const cal = defaultBusinessCalendar
    return {
        fromDate: cal.formatYmd(a),
        toDate: cal.formatYmd(b),
    }
}

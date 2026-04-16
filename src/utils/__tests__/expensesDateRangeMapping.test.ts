import { describe, expect, it } from 'vitest'
import { presetToExpenseApiDateRange } from '@/utils/expensesDateRange'

describe('presetToExpenseApiDateRange', () => {
    it('ayer respecto a un instante fijo en Bogotá', () => {
        const ref = new Date('2024-06-15T15:00:00.000Z')
        const { fromDate, toDate } = presetToExpenseApiDateRange('yesterday', ref)
        expect(fromDate).toBe('2024-06-14')
        expect(toDate).toBe('2024-06-14')
    })

    it('este mes calendario en junio 2024', () => {
        const ref = new Date('2024-06-15T15:00:00.000Z')
        const { fromDate, toDate } = presetToExpenseApiDateRange('this_month', ref)
        expect(fromDate).toBe('2024-06-01')
        expect(toDate).toBe('2024-06-30')
    })

    it('custom usa el rango recibido (días normalizados)', () => {
        const ref = new Date('2024-06-15T15:00:00.000Z')
        const custom: [Date, Date] = [new Date('2024-06-10T05:00:00.000Z'), new Date('2024-06-12T05:00:00.000Z')]
        const { fromDate, toDate } = presetToExpenseApiDateRange('custom', ref, custom)
        expect(fromDate).toBe('2024-06-10')
        expect(toDate).toBe('2024-06-12')
    })
})

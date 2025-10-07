import { describe, it, expect } from 'vitest'
import {
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateShort,
    truncateText,
    capitalizeFirst
} from '@/composables/useFormatting'

describe('useFormatting', () => {
    describe('formatCurrency', () => {
        it('formats Colombian peso currency correctly', () => {
            expect(formatCurrency(10000)).toMatch(/^\$\s?10\.000$/)
            expect(formatCurrency(150000)).toMatch(/^\$\s?150\.000$/)
            expect(formatCurrency(0)).toMatch(/^\$\s?0$/)
        })

        it('handles decimal numbers', () => {
            expect(formatCurrency(10000.50)).toMatch(/^\$\s?10\.000,5$/)
            expect(formatCurrency(150000.99)).toMatch(/^\$\s?150\.000,9[0-9]$/)
        })

        it('handles large numbers', () => {
            expect(formatCurrency(1000000)).toMatch(/^\$\s?1\.000\.000$/)
            expect(formatCurrency(15000000)).toMatch(/^\$\s?15\.000\.000$/)
        })
    })

    describe('formatNumber', () => {
        it('formats numbers with thousands separator', () => {
            expect(formatNumber(1000)).toBe('1.000')
            expect(formatNumber(10000)).toBe('10.000')
            expect(formatNumber(100000)).toBe('100.000')
        })

        it('handles zero', () => {
            expect(formatNumber(0)).toBe('0')
        })

        it('handles decimal numbers', () => {
            expect(formatNumber(1234.56)).toBe('1.234,56')
        })
    })

    describe('formatDate', () => {
        it('formats date string correctly', () => {
            const dateStr = '2024-01-15T14:30:00Z'
            const formatted = formatDate(dateStr)
            expect(formatted).toContain('enero')
            expect(formatted).toContain('2024')
            expect(formatted).toContain('15')
        })

        it('formats Date object correctly', () => {
            const date = new Date('2024-01-15T14:30:00Z')
            const formatted = formatDate(date)
            expect(formatted).toContain('enero')
            expect(formatted).toContain('2024')
        })
    })

    describe('formatDateShort', () => {
        it('formats date to short format', () => {
            const dateStr = '2024-01-15T14:30:00Z'
            const formatted = formatDateShort(dateStr)
            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
        })

        it('formats Date object to short format', () => {
            const date = new Date('2024-01-15T14:30:00Z')
            const formatted = formatDateShort(date)
            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
        })
    })

    describe('truncateText', () => {
        it('truncates text to default length', () => {
            const longText = 'This is a very long text that should be truncated because it exceeds the default length'
            const truncated = truncateText(longText)
            expect(truncated).toHaveLength(53) // 50 + '...'
            expect(truncated).toMatch(/\.\.\.$/)
        })

        it('truncates text to custom length', () => {
            const text = 'This is a test'
            const truncated = truncateText(text, 10)
            expect(truncated).toBe('This is a ...')
        })

        it('does not truncate short text', () => {
            const text = 'Short text'
            const truncated = truncateText(text)
            expect(truncated).toBe('Short text')
        })

        it('handles empty string', () => {
            const truncated = truncateText('')
            expect(truncated).toBe('')
        })
    })

    describe('capitalizeFirst', () => {
        it('capitalizes first letter', () => {
            expect(capitalizeFirst('hello')).toBe('Hello')
            expect(capitalizeFirst('world')).toBe('World')
        })

        it('converts rest to lowercase', () => {
            expect(capitalizeFirst('HELLO')).toBe('Hello')
            expect(capitalizeFirst('WoRLd')).toBe('World')
        })

        it('handles empty string', () => {
            expect(capitalizeFirst('')).toBe('')
        })

        it('handles single character', () => {
            expect(capitalizeFirst('a')).toBe('A')
            expect(capitalizeFirst('A')).toBe('A')
        })

        it('handles string with spaces', () => {
            expect(capitalizeFirst('hello world')).toBe('Hello world')
        })
    })
})

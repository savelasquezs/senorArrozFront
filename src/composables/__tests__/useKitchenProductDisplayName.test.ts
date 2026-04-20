import { describe, it, expect } from 'vitest'
import { formatKitchenProductDisplayName } from '@/composables/useKitchenProductDisplayName'

describe('formatKitchenProductDisplayName', () => {
    it('returns empty for null, undefined or blank', () => {
        expect(formatKitchenProductDisplayName(null)).toBe('')
        expect(formatKitchenProductDisplayName(undefined)).toBe('')
        expect(formatKitchenProductDisplayName('')).toBe('')
        expect(formatKitchenProductDisplayName('   ')).toBe('')
    })

    it('leaves unrelated text unchanged', () => {
        expect(formatKitchenProductDisplayName('Bandeja paisa')).toBe('Bandeja paisa')
    })

    it('omits arroz and con (case-insensitive)', () => {
        expect(formatKitchenProductDisplayName('arroz con pollo')).toBe('pollo')
        expect(formatKitchenProductDisplayName('Arroz CON carne')).toBe('carne')
    })

    it('abbreviates chicharron to chich; preserves suffix casing from original word', () => {
        expect(formatKitchenProductDisplayName('chicharron')).toBe('chich')
        expect(formatKitchenProductDisplayName('CHICHARRON')).toBe('chich')
        expect(formatKitchenProductDisplayName('Chicharron grande')).toBe('chich grande')
    })

    it('returns original trim when all tokens would be removed', () => {
        expect(formatKitchenProductDisplayName('arroz con')).toBe('arroz con')
    })
})

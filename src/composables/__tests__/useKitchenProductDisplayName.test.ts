import { describe, it, expect } from 'vitest'
import { formatKitchenProductDisplayName } from '@/composables/useKitchenProductDisplayName'

describe('formatKitchenProductDisplayName', () => {
    it('returns empty for null, undefined or blank', () => {
        expect(formatKitchenProductDisplayName(null)).toBe('')
        expect(formatKitchenProductDisplayName(undefined)).toBe('')
        expect(formatKitchenProductDisplayName('')).toBe('')
        expect(formatKitchenProductDisplayName('   ')).toBe('')
    })

    it('leaves unrelated text unchanged (except minor formatting)', () => {
        expect(formatKitchenProductDisplayName('Bandeja paisa')).toBe('Bandeja paisa')
    })

    it('omits arroz, con, de y unidades (comparando sin tildes)', () => {
        expect(formatKitchenProductDisplayName('arroz con pollo')).toBe('pollo')
        expect(formatKitchenProductDisplayName('Arroz CON carne')).toBe('carne')
        expect(formatKitchenProductDisplayName('Trocitos de chicharrón')).toBe('Trocitos chich')
    })

    it('abbrevia chicharrón y chicharron; compuesto tipo Combo (una sola token)', () => {
        expect(formatKitchenProductDisplayName('chicharron')).toBe('chich')
        expect(formatKitchenProductDisplayName('chicharrón')).toBe('chich')
        expect(formatKitchenProductDisplayName('Chicharron grande')).toBe('chich grande')
        expect(formatKitchenProductDisplayName('Combochicharrón')).toBe('Combochich')
    })

    it('returns original trim when all tokens would be removed', () => {
        expect(formatKitchenProductDisplayName('arroz con')).toBe('arroz con')
    })

    it('ropa vieja + súper: orden size primero, chich, sin "con/de"', () => {
        expect(formatKitchenProductDisplayName('Arroz ropa vieja con chicharrón Súper')).toBe(
            'super ropa chich',
        )
    })

    it('con súper y familiar en el mismo nombre: deja solo super', () => {
        expect(
            formatKitchenProductDisplayName('arroz paisa Súper Familiar'),
        ).toBe('super paisa')
    })

    it('omite "a la francesa" y gr → g; unidades; x5 → x 5', () => {
        expect(formatKitchenProductDisplayName('Papas a la francesa 500 gr')).toBe('Papas 500g')
        expect(formatKitchenProductDisplayName('Yuca x10 unidades')).toBe('Yuca x 10')
    })
})

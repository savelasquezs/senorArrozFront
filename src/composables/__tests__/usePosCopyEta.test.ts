import { describe, it, expect } from 'vitest'
import { formatPosCopyEtaPhrase, parseBranchPosCopyMinutes } from '@/composables/usePosCopyEta'

describe('formatPosCopyEtaPhrase', () => {
    it('30 y 15 → 30-45 min', () => {
        expect(formatPosCopyEtaPhrase(30, 15)).toBe('30-45 min')
    })

    it('margen 0 → solo mínimo', () => {
        expect(formatPosCopyEtaPhrase(25, 0)).toBe('25 min')
    })
})

describe('parseBranchPosCopyMinutes', () => {
    it('valores numéricos válidos', () => {
        const r = parseBranchPosCopyMinutes(20, 10)
        expect(r.min).toBe(20)
        expect(r.range).toBe(10)
    })

    it('ausentes → defaults', () => {
        const r = parseBranchPosCopyMinutes(undefined, null)
        expect(r.min).toBe(30)
        expect(r.range).toBe(15)
    })
})

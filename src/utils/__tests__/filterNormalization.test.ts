import { describe, expect, it } from 'vitest'
import { toNumberFilterList, toStringFilterList } from '@/utils/filterNormalization'

describe('filterNormalization', () => {
    it('convierte un string simple en una lista de un solo filtro', () => {
        expect(toStringFilterList('Apps')).toEqual(['Apps'])
    })

    it('limpia listas de texto sin partir palabras en caracteres', () => {
        expect(toStringFilterList([' Aseo ', '', null, 'Nomina'])).toEqual(['Aseo', 'Nomina'])
    })

    it('normaliza ids numericos desde valores mixtos', () => {
        expect(toNumberFilterList(['1', 2, '', 'x', null])).toEqual([1, 2])
    })
})

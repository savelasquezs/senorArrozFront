import { describe, expect, it } from 'vitest'
import { DEFAULT_GENERAL_SUPPLIER_ID } from '../expenseFormDefaults'

describe('expenseFormDefaults', () => {
    it('proveedor general id 1', () => {
        expect(DEFAULT_GENERAL_SUPPLIER_ID).toBe(1)
    })
})

import { describe, expect, it } from 'vitest'
import { coveredOrderBranchOptions, requiresOrderBranchSelection } from '../orderBranchOptions'
import type { CustomerAddress } from '@/types/customer'

const address = (branchServices: CustomerAddress['branchServices']): CustomerAddress => ({
    id: 10,
    customerId: 20,
    neighborhoodId: 30,
    address: 'Calle 1',
    isPrimary: true,
    createdAt: '',
    updatedAt: '',
    deliveryFee: 0,
    branchServices,
})

describe('order branch options', () => {
    it('selects normally when only the current branch covers the address', () => {
        const options = coveredOrderBranchOptions(address([
            { branchId: 1, branchName: 'Santander', deliveryFee: 7000, isCovered: true },
        ]), 1)

        expect(options.map(option => option.branchId)).toEqual([1])
        expect(requiresOrderBranchSelection(options, 1)).toBe(false)
    })

    it('detects an alternative without sorting by delivery fee', () => {
        const options = coveredOrderBranchOptions(address([
            { branchId: 1, branchName: 'Santander', deliveryFee: 9000, isCovered: true },
            { branchId: 2, branchName: 'Manrique', deliveryFee: 3000, isCovered: true },
        ]), 1)

        expect(options.map(option => option.branchId)).toEqual([1, 2])
        expect(requiresOrderBranchSelection(options, 1)).toBe(true)
    })

    it('returns every covered branch dynamically and excludes uncovered branches', () => {
        const options = coveredOrderBranchOptions(address([
            { branchId: 3, branchName: 'Bello', deliveryFee: 6000, isCovered: true },
            { branchId: 1, branchName: 'Santander', deliveryFee: 8000, isCovered: true },
            { branchId: 4, branchName: 'Robledo', deliveryFee: 1000, isCovered: false },
            { branchId: 2, branchName: 'Manrique', deliveryFee: 5000, isCovered: true },
        ]), 1)

        expect(options.map(option => option.branchId)).toEqual([1, 3, 2])
        expect(options).toHaveLength(3)
    })

    it('offers another covered branch when the current branch has no AddressBranch', () => {
        const options = coveredOrderBranchOptions(address([
            { branchId: 3, branchName: 'Bello', deliveryFee: 6000, isCovered: true },
        ]), 1)

        expect(options.map(option => option.branchId)).toEqual([3])
        expect(requiresOrderBranchSelection(options, 1)).toBe(true)
    })
})

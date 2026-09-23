import type { CustomerAddress } from '@/types/customer'

export interface OrderBranchOption {
    branchId: number
    branchName: string
    deliveryFee: number
    neighborhoodId?: number | null
    neighborhoodName?: string | null
}

export function coveredOrderBranchOptions(
    address: CustomerAddress,
    currentBranchId?: number | null,
): OrderBranchOption[] {
    const unique = new Map<number, OrderBranchOption>()
    for (const service of address.branchServices ?? []) {
        if (!service.isCovered || service.branchId <= 0) continue
        unique.set(service.branchId, {
            branchId: service.branchId,
            branchName: service.branchName?.trim() || `Sucursal ${service.branchId}`,
            deliveryFee: Math.max(0, Number(service.deliveryFee) || 0),
            neighborhoodId: service.neighborhoodId,
            neighborhoodName: service.neighborhoodName,
        })
    }

    return [...unique.values()].sort((left, right) => {
        if (left.branchId === currentBranchId) return -1
        if (right.branchId === currentBranchId) return 1
        return left.branchName.localeCompare(right.branchName, 'es')
    })
}

export function requiresOrderBranchSelection(
    options: OrderBranchOption[],
    currentBranchId?: number | null,
): boolean {
    return options.some(option => option.branchId !== currentBranchId)
}

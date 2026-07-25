let selectedBranchIdForRequest: number | null = null

export function getSelectedBranchIdForRequest(): number | null {
    return selectedBranchIdForRequest
}

export function setSelectedBranchIdForRequest(branchId: number | null): void {
    selectedBranchIdForRequest =
        typeof branchId === 'number' && Number.isInteger(branchId) && branchId > 0
            ? branchId
            : null
}

export function clearSelectedBranchIdForRequest(): void {
    selectedBranchIdForRequest = null
}

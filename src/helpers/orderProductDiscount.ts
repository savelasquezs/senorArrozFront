export function clampDiscountPercentage(value: unknown): number {
    const percentage = Number(value)
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0
}

export function discountAmountFromPercentage(gross: number, percentage: unknown): number {
    return Math.round(Math.max(0, gross) * clampDiscountPercentage(percentage) / 100)
}

export function discountPercentageFromAmount(gross: number, amount: number): number {
    return gross > 0 ? clampDiscountPercentage(amount / gross * 100) : 0
}

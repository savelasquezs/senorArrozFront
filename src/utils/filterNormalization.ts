export function toStringFilterList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item ?? '').trim())
            .filter(Boolean)
    }

    if (value === null || value === undefined) {
        return []
    }

    const normalized = String(value).trim()
    return normalized ? [normalized] : []
}

export function toNumberFilterList(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value
            .filter(item => item !== null && item !== undefined && item !== '')
            .map(item => Number(item))
            .filter(item => Number.isFinite(item))
    }

    if (value === null || value === undefined || value === '') {
        return []
    }

    const normalized = Number(value)
    return Number.isFinite(normalized) ? [normalized] : []
}

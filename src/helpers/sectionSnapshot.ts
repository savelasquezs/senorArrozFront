export function createSectionSnapshot(ttl = 30_000) {
    let key = '', loadedAt = Number.NEGATIVE_INFINITY
    return {
        fresh: (current: string) => key === current && Date.now() - loadedAt < ttl,
        loaded: (current: string) => { key = current; loadedAt = Date.now() },
        invalidate: () => { key = ''; loadedAt = Number.NEGATIVE_INFINITY },
    }
}

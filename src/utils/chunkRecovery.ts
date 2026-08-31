const CHUNK_RELOAD_KEY = 'senor-arroz:chunk-reload-at'
const CHUNK_RELOAD_COOLDOWN_MS = 30_000

const CHUNK_ERROR_PATTERNS = [
    /failed to fetch dynamically imported module/i,
    /importing a module script failed/i,
    /loading chunk [\w-]+ failed/i,
    /unable to preload css/i,
    /error loading dynamically imported module/i,
]

function errorText(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`
    if (typeof error === 'string') return error
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message ?? '')
    }
    return ''
}

export function isStaleChunkError(error: unknown): boolean {
    const text = errorText(error)
    return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(text))
}

export function recoverFromStaleChunk(
    error?: unknown,
    reload: () => void = () => window.location.reload(),
    now = Date.now(),
): boolean {
    if (error !== undefined && !isStaleChunkError(error)) return false

    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
    if (Number.isFinite(lastReloadAt) && now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
        return false
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
    reload()
    return true
}

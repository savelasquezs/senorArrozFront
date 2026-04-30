import { onScopeDispose } from 'vue'

/**
 * Agrupa llamadas a fn con retraso (p. ej. búsqueda al servidor).
 */
export function useDebouncedCallback(fn: () => void, ms: number) {
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
        if (timer != null) clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            fn()
        }, ms)
    }

    const cancel = () => {
        if (timer != null) {
            clearTimeout(timer)
            timer = null
        }
    }

    onScopeDispose(() => cancel())

    return { schedule, cancel }
}

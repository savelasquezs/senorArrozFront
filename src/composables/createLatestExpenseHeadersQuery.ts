import type { ExpenseHeaderFilters, ExpenseHeaderListResult } from '@/types/expense'

type Hooks = {
    onStart: () => void
    onSuccess: (result: ExpenseHeaderListResult) => void
    onError: (error: unknown) => void
    onFinish: () => void
}

/**
 * Keeps only the latest expenses page visible. Coalesces identical concurrent
 * reads and aborts outdated HTTP; fingerprint includes authenticated branch
 * context even though the server gets that scope in request headers.
 */
export function createLatestExpenseHeadersQuery(
    load: (filters: ExpenseHeaderFilters, signal: AbortSignal) => Promise<ExpenseHeaderListResult>,
    currentFilters: () => ExpenseHeaderFilters,
    contextKey: () => string,
    hooks: Hooks,
) {
    type InFlight = { key: string; controller: AbortController; promise: Promise<void> }
    let inFlight: InFlight | null = null
    let version = 0
    let disposed = false
    const fingerprint = (filters: ExpenseHeaderFilters) => JSON.stringify([filters, contextKey()])

    function run(force = false): Promise<void> {
        if (disposed) return Promise.resolve()
        const filters = currentFilters()
        const key = fingerprint(filters)
        if (!force && inFlight?.key === key && !inFlight.controller.signal.aborted) {
            return inFlight.promise
        }
        inFlight?.controller.abort()
        const controller = new AbortController()
        const generation = ++version
        const isCurrent = () => !disposed && !controller.signal.aborted &&
            generation === version && key === fingerprint(currentFilters())
        hooks.onStart()
        const promise = Promise.resolve()
            .then(() => isCurrent() ? load(filters, controller.signal) : undefined)
            .then(result => { if (result !== undefined && isCurrent()) hooks.onSuccess(result) })
            .catch(err => { if (isCurrent()) hooks.onError(err) })
            .finally(() => {
                if (inFlight?.controller === controller) {
                    inFlight = null
                    if (!disposed) hooks.onFinish()
                }
            })
        inFlight = { key, controller, promise }
        return promise
    }

    function cancel() {
        ++version
        inFlight?.controller.abort()
        inFlight = null
        if (!disposed) hooks.onFinish()
    }

    function dispose() {
        disposed = true
        ++version
        inFlight?.controller.abort()
        inFlight = null
    }

    return { run, cancel, dispose }
}

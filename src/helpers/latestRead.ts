export function createLatestRead() {
    let version = 0
    let active: { key: string; controller: AbortController; promise: Promise<void> } | undefined
    function invalidate() {
        version++
        active?.controller.abort()
        active = undefined
    }
    let currentController: AbortController | undefined
    function begin() {
        invalidate()
        currentController?.abort()
        const controller = new AbortController()
        currentController = controller
        const revision = version
        return { signal: controller.signal, isCurrent: () => revision === version && !controller.signal.aborted }
    }
    function load<T>(key: string, read: (signal: AbortSignal) => Promise<T>, assign: (value: T) => void) {
        if (active?.key === key) return active.promise
        invalidate()
        const revision = version
        const controller = new AbortController()
        const promise = (async () => {
            try {
                const value = await read(controller.signal)
                if (revision === version) assign(value)
            } catch (error) {
                if (revision === version && !controller.signal.aborted) throw error
            } finally {
                if (revision === version) active = undefined
            }
        })()
        active = { key, controller, promise }
        return promise
    }
    return { load, begin, invalidate: () => { invalidate(); currentController?.abort() } }
}

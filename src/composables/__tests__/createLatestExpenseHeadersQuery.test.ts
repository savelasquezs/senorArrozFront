import { describe, expect, it, vi } from 'vitest'
import { createLatestExpenseHeadersQuery } from '../createLatestExpenseHeadersQuery'
import type { ExpenseHeaderFilters, ExpenseHeaderListResult } from '@/types/expense'

function deferred<T>() {
    let resolve!: (data: T) => void
    let reject!: (err: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
const page = (id: number): ExpenseHeaderListResult => ({
    items: [{ id }], totalCount: 1, page: 1, pageSize: 10, totalPages: 1,
} as unknown as ExpenseHeaderListResult)

function setup(load: (filters: ExpenseHeaderFilters, signal: AbortSignal) => Promise<ExpenseHeaderListResult>) {
    let params: ExpenseHeaderFilters = { page: 1, pageSize: 10 }
    let scope = 'user7:branch1'
    const hooks = { onStart: vi.fn(), onSuccess: vi.fn(), onError: vi.fn(), onFinish: vi.fn() }
    const query = createLatestExpenseHeadersQuery(load, () => params, () => scope, hooks)
    return {
        query, hooks,
        change: (updates: ExpenseHeaderFilters) => { params = { ...params, ...updates } },
        scope: (value: string) => { scope = value },
    }
}

describe('M26-F01 latest expense page coordinator', () => {
    it('coalesces simultaneous identical filter requests into one HTTP call', async () => {
        const pending = deferred<ExpenseHeaderListResult>()
        const load = vi.fn(() => pending.promise)
        const { query, hooks } = setup(load)
        const first = query.run(), second = query.run()
        expect(first).toBe(second)
        await Promise.resolve()
        expect(load).toHaveBeenCalledTimes(1)
        expect(hooks.onStart).toHaveBeenCalledTimes(1)
        pending.resolve(page(1))
        await first
        expect(hooks.onSuccess).toHaveBeenCalledTimes(1)
        expect(hooks.onFinish).toHaveBeenCalledTimes(1)
    })

    it('aborts old HTTP and ignores responses arriving out of order', async () => {
        const old = deferred<ExpenseHeaderListResult>(), recent = deferred<ExpenseHeaderListResult>()
        const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise)
        const { query, change, hooks } = setup(load)
        const p1 = query.run()
        await Promise.resolve()
        const signal = load.mock.calls[0]![1] as AbortSignal
        change({ expenseName: 'arroz' })
        const p2 = query.run()
        await Promise.resolve()
        expect(signal.aborted).toBe(true)
        recent.resolve(page(2))
        await p2
        old.resolve(page(1))
        await p1
        expect(hooks.onSuccess).toHaveBeenCalledTimes(1)
        expect(hooks.onSuccess).toHaveBeenCalledWith(page(2))
        expect(hooks.onFinish).toHaveBeenCalledTimes(1)
    })

    it('drops obsolete errors if the input has changed but debounce has not fired yet', async () => {
        const pending = deferred<ExpenseHeaderListResult>()
        const { query, hooks, change } = setup(vi.fn(() => pending.promise))
        const running = query.run()
        await Promise.resolve()
        change({ expenseName: 'nuevo filtro' })
        pending.reject(new Error('error de filtro anterior'))
        await running
        expect(hooks.onError).not.toHaveBeenCalled()
        expect(hooks.onSuccess).not.toHaveBeenCalled()
        expect(hooks.onFinish).toHaveBeenCalledOnce()
    })

    it('refresh explicitly bypasses in-flight coalescing and aborts the first request', async () => {
        const old = deferred<ExpenseHeaderListResult>(), recent = deferred<ExpenseHeaderListResult>()
        const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise)
        const { query, hooks } = setup(load)
        const initial = query.run()
        await Promise.resolve()
        const oldSignal = load.mock.calls[0]![1] as AbortSignal
        const refreshed = query.run(true)
        await Promise.resolve()
        expect(oldSignal.aborted).toBe(true)
        expect(load).toHaveBeenCalledTimes(2)
        old.resolve(page(1))
        recent.resolve(page(2))
        await Promise.all([initial, refreshed])
        expect(hooks.onSuccess).toHaveBeenCalledExactlyOnceWith(page(2))
    })

    it('changing the authorized branch invalidates responses without relying on Axios interceptors', async () => {
        const pending = deferred<ExpenseHeaderListResult>()
        const { query, scope, hooks } = setup(vi.fn(() => pending.promise))
        const running = query.run()
        await Promise.resolve()
        scope('user7:branch2')
        pending.resolve(page(1))
        await running
        expect(hooks.onSuccess).not.toHaveBeenCalled()
        expect(hooks.onFinish).toHaveBeenCalledOnce()
    })

    it('retains successful retry after a real failure and permits a different page', async () => {
        const load = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page(2))
        const { query, change, hooks } = setup(load)
        await query.run()
        expect(hooks.onError).toHaveBeenCalledOnce()
        change({ page: 2 })
        await query.run()
        expect(hooks.onSuccess).toHaveBeenCalledWith(page(2))
        expect(hooks.onFinish).toHaveBeenCalledTimes(2)
    })

    it('local create/delete invalidates pending reads so old data cannot overwrite local changes', async () => {
        const pending = deferred<ExpenseHeaderListResult>()
        const load = vi.fn(() => pending.promise)
        const { query, hooks } = setup(load)
        const running = query.run()
        await Promise.resolve()
        const signal = load.mock.calls[0]![1] as AbortSignal
        query.cancel()
        expect(signal.aborted).toBe(true)
        pending.resolve(page(1))
        await running
        expect(hooks.onSuccess).not.toHaveBeenCalled()
        expect(hooks.onError).not.toHaveBeenCalled()
        expect(hooks.onFinish).toHaveBeenCalledOnce()
        const another = deferred<ExpenseHeaderListResult>()
        load.mockReturnValueOnce(another.promise)
        const next = query.run()
        await Promise.resolve()
        another.resolve(page(2))
        await next
        expect(hooks.onSuccess).toHaveBeenCalledWith(page(2))
    })

    it('unmount aborts transport and suppresses late UI mutations and error toasts', async () => {
        const pending = deferred<ExpenseHeaderListResult>()
        const load = vi.fn(() => pending.promise)
        const { query, hooks } = setup(load)
        const running = query.run()
        await Promise.resolve()
        const signal = load.mock.calls[0]![1] as AbortSignal
        query.dispose()
        expect(signal.aborted).toBe(true)
        pending.reject(new Error('after unmount'))
        await running
        expect(hooks.onSuccess).not.toHaveBeenCalled()
        expect(hooks.onError).not.toHaveBeenCalled()
        expect(hooks.onFinish).not.toHaveBeenCalled()
        await query.run()
        expect(load).toHaveBeenCalledTimes(1)
    })
})

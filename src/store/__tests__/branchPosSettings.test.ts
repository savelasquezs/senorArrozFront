import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth'
import { useBranchPosSettingsStore } from '../branchPosSettings'

const { branchApiMock } = vi.hoisted(() => ({ branchApiMock: { getBranchById: vi.fn() } }))
vi.mock('@/services/MainAPI/branchApi', () => ({ branchApi: branchApiMock }))
vi.mock('@/store/auth', async () => {
    const { defineStore } = await import('pinia')
    const { ref } = await import('vue')
    return { useAuthStore: defineStore('test-auth', () => ({ user: ref(null) })) }
})

const response = (cap = 4200) => ({
    data: { maxFreeDeliveryDiscount: cap, posCopyEtaMinMinutes: 40, posCopyEtaRangeMinutes: 10 },
})
function deferred() {
    let resolve!: (value: ReturnType<typeof response>) => void
    let reject!: (reason: Error) => void
    const promise = new Promise<ReturnType<typeof response>>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}
const orderMode = { forOrderCreation: true }

describe('M09-F01 POS settings', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        branchApiMock.getBranchById.mockReset()
        useAuthStore().user = {
            id: 7, name: 'Test', email: 'test@example.invalid', phone: '', active: true,
            role: 'Cashier', branchId: 1, branchName: 'Test',
        }
    })
    afterEach(() => { disposePinia(getActivePinia()!) })

    it('shares one request and waits for its result before returning to every caller', async () => {
        const next = deferred()
        branchApiMock.getBranchById.mockReturnValue(next.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1, orderMode)
        let finished = false
        const second = store.ensureForBranch(1, orderMode).then(() => { finished = true })
        await Promise.resolve()
        expect(finished).toBe(false)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(1)
        next.resolve(response())
        await Promise.all([first, second])
        expect(store.maxFreeDeliveryDiscount).toBe(4200)
        expect(store.posCopyMessageEtaPhrase).toBe('40-50 min')
        expect(store.isLoading).toBe(false)
        await store.ensureForBranch(1, orderMode)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(1)
    })

    it('does not share in-flight requests across authorization modes', async () => {
        const old = deferred(), current = deferred()
        branchApiMock.getBranchById.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1)
        const second = store.ensureForBranch(1, orderMode)
        expect(branchApiMock.getBranchById).toHaveBeenNthCalledWith(1, 1, false)
        expect(branchApiMock.getBranchById).toHaveBeenNthCalledWith(2, 1, true)
        current.resolve(response(5000))
        await second
        old.resolve(response(9000))
        await first
        expect(store.maxFreeDeliveryDiscount).toBe(5000)
    })

    it('does not reuse a completed order-context response for administrative access', async () => {
        branchApiMock.getBranchById.mockResolvedValue(response())
        const store = useBranchPosSettingsStore()
        await store.ensureForBranch(1, orderMode)
        await store.ensureForBranch(1)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(2)
        expect(branchApiMock.getBranchById).toHaveBeenLastCalledWith(1, false)
    })

    it('ignores old responses without clearing the current loading state', async () => {
        const old = deferred(), current = deferred()
        branchApiMock.getBranchById.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1, orderMode)
        const second = store.ensureForBranch(2, orderMode)
        old.resolve(response(9000))
        await first
        expect(store.isLoading).toBe(true)
        expect(store.loadedBranchId).toBeNull()
        current.resolve(response(5000))
        await second
        expect(store.loadedBranchId).toBe(2)
        expect(store.maxFreeDeliveryDiscount).toBe(5000)
    })

    it('keeps the latest selection on a rapid A to B to A change', async () => {
        const a = deferred(), b = deferred(), latestA = deferred()
        branchApiMock.getBranchById.mockReturnValueOnce(a.promise)
            .mockReturnValueOnce(b.promise).mockReturnValueOnce(latestA.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1), second = store.ensureForBranch(2), last = store.ensureForBranch(1)
        latestA.resolve(response(1000)); await last
        a.resolve(response(2000)); b.resolve(response(3000))
        await Promise.all([first, second])
        expect(store.loadedBranchId).toBe(1)
        expect(store.maxFreeDeliveryDiscount).toBe(1000)
    })

    it('clear invalidates the old request without deleting a replacement request', async () => {
        const old = deferred(), current = deferred()
        branchApiMock.getBranchById.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1)
        store.clear()
        expect(store.isLoading).toBe(false)
        const second = store.ensureForBranch(1)
        old.reject(new Error('old request')); await first
        const third = store.ensureForBranch(1)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(2)
        expect(store.isLoading).toBe(true)
        current.resolve(response()); await Promise.all([second, third])
        expect(store.maxFreeDeliveryDiscount).toBe(4200)
    })

    it.each([null, undefined, 0, -1, NaN, 1.5])('clears pending state for invalid branch %s', async id => {
        const old = deferred()
        branchApiMock.getBranchById.mockReturnValue(old.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1)
        await store.ensureForBranch(id)
        expect(store.isLoading).toBe(false)
        old.resolve(response()); await first
        expect(store.loadedBranchId).toBeNull()
        expect(store.maxFreeDeliveryDiscount).toBe(3000)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(1)
    })

    it('force supersedes an in-flight request', async () => {
        const old = deferred(), current = deferred()
        branchApiMock.getBranchById.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const store = useBranchPosSettingsStore()
        const first = store.ensureForBranch(1)
        const second = store.ensureForBranch(1, { force: true })
        current.resolve(response(2000)); await second
        old.resolve(response(9000)); await first
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(2)
        expect(store.maxFreeDeliveryDiscount).toBe(2000)
    })

    it('leaves failures retryable instead of caching the fallback as loaded', async () => {
        branchApiMock.getBranchById.mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce(response())
        const store = useBranchPosSettingsStore()
        await store.ensureForBranch(1)
        expect(store.loadedBranchId).toBeNull()
        expect(store.posCopyMessageEtaPhrase).toBe('30-45 min')
        await store.ensureForBranch(1)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(2)
        expect(store.maxFreeDeliveryDiscount).toBe(4200)
    })

    it('logout immediately invalidates an in-flight response', async () => {
        const next = deferred()
        branchApiMock.getBranchById.mockReturnValue(next.promise)
        const store = useBranchPosSettingsStore()
        const loading = store.ensureForBranch(1)
        useAuthStore().user = null
        expect(store.isLoading).toBe(false)
        next.resolve(response()); await loading
        expect(store.loadedBranchId).toBeNull()
        expect(store.maxFreeDeliveryDiscount).toBe(3000)
    })

    it.each([{ id: 8 }, { role: 'Admin' as const }, { branchId: 2 }])(
        'invalidates the cache when the session identity changes: %o', async change => {
            branchApiMock.getBranchById.mockResolvedValue(response())
            const store = useBranchPosSettingsStore()
            await store.ensureForBranch(1)
            useAuthStore().user = { ...useAuthStore().user!, ...change }
            expect(store.loadedBranchId).toBeNull()
            await store.ensureForBranch(1)
            expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(2)
        },
    )

    it('preserves the cache when only profile data changes', async () => {
        branchApiMock.getBranchById.mockResolvedValue(response())
        const store = useBranchPosSettingsStore()
        await store.ensureForBranch(1)
        useAuthStore().user = { ...useAuthStore().user!, name: 'Updated test' }
        await store.ensureForBranch(1)
        expect(branchApiMock.getBranchById).toHaveBeenCalledTimes(1)
    })

    it('does not display the previous branch settings while a new branch loads', async () => {
        const next = deferred()
        branchApiMock.getBranchById.mockResolvedValueOnce(response(8000)).mockReturnValueOnce(next.promise)
        const store = useBranchPosSettingsStore()
        await store.ensureForBranch(1)
        const loading = store.ensureForBranch(2)
        expect(store.loadedBranchId).toBeNull()
        expect(store.maxFreeDeliveryDiscount).toBe(3000)
        next.resolve(response(2000)); await loading
        expect(store.maxFreeDeliveryDiscount).toBe(2000)
    })
})

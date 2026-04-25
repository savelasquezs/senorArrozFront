import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppsStore } from '../apps'
import type { App } from '@/types/bank'
import type { PagedResult } from '@/types/common'

const { appApiMock } = vi.hoisted(() => ({
    appApiMock: {
        getApps: vi.fn(),
        getAppById: vi.fn(),
        getAppsByBank: vi.fn(),
        createApp: vi.fn(),
        updateApp: vi.fn(),
        deleteApp: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/appApi', () => ({
    appApi: appApiMock,
}))

const makeApp = (overrides: Partial<App> = {}): App => ({
    id: 1,
    bankId: 1,
    bankName: 'Bancolombia',
    branchId: 1,
    branchName: 'Centro',
    name: 'Nequi',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

describe('apps store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores the apps list', async () => {
        const store = useAppsStore()
        const payload: PagedResult<App> = {
            items: [makeApp()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        appApiMock.getApps.mockResolvedValue(payload)

        await store.fetch({ page: 1, pageSize: 10 })

        expect(store.list).toEqual(payload)
    })

    it('fetches apps by bank into the side list', async () => {
        const store = useAppsStore()
        const apps = [makeApp()]

        appApiMock.getAppsByBank.mockResolvedValue(apps)

        await store.fetchByBank(1)

        expect(store.byBank).toEqual(apps)
    })

    it('creates an app and prepends it to list and byBank when matching', async () => {
        const store = useAppsStore()
        store.list = {
            items: [makeApp()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.byBank = [makeApp()]

        const created = makeApp({ id: 2, name: 'Daviplata' })
        appApiMock.createApp.mockResolvedValue(created)

        const result = await store.create({ name: 'Daviplata', bankId: 1 } as never)

        expect(result).toEqual(created)
        expect(store.list.items[0]).toEqual(created)
        expect(store.byBank?.[0]).toEqual(created)
        expect(store.current).toEqual(created)
    })

    it('updates the app in list, byBank and current', async () => {
        const store = useAppsStore()
        const existing = makeApp()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.byBank = [existing]
        store.current = existing

        const updated = makeApp({ name: 'Ahorro a la Mano' })
        appApiMock.updateApp.mockResolvedValue(updated)

        await store.update(existing.id, { name: 'Ahorro a la Mano' } as never)

        expect(store.list.items[0]).toEqual(updated)
        expect(store.byBank?.[0]).toEqual(updated)
        expect(store.current).toEqual(updated)
    })

    it('removes the app from list and byBank and clears current', async () => {
        const store = useAppsStore()
        const existing = makeApp()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.byBank = [existing]
        store.current = existing

        appApiMock.deleteApp.mockResolvedValue('ok')

        await store.remove(existing.id)

        expect(store.list.items).toEqual([])
        expect(store.byBank).toEqual([])
        expect(store.current).toBeNull()
    })
})

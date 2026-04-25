import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBanksStore } from '../banks'
import type { Bank, BankDetail } from '@/types/bank'
import type { PagedResult } from '@/types/common'

const { bankApiMock } = vi.hoisted(() => ({
    bankApiMock: {
        getBanks: vi.fn(),
        getBankById: vi.fn(),
        getBankDetail: vi.fn(),
        createBank: vi.fn(),
        updateBank: vi.fn(),
        deleteBank: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/bankApi', () => ({
    bankApi: bankApiMock,
}))

const makeBank = (overrides: Partial<Bank> = {}): Bank => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    name: 'Bancolombia',
    accountNumber: '123456789',
    accountType: 'savings',
    balance: 100000,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

describe('banks store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores the bank list', async () => {
        const store = useBanksStore()
        const payload: PagedResult<Bank> = {
            items: [makeBank()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        bankApiMock.getBanks.mockResolvedValue(payload)

        await store.fetch({ page: 1, pageSize: 10 })

        expect(store.list).toEqual(payload)
    })

    it('creates a bank and prepends it to the list', async () => {
        const store = useBanksStore()
        store.list = {
            items: [makeBank()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const created = makeBank({ id: 2, name: 'Davivienda' })
        bankApiMock.createBank.mockResolvedValue(created)

        const result = await store.create({ name: 'Davivienda' } as never)

        expect(result).toEqual(created)
        expect(store.list.items[0]).toEqual(created)
        expect(store.current).toEqual(created)
    })

    it('updates the bank in list, current and currentDetail', async () => {
        const store = useBanksStore()
        const existing = makeBank()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing
        store.currentDetail = {
            ...existing,
            monthlyIncome: 1000,
            monthlyExpenses: 500,
            transactionCount: 3,
        } as BankDetail

        const updated = makeBank({ name: 'Banco Caja Social' })
        bankApiMock.updateBank.mockResolvedValue(updated)

        await store.update(existing.id, { name: 'Banco Caja Social' } as never)

        expect(store.list.items[0]).toEqual(updated)
        expect(store.current).toEqual(updated)
        expect(store.currentDetail?.name).toBe('Banco Caja Social')
    })

    it('removes the bank from list and clears selected state', async () => {
        const store = useBanksStore()
        const existing = makeBank()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing
        store.currentDetail = { ...existing } as BankDetail

        bankApiMock.deleteBank.mockResolvedValue('ok')

        await store.remove(existing.id)

        expect(store.list.items).toEqual([])
        expect(store.current).toBeNull()
        expect(store.currentDetail).toBeNull()
    })
})

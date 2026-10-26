import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { useInventoryStore } from '../inventory'

const api = vi.hoisted(() => ({ getBalances: vi.fn() }))
vi.mock('@/services/MainAPI/inventoryApi', () => ({ inventoryApi: api }))
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

it('coalesces inventory invalidations and publishes only the trailing snapshot', async () => {
  let resolve!: (rows: any[]) => void
  api.getBalances.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    .mockResolvedValueOnce([{ expenseId: 2, inventoryValue: 10 }])
  const store = useInventoryStore()
  const first = store.loadBalances()
  await Promise.resolve()
  const others = Array.from({ length: 10 }, () => store.loadBalances())
  resolve([{ expenseId: 1 }])
  await Promise.all([first, ...others])
  expect(api.getBalances).toHaveBeenCalledTimes(2)
  expect(store.balances.map(row => row.expenseId)).toEqual([2])
  expect(store.loading).toBe(false)
})

it('aborts and ignores a previous branch snapshot after reset', async () => {
  let resolve!: (rows: any[]) => void
  api.getBalances.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const store = useInventoryStore()
  const request = store.loadBalances()
  await Promise.resolve()
  const signal = api.getBalances.mock.calls[0]![0] as AbortSignal
  store.clear()
  expect(signal.aborted).toBe(true)
  resolve([{ expenseId: 1 }])
  await request
  expect(store.balances).toEqual([])
  expect(store.loading).toBe(false)
})

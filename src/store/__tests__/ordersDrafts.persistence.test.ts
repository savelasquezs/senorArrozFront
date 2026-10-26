import { appendFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { expect, it } from 'vitest'
import { useAuthStore } from '../auth'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

it.each([1, 5, 20])('persists %i drafts synchronously without losing recovery data', count => {
    setActivePinia(createPinia())
    localStorage.clear()
    useAuthStore().user = { id: 1, branchId: 1, role: 'Admin' } as never
    const drafts = useOrdersDraftsStore()
    drafts.maxTabs = 20
    const tabs = useOrderTabs()
    for (let index = 0; index < count; index++) {
        tabs.createNewTab()
        const draft = drafts.currentOrder!
        draft.orderItems = Array.from({ length: 20 }, (_, item) => ({ productId: item + 1, quantity: 2, unitPrice: 15000, subtotal: 30000, discount: 0, notes: 'Synthetic' })) as any
    }
    const times = []
    for (let index = 0; index < 20; index++) {
        const start = performance.now()
        drafts.saveToLocalStorage()
        times.push(performance.now() - start)
    }
    const stored = localStorage.getItem('senor-arroz-draft-orders')!
    expect(JSON.parse(stored).draftOrders).toHaveLength(count)
    const currentId = drafts.currentTabId
    drafts.draftOrders.clear()
    drafts.loadFromLocalStorage()
    expect(drafts.draftOrders.size).toBe(count)
    expect(drafts.currentTabId).toBe(currentId)
    expect(drafts.currentOrder?.orderItems).toHaveLength(20)
    const result = JSON.stringify({ count, itemsPerDraft: 20, bytes: new TextEncoder().encode(stored).length, repetitions: 20, medianMs: times.sort((a, b) => a - b)[10] })
    if (process.env.FRONT_PERF_DRAFT_LOG) appendFileSync(process.env.FRONT_PERF_DRAFT_LOG, result + '\n')
})

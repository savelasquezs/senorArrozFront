import { getCurrentInstance, inject, provide, type InjectionKey } from 'vue'
import { defineOrderDraftStore, useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { Order } from '@/types/order'

interface OrderEditorContext {
  store: ReturnType<typeof useOrdersDraftsStore>
  onCreated: (order: Order) => void
  canSubmit: () => boolean
}

const editorKey: InjectionKey<OrderEditorContext> = Symbol('order-editor')

export function useOrderEditorContext() {
  return getCurrentInstance() ? inject(editorKey, null) : null
}

export function useOrderEditorStore() {
  return useOrderEditorContext()?.store ?? useOrdersDraftsStore()
}

export function provideOrderEditor(id: string, onCreated: OrderEditorContext['onCreated'], canSubmit = () => true) {
  const store = defineOrderDraftStore(`order-editor:${id}`)()
  store.maxTabs = 1
  provide(editorKey, { store, onCreated, canSubmit })
  return store
}

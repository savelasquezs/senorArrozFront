import { getCurrentInstance, inject, provide, type InjectionKey } from 'vue'
import { defineOrderDraftStore, useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { DraftOrder, Order } from '@/types/order'

type EditorStore = ReturnType<typeof useOrdersDraftsStore>
interface OrderEditorContext {
  store: EditorStore
  draftId: string
  submit: (draft: DraftOrder) => Promise<Order>
}
const editorKey: InjectionKey<OrderEditorContext> = Symbol('order-editor')

export function useOrderEditorContext() {
  return getCurrentInstance() ? inject(editorKey, null) : null
}

export function useOrderEditorStore(): EditorStore {
  return useOrderEditorContext()?.store ?? useOrdersDraftsStore()
}

export function provideOrderEditor(draftId: string, submit: OrderEditorContext['submit']) {
  const store = defineOrderDraftStore(`order-editor:${draftId}`, false)()
  store.maxTabs = Number.MAX_SAFE_INTEGER
  provide(editorKey, { store, draftId, submit })
  return store
}

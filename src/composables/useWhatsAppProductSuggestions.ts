import { computed, shallowRef, watch, type Ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppMessage, WhatsAppProductSuggestions } from '@/types/whatsapp'

export function useWhatsAppProductSuggestions(
  conversationId: Readonly<Ref<number | undefined>>,
  scope: Readonly<Ref<string>>,
  version: Readonly<Ref<number | null | undefined>>,
  messages: Readonly<Ref<WhatsAppMessage[]>>,
) {
  const result = shallowRef<WhatsAppProductSuggestions | null>(null)
  const recent = computed(() => messages.value
    .filter(message => message.direction === 'inbound' && message.type === 'text' && !message.isHistorical
      && !message.hiddenSource && !message.draftProductApplied && message.textBody?.trim())
    .slice(-10))
  const signature = computed(() => JSON.stringify(recent.value.map(message => [message.id, message.textBody])))
  const byMessage = computed(() => new Map(result.value?.messages.map(row => [row.messageId, row.suggestions])))
  let controller: AbortController | undefined

  async function reload() {
    controller?.abort()
    const id = conversationId.value
    if (!id || !recent.value.length) {
      result.value = null
      return
    }
    const request = new AbortController()
    controller = request
    try {
      const response = await whatsappApi.getProductSuggestions(id, recent.value.map(message => message.id), request.signal)
      if (!request.signal.aborted && conversationId.value === id) result.value = response.data ?? null
    } catch {
      if (!request.signal.aborted) result.value = null
    }
  }
  watch([conversationId, scope], () => { result.value = null }, { flush: 'sync' })
  watch([conversationId, scope, version, signature], (_, __, cleanup) => {
    void reload()
    cleanup(() => controller?.abort())
  }, { immediate: true })
  return { byMessage, branchId: computed(() => result.value?.branchId), reload }
}

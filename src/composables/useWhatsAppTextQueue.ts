import { onScopeDispose, shallowRef, watch, watchEffect, type Ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { generatePosCreationKey } from '@/utils/posCreationKey'
import type { WhatsAppMessage } from '@/types/whatsapp'

interface TextIntent {
  conversationId: number
  text: string
  replyToMessageId?: number
  quickReplyId?: number
}

type QueuedText = TextIntent & {
  requestId: string
  operationId?: number
  state: 'queued' | 'submitting' | 'pending' | 'failed' | 'unknown'
  error?: string
}

type QueueError = Error & { status?: number; serverCode?: string }

const requestKey = () => generatePosCreationKey().replace(/-/g, '')
const definite = (error: QueueError) => [400, 403, 409, 413, 422].includes(error.status ?? 0)
  && error.serverCode !== 'send_review'

export function useWhatsAppTextQueue(owner: Ref<string>, messages: (id: number) => readonly WhatsAppMessage[],
  confirmed: (message: WhatsAppMessage) => void) {
  const entries = shallowRef<QueuedText[]>([])
  const submitting = new Set<string>()
  const polling = new Map<string, ReturnType<typeof setTimeout>>()
  let active = true
  const storageKey = (scope: string) => `whatsapp:text-queue:${scope}`

  function write(next: QueuedText[]) {
    entries.value = next
    if (!owner.value) return
    try {
      if (next.length) sessionStorage.setItem(storageKey(owner.value), JSON.stringify(next))
      else sessionStorage.removeItem(storageKey(owner.value))
    } catch {}
  }

  function update(requestId: string, changes: Partial<QueuedText>) {
    write(entries.value.map(item => item.requestId === requestId ? { ...item, ...changes } : item))
  }

  function visible(scope: string, item: QueuedText) {
    return active && owner.value === scope && entries.value.some(row => row.requestId === item.requestId)
  }

  function cancelPoll(key: string) {
    clearTimeout(polling.get(key))
    polling.delete(key)
  }

  function remove(requestId: string) {
    cancelPoll(requestId)
    write(entries.value.filter(item => item.requestId !== requestId))
  }

  function poll(item: QueuedText, delay = 700, attempt = 0) {
    const scope = owner.value
    cancelPoll(item.requestId)
    polling.set(item.requestId, setTimeout(() => {
      polling.delete(item.requestId)
      if (visible(scope, item)) void verify(item, attempt)
    }, delay))
  }

  async function verify(item: QueuedText, attempt = 0, resumeMissing = false) {
    const scope = owner.value
    if (!visible(scope, item)) return
    try {
      const { data } = await whatsappApi.getQueuedText(item.requestId, item.operationId)
      if (!visible(scope, item)) return
      if (data && 'pending' in data) {
        update(item.requestId, { state: 'pending', operationId: data.operationId, error: undefined })
        if (attempt < 60) poll({ ...item, operationId: data.operationId }, 2000, attempt + 1)
        else update(item.requestId, { state: 'unknown' })
        void drain(item.conversationId)
      } else if (data?.whatsAppMessageId) {
        remove(item.requestId)
        confirmed(data)
        void drain(item.conversationId)
      } else {
        update(item.requestId, { state: 'unknown' })
      }
    } catch (caught) {
      if (!visible(scope, item)) return
      const error = caught as QueueError
      if (resumeMissing && !item.operationId && error.status === 404) {
        update(item.requestId, { state: 'queued', error: undefined })
        void drain(item.conversationId)
        return
      }
      if (attempt < 3 && !definite(error) && !error.serverCode && !error.status) {
        poll(item, 2000, attempt + 1)
        return
      }
      update(item.requestId, { state: definite(error) ? 'failed' : 'unknown', error: error.message })
      void drain(item.conversationId)
    }
  }

  async function drain(conversationId: number) {
    const scope = owner.value
    const lock = `${scope}:${conversationId}`
    if (!active || !scope || submitting.has(lock)) return
    submitting.add(lock)
    try {
      while (active && owner.value === scope) {
        const item = entries.value.find(row => row.conversationId === conversationId && !row.operationId && row.state !== 'failed')
        if (!item || item.state !== 'queued') return
        update(item.requestId, { state: 'submitting' })
        try {
          const { data } = await whatsappApi.startQueuedText(
            conversationId, item.requestId, item.text, item.replyToMessageId, item.quickReplyId,
          )
          if (!active || owner.value !== scope) return
          if (!visible(scope, item)) continue
          if (!data?.operationId) {
            update(item.requestId, { state: 'unknown' })
            return
          }
          update(item.requestId, { state: 'pending', operationId: data.operationId })
          poll({ ...item, operationId: data.operationId })
        } catch (caught) {
          if (!active || owner.value !== scope) return
          if (!visible(scope, item)) continue
          const error = caught as QueueError
          const state = definite(error) ? 'failed' : 'unknown'
          update(item.requestId, { state, error: error.message })
          if (state === 'unknown') {
            void verify(item)
            return
          }
        }
      }
    } finally {
      submitting.delete(lock)
    }
  }

  function enqueue(intent: TextIntent) {
    write([...entries.value, { ...intent, requestId: requestKey(), state: 'queued' }])
    void drain(intent.conversationId)
  }

  function retry(item: QueuedText) {
    if (item.state === 'failed') {
      remove(item.requestId)
      enqueue({ conversationId: item.conversationId, text: item.text,
        replyToMessageId: item.replyToMessageId, quickReplyId: item.quickReplyId })
    } else if (item.state === 'unknown') {
      update(item.requestId, { state: 'pending' })
      void verify(item, 0, true)
    }
  }

  watch(owner, scope => {
    for (const key of polling.keys()) cancelPoll(key)
    try {
      const saved = scope ? JSON.parse(sessionStorage.getItem(storageKey(scope)) ?? '[]') as QueuedText[] : []
      entries.value = saved.map(item => item.state === 'submitting' ? { ...item, state: 'unknown' } : item)
    } catch { entries.value = [] }
    for (const item of entries.value) {
      if (item.state === 'pending' || item.state === 'unknown') poll(item)
      if (item.state === 'queued') void drain(item.conversationId)
    }
  }, { immediate: true, flush: 'sync' })

  watchEffect(() => {
    for (const item of entries.value) {
      if (messages(item.conversationId).some(message => message.clientRequestId === item.requestId)) {
        remove(item.requestId)
        void drain(item.conversationId)
      }
    }
  })

  onScopeDispose(() => {
    active = false
    for (const key of polling.keys()) cancelPoll(key)
  })

  return { entries, enqueue, retry }
}

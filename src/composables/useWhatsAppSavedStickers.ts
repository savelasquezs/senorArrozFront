import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppMessage } from '@/types/whatsapp'

type StickerRecord = { userId: number; key: string; blob: Blob; savedAt: number }
export type WhatsAppSavedSticker = StickerRecord & { previewUrl: string }

let database: Promise<IDBDatabase> | undefined

function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('senor-arroz-whatsapp-stickers', 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('stickers', { keyPath: ['userId', 'key'] })
      store.createIndex('userId', 'userId')
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        database = undefined
      }
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  }).catch(cause => {
    database = undefined
    throw cause
  })
}

async function stickerStorage<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction('stickers', mode)
    const request = action(transaction.objectStore('stickers'))
    transaction.oncomplete = () => resolve(request.result)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function whatsappStickerKey(message: Pick<WhatsAppMessage, 'id' | 'mediaSha256'>) {
  return message.mediaSha256 ? `hash:${message.mediaSha256}` : `message:${message.id}`
}

export function useWhatsAppSavedStickers(userId: Readonly<Ref<number | undefined>>) {
  const stickers = shallowRef<WhatsAppSavedSticker[]>([])
  const savedKeys = computed(() => new Set(stickers.value.map(sticker => sticker.key)))
  const saving = ref<string | null>(null)
  const loadFailed = ref(false)
  let revision = 0

  function clearPreviews() {
    for (const sticker of stickers.value) URL.revokeObjectURL(sticker.previewUrl)
    stickers.value = []
  }

  async function refresh(owner: number, scope: number) {
    const rows = await stickerStorage<StickerRecord[]>('readonly', store => store.index('userId').getAll(owner))
    if (scope !== revision) return
    clearPreviews()
    stickers.value = rows.sort((a, b) => b.savedAt - a.savedAt)
      .map(row => ({ ...row, previewUrl: URL.createObjectURL(row.blob) }))
    loadFailed.value = false
  }

  watch(userId, owner => {
    const scope = ++revision
    clearPreviews()
    saving.value = null
    loadFailed.value = false
    if (!owner || typeof indexedDB === 'undefined') return
    void refresh(owner, scope).catch(() => { if (revision === scope) loadFailed.value = true })
  }, { immediate: true, flush: 'sync' })

  onBeforeUnmount(() => { revision++; clearPreviews() })

  async function save(message: WhatsAppMessage) {
    const owner = userId.value
    const key = whatsappStickerKey(message)
    const scope = revision
    if (!owner || saving.value || savedKeys.value.has(key)) return false
    saving.value = key
    try {
      const blob = await whatsappApi.downloadSticker(message.conversationId, message.id)
      if (scope !== revision) return false
      if (blob.type !== 'image/webp' || !blob.size) throw new Error('El sticker no está disponible.')
      const record: StickerRecord = { userId: owner, key, blob, savedAt: Date.now() }
      await stickerStorage('readwrite', store => store.put(record))
      await refresh(owner, scope)
      return scope === revision
    } finally {
      if (scope === revision) saving.value = null
    }
  }

  async function remove(key: string) {
    const owner = userId.value
    if (!owner) return
    const scope = revision
    await stickerStorage('readwrite', store => store.delete([owner, key]))
    await refresh(owner, scope)
  }

  return { stickers, savedKeys, saving, loadFailed, save, remove }
}

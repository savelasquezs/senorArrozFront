import { ref, shallowRef, watch, type Ref } from 'vue'

export function useWhatsAppComposer(conversationId: Readonly<Ref<number | null>>) {
  const draft = ref(''), selectedFile = shallowRef<File | null>(null)
  const drafts = new Map<number, { text: string; file: File | null }>()
  watch(conversationId, (id, previous) => {
    if (previous) drafts.set(previous, { text: draft.value, file: selectedFile.value })
    const saved = id ? drafts.get(id) : undefined
    draft.value = saved?.text ?? ''; selectedFile.value = saved?.file ?? null
  }, { flush: 'sync' })
  function clearSent(id: number, text: string, file: File | null) {
    if (conversationId.value === id) {
      if (draft.value.trim() === text) draft.value = ''
      if (selectedFile.value === file) selectedFile.value = null
    } else {
      const saved = drafts.get(id)
      if (saved?.text.trim() === text && saved.file === file) drafts.delete(id)
    }
  }
  return { draft, selectedFile, clearSent }
}

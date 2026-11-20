import { ref, shallowRef, watch, type Ref } from 'vue'

type Attachment = { id: number; file: File }

export function useWhatsAppComposer(conversationId: Readonly<Ref<number | null>>) {
  const draft = ref('')
  const attachments = shallowRef<readonly Attachment[]>([])
  const drafts = new Map<number, { text: string; attachments: readonly Attachment[] }>()
  let nextAttachmentId = 0
  watch(conversationId, (id, previous) => {
    if (previous) drafts.set(previous, { text: draft.value, attachments: attachments.value })
    const saved = id ? drafts.get(id) : undefined
    draft.value = saved?.text ?? ''
    attachments.value = saved?.attachments ?? []
  }, { flush: 'sync' })

  function addFiles(files: readonly File[]) {
    if (!files.length) return
    attachments.value = [...attachments.value, ...files.map(file => ({ id: ++nextAttachmentId, file }))]
  }

  function removeAttachment(attachmentId: number) {
    attachments.value = attachments.value.filter(attachment => attachment.id !== attachmentId)
  }

  function clearSent(id: number, text?: string, attachmentId?: number) {
    if (conversationId.value === id) {
      if (text !== undefined && draft.value.trim() === text) draft.value = ''
      if (attachmentId !== undefined) removeAttachment(attachmentId)
      return
    }
    const saved = drafts.get(id)
    if (!saved) return
    if (text !== undefined && saved.text.trim() === text) saved.text = ''
    if (attachmentId !== undefined) saved.attachments = saved.attachments.filter(attachment => attachment.id !== attachmentId)
    if (!saved.text && !saved.attachments.length) drafts.delete(id)
  }

  function resetComposer() {
    drafts.clear()
    draft.value = ''
    attachments.value = []
  }

  return { draft, attachments, addFiles, removeAttachment, clearSent, resetComposer }
}

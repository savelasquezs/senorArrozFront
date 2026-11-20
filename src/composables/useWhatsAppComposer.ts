import { ref, shallowRef, watch, type Ref } from 'vue'

type Attachment = { id: number; file: File }
export type WhatsAppComposerDraft = { text: string; attachments: readonly Attachment[] }

export function useWhatsAppComposer(conversationId: Readonly<Ref<number | null>>) {
  const draft = ref('')
  const attachments = shallowRef<readonly Attachment[]>([])
  const drafts = new Map<number, WhatsAppComposerDraft>()
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

  function takeDraft(): WhatsAppComposerDraft {
    const submitted = { text: draft.value, attachments: attachments.value }
    draft.value = ''
    attachments.value = []
    return submitted
  }

  function restoreDraft(submitted: WhatsAppComposerDraft) {
    if (draft.value || attachments.value.length) return false
    draft.value = submitted.text
    attachments.value = submitted.attachments
    return true
  }

  function resetComposer() {
    drafts.clear()
    draft.value = ''
    attachments.value = []
  }

  return { draft, attachments, addFiles, removeAttachment, takeDraft, restoreDraft, resetComposer }
}

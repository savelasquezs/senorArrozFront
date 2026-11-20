import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useWhatsAppComposer } from '../useWhatsAppComposer'

describe('WhatsApp composer isolation', () => {
  it('preserves text and all attachments per conversation', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    const file = new File(['image'], 'foto.png', { type: 'image/png' })
    const document = new File(['document'], 'recibo.pdf')
    composer.draft.value = 'Pedido uno'; composer.addFiles([file, document])
    id.value = 2
    expect(composer.draft.value).toBe(''); expect(composer.attachments.value).toEqual([])
    composer.draft.value = 'Pedido dos'; id.value = 1
    expect(composer.draft.value).toBe('Pedido uno')
    expect(composer.attachments.value.map(item => item.file)).toEqual([file, document])
    id.value = 2; expect(composer.draft.value).toBe('Pedido dos'); scope.stop()
  })
  it('detaches the submitted text and files from the next conversation draft', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Enviado'
    const first = new File(['first'], 'foto.png'), pending = new File(['pending'], 'recibo.pdf')
    composer.addFiles([first, pending]); const submitted = composer.takeDraft()
    id.value = 2; composer.draft.value = 'Nuevo'; composer.addFiles([first])
    expect(composer.draft.value).toBe('Nuevo')
    expect(composer.attachments.value.map(item => item.file)).toEqual([first])
    expect(submitted.text).toBe('Enviado')
    expect(submitted.attachments.map(item => item.file)).toEqual([first, pending])
    id.value = 1
    expect(composer.draft.value).toBe('')
    expect(composer.attachments.value).toEqual([]); scope.stop()
  })
  it('keeps a newer draft typed while a previous send was pending', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Mensaje anterior'
    const submitted = composer.takeDraft()
    composer.draft.value = 'Mensaje nuevo'
    expect(composer.restoreDraft(submitted)).toBe(false)
    expect(composer.draft.value).toBe('Mensaje nuevo')
    composer.draft.value = ''
    expect(composer.restoreDraft(submitted)).toBe(true)
    expect(composer.draft.value).toBe('Mensaje anterior'); scope.stop()
  })
})

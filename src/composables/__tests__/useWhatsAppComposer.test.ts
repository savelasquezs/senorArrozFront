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
  it('a late send cannot erase the text or attachment of another conversation', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Enviado'
    const first = new File(['first'], 'foto.png'), pending = new File(['pending'], 'recibo.pdf')
    composer.addFiles([first, pending]); const sent = composer.attachments.value[0]!
    id.value = 2; composer.draft.value = 'Nuevo'; composer.addFiles([first])
    composer.clearSent(1, 'Enviado', sent.id)
    expect(composer.draft.value).toBe('Nuevo')
    expect(composer.attachments.value.map(item => item.file)).toEqual([first])
    id.value = 1
    expect(composer.draft.value).toBe('')
    expect(composer.attachments.value.map(item => item.file)).toEqual([pending]); scope.stop()
  })
  it('keeps a newer draft typed while a previous send was pending', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Mensaje nuevo'; composer.clearSent(1, 'Mensaje anterior')
    expect(composer.draft.value).toBe('Mensaje nuevo'); scope.stop()
  })
})

import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useWhatsAppComposer } from '../useWhatsAppComposer'

describe('WhatsApp composer isolation', () => {
  it('preserves text and attachment per conversation', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    const file = new File(['image'], 'foto.png', { type: 'image/png' })
    composer.draft.value = 'Pedido uno'; composer.selectedFile.value = file
    id.value = 2
    expect(composer.draft.value).toBe(''); expect(composer.selectedFile.value).toBeNull()
    composer.draft.value = 'Pedido dos'; id.value = 1
    expect(composer.draft.value).toBe('Pedido uno'); expect(composer.selectedFile.value).toBe(file)
    id.value = 2; expect(composer.draft.value).toBe('Pedido dos'); scope.stop()
  })
  it('a late send cannot erase the text or attachment of another conversation', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Enviado'; id.value = 2; composer.draft.value = 'Nuevo'
    composer.clearSent(1, 'Enviado', null)
    expect(composer.draft.value).toBe('Nuevo'); id.value = 1
    expect(composer.draft.value).toBe(''); scope.stop()
  })
  it('keeps a newer draft typed while a previous send was pending', () => {
    const scope = effectScope(), id = ref<number | null>(1)
    const composer = scope.run(() => useWhatsAppComposer(id))!
    composer.draft.value = 'Mensaje nuevo'; composer.clearSent(1, 'Mensaje anterior', null)
    expect(composer.draft.value).toBe('Mensaje nuevo'); scope.stop()
  })
})

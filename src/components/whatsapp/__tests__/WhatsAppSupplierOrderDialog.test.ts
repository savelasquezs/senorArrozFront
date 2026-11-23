import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import WhatsAppSupplierOrderDialog from '../WhatsAppSupplierOrderDialog.vue'
import { supplierOrderMessage } from '@/helpers/whatsappSupplierOrder'

const api = vi.hoisted(() => ({ getConversationSupplierItems: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))

const props = { conversationId: 14, supplierName: 'Molino', canInsert: false, windowOpen: false, composerError: '' }
const stubs = {
  BaseDialog: { template: '<section role="dialog"><slot /><slot name="footer" /></section>' },
}
const copy = vi.fn()

beforeEach(() => {
  api.getConversationSupplierItems.mockReset()
  copy.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: { writeText: copy } })
})

it('loads favorite articles and prepares a copyable draft when the window is closed', async () => {
  api.getConversationSupplierItems.mockResolvedValue({ data: [{ expenseId: 4, expenseName: 'Arroz', expenseUnit: 'Kilo' }] })
  const view = mount(WhatsAppSupplierOrderDialog, { props, global: { stubs } })
  try {
    await flushPromises()
    expect(api.getConversationSupplierItems).toHaveBeenCalledWith(14, expect.any(AbortSignal))
    await view.get('input[aria-label="Cantidad de Arroz"]').setValue('2,5')
    await view.get('input[aria-label="Nota de Arroz"]').setValue('Grano largo')
    await view.get('textarea').setValue('Entregar el lunes')
    await view.get('form').trigger('submit')
    const text = view.get('textarea').element.value
    expect(text).toContain('2,5 kg — Arroz (Grano largo)')
    expect(text).toContain('Entregar el lunes')
    expect(view.text()).not.toContain('Pasar al chat')
    await view.findAll('button').find(button => button.text() === 'Copiar mensaje')!.trigger('click')
    expect(copy).toHaveBeenCalledExactlyOnceWith(text)
    expect(view.emitted('prepare')).toBeUndefined()
  } finally {
    view.unmount()
    vi.unstubAllGlobals()
  }
})

it('emits the draft for its own chat with a free item when the supplier has no history', async () => {
  api.getConversationSupplierItems.mockResolvedValue({ data: [] })
  const view = mount(WhatsAppSupplierOrderDialog, { props: { ...props, canInsert: true, windowOpen: true }, global: { stubs } })
  try {
    await flushPromises()
    await view.findAll('button').find(button => button.text() === 'Agregar artículo')!.trigger('click')
    const [name, quantity, unit] = view.findAll('fieldset input')
    await name!.setValue('Aceite')
    await quantity!.setValue('1.75')
    await unit!.setValue('litros')
    await view.get('form').trigger('submit')
    await view.findAll('button').find(button => button.text() === 'Pasar al chat')!.trigger('click')
    expect(view.emitted('prepare')).toEqual([[14, expect.stringContaining('1,75 litros — Aceite')]])
  } finally {
    view.unmount()
    vi.unstubAllGlobals()
  }
})

it('rejects empty, negative and incomplete items and respects the composer limit', () => {
  const line = { name: 'Aceite', quantity: '1', unit: 'litro', note: '' }
  expect(() => supplierOrderMessage([], '')).toThrow('al menos un artículo')
  expect(() => supplierOrderMessage([{ ...line, quantity: '-1' }], '')).toThrow('cantidad positiva')
  expect(() => supplierOrderMessage([{ ...line, custom: true, quantity: '' }], '')).toThrow('cantidad positiva')
  expect(() => supplierOrderMessage([line], 'a'.repeat(4096))).toThrow('Acorta')
  vi.unstubAllGlobals()
})

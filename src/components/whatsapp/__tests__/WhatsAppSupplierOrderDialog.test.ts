import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import WhatsAppSupplierOrderDialog from '../WhatsAppSupplierOrderDialog.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { supplierOrderMessage } from '@/helpers/whatsappSupplierOrder'

const api = vi.hoisted(() => ({ getConversationSupplierItems: vi.fn(), getConversationTemplates: vi.fn(), sendConversationTemplate: vi.fn() }))
const expenses = vi.hoisted(() => ({ getAllExpenses: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
vi.mock('@/services/MainAPI/expenseApi', () => ({ expenseApi: expenses }))

const props = { conversationId: 14, supplierName: 'Molino', canInsert: false, windowOpen: false, composerError: '' }
const stubs = {
  BaseDialog: { template: '<section role="dialog"><slot /><slot name="footer" /></section>' },
}
const copy = vi.fn()

beforeEach(() => {
  api.getConversationSupplierItems.mockReset()
  api.getConversationTemplates.mockReset()
  api.sendConversationTemplate.mockReset()
  expenses.getAllExpenses.mockReset()
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
  const view = mount(WhatsAppSupplierOrderDialog, { props: { ...props, canInsert: true, windowOpen: true, templateBranchName: 'Santander' }, global: { stubs } })
  try {
    await flushPromises()
    await view.findAll('button').find(button => button.text() === 'Agregar artículo manual')!.trigger('click')
    const name = view.get('input[aria-label="Nombre del artículo manual"]')
    const addButton = view.findAll('button').find(button => button.text() === 'Agregar artículo manual')!
    const controls = view.get('form').findAll('input, button').map(control => control.element)
    expect(controls.indexOf(name.element)).toBeLessThan(controls.indexOf(addButton.element))
    await name.setValue('Aceite')
    await view.get('input[aria-label="Cantidad de Aceite"]').setValue('1.75')
    expect(view.find('input[aria-label="Unidad del artículo manual"]').exists()).toBe(false)
    await view.get('form').trigger('submit')
    await view.findAll('button').find(button => button.text() === 'Pasar al chat')!.trigger('click')
    expect(view.emitted('prepare')).toEqual([[14, expect.stringContaining('1,75 — Aceite')]])
    expect(api.getConversationTemplates).not.toHaveBeenCalled()
    expect(view.text()).not.toContain('Enviar plantilla')
  } finally {
    view.unmount()
    vi.unstubAllGlobals()
  }
})

it('loads the full expense catalog on demand and keeps the selected unit in the order', async () => {
  api.getConversationSupplierItems.mockResolvedValue({ data: [{ expenseId: 4, expenseName: 'Arroz', expenseUnit: 'Kilo' }] })
  expenses.getAllExpenses.mockResolvedValue({ isSuccess: true, data: [
    { id: 4, name: 'Arroz', unit: 'Kilo', unitDisplay: 'Kilo' },
    { id: 8, name: 'Sal', unit: 'Pound', unitDisplay: 'Libra', categoryName: 'Insumos' },
  ] })
  const view = mount(WhatsAppSupplierOrderDialog, { props, global: { stubs } })
  try {
    await flushPromises()
    expect(expenses.getAllExpenses).not.toHaveBeenCalled()
    await view.findAll('button').find(button => button.text() === 'Ver todos')!.trigger('click')
    await flushPromises()
    const selector = view.getComponent(BaseSelect)
    expect(selector.props('options')).toEqual([{ id: 8, name: 'Sal · Libra', description: 'Insumos' }])
    selector.vm.$emit('update:modelValue', 8)
    await flushPromises()
    expect(selector.props('options')).toEqual([])
    await view.get('input[aria-label="Cantidad de Sal"]').setValue('2')
    await view.get('form').trigger('submit')
    expect(view.get('textarea').element.value).toContain('2 lb — Sal')
  } finally {
    view.unmount()
    vi.unstubAllGlobals()
  }
})

it('fills the template with selected items and the chat branch, and sends after entering delivery', async () => {
  api.getConversationSupplierItems.mockResolvedValue({ data: [{ expenseId: 4, expenseName: 'Arroz', expenseUnit: 'Kilo' }] })
  api.getConversationTemplates.mockResolvedValue({ data: [{
    name: 'pedido_a_proveedor', language: 'es_CO',
    componentsJson: JSON.stringify([{ type: 'BODY', text: 'Hola, para encargar. {{1}}. Sucursal {{2}}. Entrega para {{3}}. Gracias.' }]),
  }] })
  api.sendConversationTemplate.mockResolvedValue({ data: { id: 25 } })
  const view = mount(WhatsAppSupplierOrderDialog, {
    props: { ...props, templateBranchName: 'Santander' }, global: { stubs },
  })
  try {
    await flushPromises()
    await view.get('input[aria-label="Cantidad de Arroz"]').setValue('3')
    await view.get('form').trigger('submit')
    await flushPromises()
    const send = view.findAll('button').find(button => button.text() === 'Enviar plantilla')!
    expect(send.attributes('disabled')).toBeDefined()
    await view.get('input[aria-label="Entrega para"]').setValue('mañana después de las 10 a. m.')
    expect(view.get('textarea').element.value).toContain('3 kg — Arroz. Sucursal Santander.')
    expect(view.findAll('textarea')).toHaveLength(1)
    expect(view.text()).not.toContain('Pasar al chat')
    await send.trigger('click')
    await flushPromises()
    expect(api.sendConversationTemplate).toHaveBeenCalledExactlyOnceWith(14, 'pedido_a_proveedor', 'es_CO',
      ['3 kg — Arroz', 'Santander', 'mañana después de las 10 a. m.'], expect.any(String))
    expect(view.emitted('sent')).toEqual([[14, { id: 25 }]])
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

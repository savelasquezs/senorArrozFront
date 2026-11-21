import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import WhatsAppConversationTemplates from '../WhatsAppConversationTemplates.vue'

const api = vi.hoisted(() => ({ getConversationTemplates: vi.fn(), sendConversationTemplate: vi.fn() }))
const store = vi.hoisted(() => ({ upsertMessage: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
vi.mock('@/store/whatsapp', () => ({ useWhatsAppStore: () => store }))
const template = { name: 'retomar', language: 'es', status: 'APPROVED', category: 'UTILITY', metaTemplateId: '123',
  componentsJson: '[{"type":"BODY","text":"Hola {{1}}"}]' }
beforeEach(() => {
  vi.clearAllMocks()
  api.getConversationTemplates.mockResolvedValue({ data: [template] })
})
async function setup() {
  const wrapper = mount(WhatsAppConversationTemplates, { props: { conversationId: 11 }, global: {
    stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' } },
  } })
  await wrapper.get('button').trigger('click'); await flushPromises()
  await wrapper.get('button[aria-haspopup]').trigger('click')
  await wrapper.get('[role="option"]').trigger('click')
  await wrapper.get('input').setValue('Cliente')
  return wrapper
}
describe('Conversation templates', () => {
  it('keeps the captured conversation while a template send completes late', async () => {
    let complete!: (value: unknown) => void
    api.sendConversationTemplate.mockReturnValue(new Promise(resolve => { complete = resolve }))
    const wrapper = await setup()
    await wrapper.get('form').trigger('submit')
    await wrapper.setProps({ conversationId: 22 })
    const message = { id: 90, conversationId: 11 }
    complete({ data: message }); await flushPromises()
    expect(api.getConversationTemplates).toHaveBeenCalledWith(11)
    expect(api.sendConversationTemplate).toHaveBeenCalledWith(11, 'retomar', 'es', ['Cliente'])
    expect(store.upsertMessage).toHaveBeenCalledWith(11, message); wrapper.unmount()
  })
  it('does not repeat an uncertain send or erase its parameters', async () => {
    api.sendConversationTemplate.mockRejectedValue(new Error('El envío requiere revisión'))
    const wrapper = await setup(); await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.text()).toContain('requiere revisión'); expect(wrapper.get('input').element.value).toBe('Cliente')
    expect(api.sendConversationTemplate).toHaveBeenCalledTimes(1); wrapper.unmount()
  })
  it('does not restore old session messages after the component unmounts', async () => {
    let complete!: (value: unknown) => void
    api.sendConversationTemplate.mockReturnValue(new Promise(resolve => { complete = resolve }))
    const wrapper = await setup(); await wrapper.get('form').trigger('submit'); wrapper.unmount()
    complete({ data: { id: 90, conversationId: 11 } }); await flushPromises()
    expect(store.upsertMessage).not.toHaveBeenCalled()
  })
})

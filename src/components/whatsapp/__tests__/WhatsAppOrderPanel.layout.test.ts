import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import WhatsAppOrderPanel from '../WhatsAppOrderPanel.vue'
import type { WhatsAppConversation } from '@/types/whatsapp'

const harness = vi.hoisted(() => ({ contexts: new Map<number, any>() }))
vi.mock('@/composables/useWhatsAppCommercialDraft', async () => {
  const { ref } = await import('vue')
  return { useWhatsAppCommercialDraft: (conversation: { value: WhatsAppConversation }) => {
    const state = {
      session: ref({ sessionId: conversation.value.id, status: 'active', internalNotes: [] }),
      draft: ref(null), canApplyProductSuggestion: ref(true),
      loading: ref(false), syncing: ref(false), error: ref(''), saveState: ref('saved'),
      commercialStatus: ref('in_progress'), editable: ref(true), owned: ref(true),
      load: vi.fn().mockResolvedValue(undefined), start: vi.fn(), flush: vi.fn().mockResolvedValue(undefined),
      action: vi.fn().mockResolvedValue(undefined), refreshStatus: vi.fn(), reconcile: vi.fn(),
    }
    harness.contexts.set(conversation.value.id, state)
    return state
  } }
})

afterEach(() => { harness.contexts.clear(); document.body.innerHTML = '' })

it('keeps conversation controls in the chat header and gives the editor its complete column', async () => {
  const target = document.createElement('header')
  const saveTarget = document.createElement('span')
  document.body.append(target, saveTarget)
  const current = ref(11)
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, null, {
    default: () => h(WhatsAppOrderPanel, { key: current.value,
      conversation: { id: current.value } as WhatsAppConversation, controlsTarget: target, saveTarget }),
  }) }), { attachTo: document.body, global: { stubs: {
    OrderSidebar: { template: '<div data-test="existing-order-editor">Editor compartido</div>' },
    BaseDialog: { props: ['modelValue', 'title'], template: '<section v-if="modelValue" role="dialog"><h2>{{ title }}</h2><slot /></section>' },
  } } })
  await flushPromises()
  expect(target.textContent).toContain('Notas internas')
  expect(target.textContent).not.toContain('Guardado')
  expect(saveTarget.textContent).toContain('Guardado')
  harness.contexts.get(11).saveState.value = 'error'
  await flushPromises()
  expect(saveTarget.querySelector('[role="status"]')?.textContent).toContain('No se pudo guardar')
  expect(wrapper.text()).not.toContain('Línea:')
  expect(wrapper.text()).not.toContain('Prepara:')
  expect(wrapper.text()).toContain('Pedidos anteriores')
  expect(wrapper.text()).toContain('Descartar borrador')
  expect(wrapper.find('[data-test="existing-order-editor"]').exists()).toBe(true)
  const select = target.querySelector('select')!
  select.value = 'waiting_customer'
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
  expect(harness.contexts.get(11).commercialStatus.value).toBe('waiting_customer')
  await wrapper.findAll('button').find(button => button.text() === 'Descartar borrador')!.trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="dialog"]').text()).toContain('Descartar borrador')
  expect(harness.contexts.get(11).action).not.toHaveBeenCalled()
  current.value = 12
  await flushPromises()
  expect(wrapper.findAll('[role="dialog"]')).toHaveLength(0)
  expect(target.querySelectorAll('select')).toHaveLength(1)
  expect(saveTarget.textContent).toContain('Guardado')
  expect(wrapper.findAll('button').filter(button => button.text() === 'Descartar borrador')).toHaveLength(1)
  expect(target.querySelector('select')?.value).toBe('in_progress')
  expect(harness.contexts.get(11).flush).toHaveBeenCalledOnce()
  ;[...target.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Notas internas')!.click()
  await flushPromises()
  expect(wrapper.text()).toContain('Notas internas · nunca se envían al cliente')
  wrapper.unmount()
  expect(target.textContent).toBe('')
  expect(saveTarget.textContent).toBe('')
})

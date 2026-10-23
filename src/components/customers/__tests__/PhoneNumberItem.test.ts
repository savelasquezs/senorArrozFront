import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PhoneNumberItem from '../PhoneNumberItem.vue'

vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

function render(phoneNumber = '3001234567') {
    return mount(PhoneNumberItem, { props: { phoneNumber, actionsOnHover: true, compact: true, showIcon: false }, attachTo: document.body })
}

describe('phone actions in the shared customer row', () => {
    it('reveals the existing actions on hover and closes them when the pointer leaves', async () => {
        const wrapper = render()
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(false)
        await wrapper.trigger('mouseenter')
        expect(wrapper.find('[title="Llamar"]').exists()).toBe(true)
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(true)
        expect(wrapper.find('[title="Abrir WhatsApp"]').exists()).toBe(true)
        await wrapper.trigger('mouseleave')
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('supports keyboard focus and Escape without losing the phone trigger', async () => {
        const wrapper = render()
        const trigger = wrapper.get('[aria-label="Acciones del teléfono 3001234567"]')
        ;(trigger.element as HTMLButtonElement).focus()
        await flushPromises()
        expect(trigger.attributes('aria-expanded')).toBe('true')
        await trigger.trigger('keydown', { key: 'Escape' })
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(false)
        expect(document.activeElement).toBe(trigger.element)
        wrapper.unmount()
    })

    it('allows tapping the number to open and close the actions', async () => {
        const wrapper = render()
        const trigger = wrapper.get('[aria-label="Acciones del teléfono 3001234567"]')
        await trigger.trigger('click')
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(true)
        await trigger.trigger('click')
        expect(wrapper.find('[title="Copiar número"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('keeps the existing WhatsApp eligibility rule', async () => {
        const wrapper = render('123')
        await wrapper.trigger('mouseenter')
        expect(wrapper.find('[title="Abrir WhatsApp"]').exists()).toBe(false)
        expect(wrapper.find('[title="Llamar"]').exists()).toBe(true)
        wrapper.unmount()
    })
})

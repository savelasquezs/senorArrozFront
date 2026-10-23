import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderDeliveryFeeEditor from '../OrderDeliveryFeeEditor.vue'

const mountEditor = () => mount(OrderDeliveryFeeEditor, {
    attachTo: document.body,
    props: { deliveryFee: 20000, total: 105400, canEdit: true },
})

describe('OrderDeliveryFeeEditor', () => {
    it('edits explicitly, previews the total and cancels without saving', async () => {
        const wrapper = mountEditor()
        await wrapper.get('[aria-label="Editar tarifa de domicilio"]').trigger('click')
        const input = wrapper.get('input')
        expect(document.activeElement).toBe(input.element)
        expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
        await input.setValue(3500)
        expect(wrapper.text()).toContain('88.900')
        await input.trigger('blur')
        expect(wrapper.emitted('save')).toBeUndefined()
        await input.trigger('keydown', { key: 'Escape' })
        expect(wrapper.find('input').exists()).toBe(false)
        expect(wrapper.emitted('save')).toBeUndefined()
        wrapper.unmount()
    })

    it.each(['', '-1', '50001', '10.5'])('rejects invalid value %s', async value => {
        const wrapper = mountEditor()
        await wrapper.get('button').trigger('click')
        await wrapper.get('input').setValue(value)
        expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
        await wrapper.get('input').trigger('keydown', { key: 'Enter' })
        expect(wrapper.emitted('save')).toBeUndefined()
        wrapper.unmount()
    })

    it('allows zero, blocks duplicate submission while saving and closes on success', async () => {
        const wrapper = mountEditor()
        await wrapper.get('button').trigger('click')
        await wrapper.get('input').setValue(0)
        await wrapper.get('input').trigger('keydown', { key: 'Enter' })
        expect(wrapper.emitted('save')).toEqual([[0]])
        await wrapper.setProps({ saving: true })
        await wrapper.get('input').trigger('keydown', { key: 'Enter' })
        expect(wrapper.emitted('save')).toHaveLength(1)
        expect(wrapper.get('input').attributes('disabled')).toBeDefined()
        await wrapper.setProps({ deliveryFee: 0, total: 85400, saving: false })
        expect(wrapper.find('input').exists()).toBe(false)
        wrapper.unmount()
    })

    it('keeps the entered value and an accessible message on API failure', async () => {
        const wrapper = mountEditor()
        await wrapper.get('button').trigger('click')
        await wrapper.get('input').setValue(3500)
        await wrapper.setProps({ saving: true })
        await wrapper.setProps({ saving: false, error: 'Sin conexión. Intenta nuevamente.' })
        expect((wrapper.get('input').element as HTMLInputElement).value).toBe('3500')
        expect(wrapper.get('[role="alert"]').text()).toContain('Sin conexión')
        wrapper.unmount()
    })

    it('shows only the amount when the user cannot edit', async () => {
        const wrapper = mountEditor()
        await wrapper.setProps({ canEdit: false })
        expect(wrapper.text()).toContain('20.000')
        expect(wrapper.find('button').exists()).toBe(false)
        wrapper.unmount()
    })
})

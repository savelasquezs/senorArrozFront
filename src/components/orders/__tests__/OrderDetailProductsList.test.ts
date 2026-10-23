import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { OrderDetailItem } from '@/types/order'
import OrderDetailProductsList from '../OrderDetailProductsList.vue'

function line(overrides = {}): OrderDetailItem {
    return { id: 1, productId: 1, productName: 'Arroz familiar', productDescription: 'Arroz familiar', quantity: 2, unitPrice: 10000, discount: 2000, subtotal: 18000, notes: null, orderId: 1, createdAt: '', updatedAt: '', ...overrides }
}

function render(products = [line()], options = {}) {
    return mount(OrderDetailProductsList, {
        props: { products, deliveryFee: 0, canEdit: true, ...options },
        global: { stubs: { AddProductModal: true, BaseDialog: true } },
    })
}

async function edit(wrapper: ReturnType<typeof render>) {
    await wrapper.findAll('button').find(button => button.text() === 'Editar Productos')!.trigger('click')
}

async function save(wrapper: ReturnType<typeof render>) {
    await wrapper.findAll('button').find(button => button.text() === 'Guardar Cambios')!.trigger('click')
    return (wrapper.emitted('save')!.at(-1)![0] as { products: Array<{ quantity: number; discount: number }>; freeDeliveryRequested: boolean })
}

describe('OrderDetailProductsList percentage discounts', () => {
    it('keeps the compact discount breakdown visible when free delivery is zero', () => {
        const wrapper = render([line({ discount: 11400, subtotal: 8600 })])
        const text = wrapper.text().replace(/\s+/g, ' ')
        expect(text).toMatch(/11\.400.*\(\$\s*0 domi gratis · \$\s*11\.400 otros\)/)
        expect(wrapper.emitted('save')).toBeUndefined()
        wrapper.unmount()
    })

    it('shows the saved free delivery and manual amounts together without altering them', () => {
        const wrapper = render([line({ quantity: 1, unitPrice: 84000, discount: 9900, subtotal: 74100 }),
            line({ id: 2, productId: 2, quantity: 1, unitPrice: 12000, discount: 1500, subtotal: 10500 })], {
            deliveryFee: 20000, orderType: 'delivery', addressId: 12, maxFreeDeliveryDiscount: 3000, freeDeliveryRequested: true,
        })
        expect(wrapper.text().replace(/\s+/g, ' ')).toMatch(/11\.400.*\(\$\s*3\.000 domi gratis · \$\s*8\.400 otros\)/)
        expect(wrapper.emitted('save')).toBeUndefined()
        wrapper.unmount()
    })
    it('includes notes in an existing product draft and discards them with the draft', async () => {
        const wrapper = render([line({ notes: 'Original' })])
        await edit(wrapper)
        await wrapper.get('[aria-label="Editar nota de Arroz familiar"]').trigger('click')
        const dialog = wrapper.getComponent({ name: 'OrderNoteDialog' })
        await (dialog.props('save') as (note: string) => Promise<void>)('Separar y rotular')
        dialog.vm.$emit('update:modelValue', false)
        await flushPromises()
        expect(wrapper.emitted('save')).toBeUndefined()
        expect(((await save(wrapper)).products[0] as any).notes).toBe('Separar y rotular')
        await wrapper.findAll('button').find(button => button.text() === 'Cancelar')!.trigger('click')
        expect(wrapper.text()).toContain('Nota: Original')
        wrapper.unmount()
    })

    it('hides product note controls without product edit permission', () => {
        const wrapper = render([line()], { canEdit: false })
        expect(wrapper.find('[aria-label^="Editar nota de"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('converts persisted COP to percent and saves the edited percent as COP', async () => {
        const wrapper = render()
        await edit(wrapper)
        const input = wrapper.get('input[aria-label^="Descuento en porcentaje"]')
        expect((input.element as HTMLInputElement).value).toBe('10')
        await input.setValue(12.5)
        expect((await save(wrapper)).products[0]!.discount).toBe(2500)
        wrapper.unmount()
    })

    it('preserves the chosen percentage when quantity or price changes', async () => {
        const wrapper = render()
        await edit(wrapper)
        await wrapper.get('input[aria-label^="Cantidad de"]').setValue(3)
        await wrapper.get('input[aria-label^="Precio de"]').setValue(20000)
        expect((await save(wrapper)).products[0]!.discount).toBe(6000)
        wrapper.unmount()
    })

    it('preserves exact historical COP when saving without editing a rounded percentage', async () => {
        const wrapper = render([line({ unitPrice: 66000, discount: 1001, subtotal: 130999 })])
        await edit(wrapper)
        expect((await save(wrapper)).products[0]!.discount).toBe(1001)
        wrapper.unmount()
    })

    it('keeps the free delivery allocation separate from the manual percentage and caps each line', async () => {
        const wrapper = render([line({ quantity: 1, unitPrice: 10000, discount: 1500, subtotal: 8500 }), line({ id: 2, productId: 2, quantity: 1, discount: 1500, subtotal: 8500 })], {
            deliveryFee: 3000, orderType: 'reservation', addressId: 12, maxFreeDeliveryDiscount: 3000, freeDeliveryRequested: true,
        })
        await edit(wrapper)
        const inputs = wrapper.findAll('input[aria-label^="Descuento en porcentaje"]')
        expect((inputs[0]!.element as HTMLInputElement).value).toBe('0')
        await inputs[0]!.setValue(10)
        let payload = await save(wrapper)
        expect(payload.products.map(item => item.discount)).toEqual([2500, 1500])
        expect(payload.freeDeliveryRequested).toBe(true)
        await inputs[0]!.setValue(100)
        payload = await save(wrapper)
        expect(payload.products.map(item => item.discount)).toEqual([10000, 3000])
        wrapper.unmount()
    })

    it.each([-5, 150])('keeps discount %s within 0 and 100 percent', async percentage => {
        const wrapper = render()
        await edit(wrapper)
        await wrapper.get('input[aria-label^="Descuento en porcentaje"]').setValue(percentage)
        expect((await save(wrapper)).products[0]!.discount).toBe(percentage < 0 ? 0 : 20000)
        wrapper.unmount()
    })
})

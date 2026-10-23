import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OrderCard from '../OrderCard.vue'
import ReadyOrdersTable from '../ReadyOrdersTable.vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'

const order = { id: 7, status: 'ready', type: 'delivery', notes: 'Empacar separado' } as OrderListItem
const line = (id: number, notes: string | null) => ({ id, productName: `Producto ${id}`, quantity: 1, notes }) as OrderDetailItem

describe('Kitchen product notes on screen', () => {
    it('keeps each note under its own product in ready orders and refreshes changes', async () => {
        const wrapper = mount(ReadyOrdersTable, { props: {
            orders: [order], orderItemsMap: new Map([[7, [line(1, 'Sin cebolla'), line(2, 'Salsa aparte')]]]),
        } })
        const notes = wrapper.findAll('p').filter(p => p.text().startsWith('Nota:'))
        expect(notes.map(p => p.element.parentElement?.textContent)).toEqual([
            expect.stringContaining('Producto 1'), expect.stringContaining('Producto 2'),
        ])
        expect(notes[0]!.text()).toBe('Nota: Sin cebolla')
        expect(notes[1]!.text()).toBe('Nota: Salsa aparte')
        expect(wrapper.text()).toContain('Notas del pedido: Empacar separado')
        await wrapper.setProps({ orderItemsMap: new Map([[7, [line(1, ''), line(2, 'Poco picante')]]]) })
        expect(wrapper.text()).not.toContain('Sin cebolla')
        expect(wrapper.text()).toContain('Nota: Poco picante')
        wrapper.unmount()
    })

    it('shows multiline notes in active cards and hides blank notes', () => {
        const wrapper = mount(OrderCard, { props: {
            order: { ...order, status: 'taken' }, orderItems: [line(1, 'Sin cebolla\nSalsa aparte'), line(2, '  ')], isSelected: false,
        } })
        const notes = wrapper.findAll('p').filter(p => p.text().startsWith('Nota:'))
        expect(notes).toHaveLength(1)
        expect(notes[0]!.classes()).toContain('whitespace-pre-wrap')
        wrapper.unmount()
    })
})

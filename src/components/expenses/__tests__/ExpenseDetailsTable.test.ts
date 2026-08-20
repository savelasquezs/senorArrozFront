import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpenseDetailsTable from '@/components/expenses/ExpenseDetailsTable.vue'
import { defaultExpenseTableState } from '@/composables/useExpensesViewPersistence'
import type { ExpenseDetailGridRow } from '@/types/expense'

const rows: ExpenseDetailGridRow[] = [
    {
        detailId: 1, headerId: 12, createdAt: '2026-08-20T15:00:00Z', categoryName: 'Proteína', expenseName: 'Pollo',
        supplierName: 'Proveedor Ágil', quantity: 2, amount: 6000, total: 12000, notes: 'Primera línea', createdByName: 'Ana', canEdit: true, canDelete: false,
    },
    {
        detailId: 2, headerId: 10, createdAt: '2026-08-19T15:00:00Z', categoryName: 'Verduras', expenseName: 'Cebolla',
        supplierName: 'Mercado Norte', quantity: 4, amount: 2000, total: 8000, notes: 'Segunda línea', createdByName: 'Beto', canEdit: false, canDelete: true,
    },
]

function mountTable() {
    return mount(ExpenseDetailsTable, {
        props: { rowData: rows, initialTableState: defaultExpenseTableState() },
    })
}

describe('ExpenseDetailsTable', () => {
    it('muestra filas, resumen y acciones con permisos', async () => {
        const wrapper = mountTable()

        expect(wrapper.text()).toContain('#12')
        expect(wrapper.text()).toContain('12.000')
        expect(wrapper.emitted('summary-change')?.at(-1)).toEqual([{ rowCount: 2, totalAmount: 20000 }])

        const buttons = wrapper.findAll('tbody button')
        await buttons[0].trigger('click')
        await buttons[1].trigger('click')
        expect(wrapper.emitted('invoice-click')).toEqual([[12]])
        expect(wrapper.emitted('view-detail')).toEqual([[12]])
        expect(buttons.find(button => button.text() === 'Eliminar')?.attributes('disabled')).toBeDefined()
    })

    it('filtra en memoria, recalcula el resumen y muestra el estado vacío', async () => {
        const wrapper = mountTable()
        const textFilters = wrapper.findAll('input[type="search"]')

        await textFilters[0].setValue('proteina')
        expect(wrapper.text()).toContain('Pollo')
        expect(wrapper.text()).not.toContain('Cebolla')
        expect(wrapper.emitted('summary-change')?.at(-1)).toEqual([{ rowCount: 1, totalAmount: 12000 }])

        await textFilters[0].setValue('inexistente')
        expect(wrapper.text()).toContain('Sin resultados con los filtros aplicados')
    })

    it('alterna orden ascendente, descendente y sin orden', async () => {
        const wrapper = mountTable()
        const totalHeader = wrapper.findAll('thead button').find(button => button.text().includes('Total'))!

        await totalHeader.trigger('click')
        expect(wrapper.findAll('tbody tr')[0].text()).toContain('#10')
        await totalHeader.trigger('click')
        expect(wrapper.findAll('tbody tr')[0].text()).toContain('#12')
        await totalHeader.trigger('click')
        expect(wrapper.findAll('tbody tr')[0].text()).toContain('#12')
    })

    it('restaura visibilidad y emite cambios de estado', async () => {
        const initial = defaultExpenseTableState()
        initial.columns.find(column => column.key === 'notes')!.visible = false
        const wrapper = mount(ExpenseDetailsTable, { props: { rowData: rows, initialTableState: initial } })

        expect(wrapper.findAll('thead tr').at(0)!.findAll('th')).toHaveLength(10)
        const checkbox = wrapper.findAll('input[type="checkbox"]').find(input => input.element.parentElement?.textContent?.includes('Notas'))!
        await checkbox.setValue(true)
        expect(wrapper.findAll('thead tr').at(0)!.findAll('th')).toHaveLength(11)
        expect(wrapper.emitted('table-state-change')).toBeTruthy()
    })

    it('redimensiona columnas con eventos pointer y persiste el estado', async () => {
        const wrapper = mountTable()

        await wrapper.get('[data-column-resize="total"]').trigger('pointerdown', { clientX: 100 })
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150 }))
        window.dispatchEvent(new MouseEvent('pointerup'))
        await wrapper.vm.$nextTick()

        const state = wrapper.emitted('table-state-change')?.at(-1)?.[0] as ReturnType<typeof defaultExpenseTableState>
        expect(state.columns.find(column => column.key === 'total')?.width).toBe(185)
    })
})

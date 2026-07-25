import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const agGridMocks = vi.hoisted(() => {
    const module = (moduleName: string) => ({ moduleName })

    return {
        registerModules: vi.fn(),
        modules: {
            CellStyleModule: module('CellStyleModule'),
            ClientSideRowModelApiModule: module('ClientSideRowModelApiModule'),
            ClientSideRowModelModule: module('ClientSideRowModelModule'),
            ColumnApiModule: module('ColumnApiModule'),
            EventApiModule: module('EventApiModule'),
            NumberFilterModule: module('NumberFilterModule'),
            TextFilterModule: module('TextFilterModule'),
            TooltipModule: module('TooltipModule'),
            ValidationModule: module('ValidationModule'),
        },
    }
})

vi.mock('ag-grid-community', () => ({
    ModuleRegistry: {
        registerModules: agGridMocks.registerModules,
    },
    ...agGridMocks.modules,
    themeQuartz: {},
}))

vi.mock('ag-grid-vue3', () => ({
    AgGridVue: defineComponent({
        name: 'AgGridVue',
        inheritAttrs: false,
        props: {
            columnDefs: Array,
            defaultColDef: Object,
        },
        emits: [
            'grid-ready',
            'cell-clicked',
            'row-data-updated',
            'filter-changed',
            'column-resized',
            'column-moved',
            'column-visible',
            'sort-changed',
        ],
        template: '<div class="ag-grid-vue-stub" />',
    }),
}))

import ExpenseDetailsAgGrid from '@/components/expenses/ExpenseDetailsAgGrid.vue'

function createGridApi() {
    const rows = [
        { data: { total: 12500 } },
        { data: { total: 7500 } },
    ]

    return {
        applyColumnState: vi.fn(),
        getColumnState: vi.fn(() => [{ colId: 'headerId', width: 140 }]),
        forEachNodeAfterFilter: vi.fn((callback: (row: (typeof rows)[number]) => void) => {
            rows.forEach(callback)
        }),
    }
}

describe('ExpenseDetailsAgGrid', () => {
    it('registra únicamente los módulos de producción utilizados por la grilla', () => {
        mount(ExpenseDetailsAgGrid, {
            props: { rowData: [] },
        })

        const productionRegistration = agGridMocks.registerModules.mock.calls
            .map(([modules]) => modules)
            .find((modules) => modules.includes(agGridMocks.modules.ClientSideRowModelModule))

        expect(productionRegistration).toEqual([
            agGridMocks.modules.CellStyleModule,
            agGridMocks.modules.ClientSideRowModelApiModule,
            agGridMocks.modules.ClientSideRowModelModule,
            agGridMocks.modules.ColumnApiModule,
            agGridMocks.modules.EventApiModule,
            agGridMocks.modules.NumberFilterModule,
            agGridMocks.modules.TextFilterModule,
            agGridMocks.modules.TooltipModule,
        ])
    })

    it('conserva filtros, tooltips, estilos y configuración de columnas', () => {
        const wrapper = mount(ExpenseDetailsAgGrid, {
            props: { rowData: [] },
        })
        const grid = wrapper.getComponent({ name: 'AgGridVue' })
        const defaultColDef = grid.props('defaultColDef') as Record<string, unknown>
        const columnDefs = grid.props('columnDefs') as Array<Record<string, unknown>>

        expect(defaultColDef).toMatchObject({
            sortable: true,
            filter: true,
            resizable: true,
        })
        expect(columnDefs.find(column => column.field === 'total')).toMatchObject({
            filter: 'agNumberColumnFilter',
        })
        expect(columnDefs.find(column => column.field === 'notes')).toMatchObject({
            tooltipField: 'notes',
        })
        expect(columnDefs.find(column => column.field === 'headerId')).toMatchObject({
            cellClass: expect.stringContaining('cursor-pointer'),
        })
        expect(columnDefs.find(column => column.colId === 'actions')).toMatchObject({
            pinned: 'right',
            sortable: false,
            filter: false,
        })
    })

    it('restaura y emite el estado de columnas y recalcula el resumen filtrado', async () => {
        const initialColumnState = [{ colId: 'headerId', width: 110 }]
        const wrapper = mount(ExpenseDetailsAgGrid, {
            props: {
                rowData: [],
                initialColumnState,
            },
        })
        const grid = wrapper.getComponent({ name: 'AgGridVue' })
        const api = createGridApi()

        grid.vm.$emit('grid-ready', { api })
        await wrapper.vm.$nextTick()

        expect(api.applyColumnState).toHaveBeenCalledWith({
            state: initialColumnState,
            applyOrder: true,
        })
        expect(wrapper.emitted('summary-change')?.at(-1)).toEqual([
            { totalAmount: 20000, rowCount: 2 },
        ])

        grid.vm.$emit('filter-changed', { api })
        grid.vm.$emit('column-resized', { api })
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('column-state-change')?.at(-1)).toEqual([
            [{ colId: 'headerId', width: 140 }],
        ])
        expect(api.forEachNodeAfterFilter).toHaveBeenCalled()
    })
})

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentSelector from '@/components/payments/PaymentSelector.vue'
import type { App, Bank } from '@/types/bank'
import type { DraftOrder, OrderAppPayment, OrderBankPayment } from '@/types/order'

interface DraftHarness {
    currentTabId: string
    activeBranchId: number
    banks: Bank[]
    apps: App[]
    draftOrders: Map<string, DraftOrder>
    readonly currentOrder: DraftOrder | null
    saveToLocalStorage: ReturnType<typeof vi.fn>
}

const harness = vi.hoisted(() => ({ store: {} as DraftHarness }))
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => harness.store }))

const timestamp = '2026-10-26T15:00:00.000Z'

function bank(id: number, name: string, active = true, branchId = 1): Bank {
    return { id, name, active, branchId, branchName: branchId === 1 ? 'Santander' : 'Manrique', createdAt: timestamp,
        updatedAt: timestamp, totalApps: 0, activeApps: 0, currentBalance: 0 }
}

function app(id: number, name: string, active = true): App {
    return { id, name, active, bankId: 11, bankName: 'Bancolombia', branchId: 1,
        branchName: 'Santander', createdAt: timestamp, updatedAt: timestamp,
        totalPayments: 0, unsettledPayments: 0, totalPaymentsCount: 0, unsettledPaymentsCount: 0 }
}

function bankPayment(amount: number, bankId = 11, bankName = 'Bancolombia'): OrderBankPayment {
    return { tempId: `bank-${bankId}`, bankId, bankName, amount }
}

function appPayment(amount: number): OrderAppPayment {
    return { tempId: 'app-21', appId: 21, appName: 'Rappi', bankId: 11, bankName: 'Bancolombia', amount }
}

function draft(overrides: Partial<DraftOrder> = {}): DraftOrder {
    return {
        tabId: 'one', tabName: 'Pedido 1', branchId: 1, workspaceBranchId: 1,
        type: 'delivery', customerId: 1, customerName: 'Cliente de prueba',
        customerPhone: '3000000000', guestName: 'Cliente de prueba', addressId: 1,
        addressDescription: 'Dirección de prueba', deliveryFee: 3000,
        freeDeliveryRequested: false, reservedFor: null, prepareAt: null, isLater: false,
        notes: '', orderItems: [], bankPayments: [], appPayment: null,
        subtotal: 42000, total: 45000, discountTotal: 0,
        createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
        paidInStoreCash: false, paidInStoreCashAmount: null,
        ...overrides,
    }
}

let wrapper: VueWrapper | undefined
let mountTarget: HTMLDivElement | undefined

function mountSelector(overrides: Partial<DraftOrder> = {}) {
    harness.store.draftOrders.set('one', draft(overrides))
    mountTarget = document.createElement('div')
    document.body.append(mountTarget)
    wrapper = mount(defineComponent({
        setup: () => () => h(PaymentSelector, { order: harness.store.currentOrder! }),
    }), { attachTo: mountTarget })
    return wrapper
}

function currentOrder() {
    return harness.store.currentOrder!
}

function action(view: VueWrapper, label: string) {
    return view.get(`[aria-label="${label}"]`)
}

function expectEditingSignal(view: VueWrapper, editing: boolean) {
    expect(view.findComponent(PaymentSelector).emitted('editingChanged')?.at(-1)).toEqual([editing])
}

describe('PaymentSelector compact payment flow', () => {
    beforeEach(() => {
        // Keep the real useOrderPayments composable: it replaces drafts and persists changes.
        harness.store = reactive({
            currentTabId: 'one', activeBranchId: 1,
            banks: [bank(10, 'Banco inactivo', false), bank(11, 'Bancolombia'), bank(12, 'Davivienda'), bank(13, 'Nequi')],
            apps: [app(20, 'App inactiva', false), app(21, 'Rappi'), app(22, 'DiDi Food'), app(23, 'App aliada')],
            draftOrders: new Map<string, DraftOrder>(),
            get currentOrder(): DraftOrder | null {
                return this.draftOrders.get(this.currentTabId) ?? null
            },
            saveToLocalStorage: vi.fn(),
        })
    })

    afterEach(() => {
        wrapper?.unmount()
        mountTarget?.remove()
        wrapper = undefined
        mountTarget = undefined
    })

    it('offers the first two active banks and apps in catalog order, retaining the others in More', () => {
        const view = mountSelector()
        expect(view.findAll('button[aria-label^="Agregar pago de "]').map(button => button.attributes('aria-label')))
            .toEqual(['Agregar pago de Bancolombia', 'Agregar pago de Davivienda', 'Agregar pago de Rappi', 'Agregar pago de DiDi Food'])
        expect(action(view, 'Más opciones de bancos').text()).toContain('Nequi')
        expect(action(view, 'Más opciones de aplicaciones').text()).toContain('App aliada')
        expect(view.text()).not.toContain('Banco inactivo')
        expect(view.text()).not.toContain('App inactiva')
    })

    it('assigns the remainder only once on rapid bank clicks and restores choices on removal', async () => {
        const view = mountSelector({ appPayment: appPayment(12000) })
        const shortcut = action(view, 'Agregar pago de Bancolombia')
        await Promise.all([shortcut.trigger('click'), shortcut.trigger('click')])

        expect(currentOrder().bankPayments).toEqual([expect.objectContaining({ bankId: 11, amount: 33000 })])
        expect(view.find('input').exists()).toBe(false)
        expectEditingSignal(view, false)
        expect(view.find('[aria-label="Agregar pago de Davivienda"]').exists()).toBe(false)
        expect(action(view, 'Editar pago de Bancolombia').exists()).toBe(true)
        expect(view.text()).toContain('33.000')
        expect(harness.store.saveToLocalStorage).toHaveBeenCalledTimes(1)

        await action(view, 'Quitar pago de Bancolombia').trigger('click')
        expect(currentOrder().bankPayments).toEqual([])
        expect(currentOrder().appPayment?.amount).toBe(12000)
        expect(action(view, 'Agregar pago de Bancolombia').exists()).toBe(true)
    })

    it('adds one app automatically, edits it in its section, and keeps app choices hidden with a partial payment', async () => {
        const view = mountSelector({ bankPayments: [bankPayment(15000)] })
        await action(view, 'Agregar pago de Rappi').trigger('click')
        expect(currentOrder().appPayment).toMatchObject({ appId: 21, amount: 30000 })
        expect(view.find('input').exists()).toBe(false)
        expect(view.find('[aria-label="Agregar pago de DiDi Food"]').exists()).toBe(false)

        const section = action(view, 'Editar pago de Rappi').element.closest('section')
        expect(section?.getAttribute('aria-label')).toBe('Aplicaciones')
        await action(view, 'Editar pago de Rappi').trigger('click')
        expectEditingSignal(view, true)
        expect(action(view, 'Monto de Rappi').element.closest('section')).toBe(section)
        await action(view, 'Monto de Rappi').setValue('10000')
        await action(view, 'Guardar pago de Rappi').trigger('click')
        expectEditingSignal(view, false)
        expect(currentOrder().appPayment).toMatchObject({ appId: 21, amount: 10000, manuallyEdited: true })
        expect(view.find('[aria-label="Agregar pago de DiDi Food"]').exists()).toBe(false)
        expect(view.find('[aria-label="Más opciones de aplicaciones"]').exists()).toBe(false)

        await action(view, 'Quitar pago de Rappi').trigger('click')
        expect(currentOrder().appPayment).toBeNull()
        expect(action(view, 'Agregar pago de Rappi').exists()).toBe(true)
    })

    it('cancels unsaved bank edits without removing the payment, then adds another bank for the remainder', async () => {
        const view = mountSelector()
        await action(view, 'Agregar pago de Bancolombia').trigger('click')
        const section = action(view, 'Editar pago de Bancolombia').element.closest('section')
        expect(section?.getAttribute('aria-label')).toBe('Bancos')
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        expectEditingSignal(view, true)
        expect(action(view, 'Monto de Bancolombia').element.closest('section')).toBe(section)
        await action(view, 'Monto de Bancolombia').setValue('5000')
        await action(view, 'Cancelar edición de Bancolombia').trigger('click')
        expectEditingSignal(view, false)
        expect(currentOrder().bankPayments[0]?.amount).toBe(45000)
        expect(view.find('input').exists()).toBe(false)

        await action(view, 'Editar pago de Bancolombia').trigger('click')
        await action(view, 'Monto de Bancolombia').setValue('20000')
        await action(view, 'Guardar pago de Bancolombia').trigger('click')
        expectEditingSignal(view, false)
        await action(view, 'Agregar otro banco').trigger('click')
        await action(view, 'Agregar pago de Davivienda').trigger('click')

        expect(currentOrder().bankPayments.map(payment => [payment.bankName, payment.amount]))
            .toEqual([['Bancolombia', 20000], ['Davivienda', 25000]])
        expect(action(view, 'Editar pago de Bancolombia').exists()).toBe(true)
        expect(action(view, 'Editar pago de Davivienda').exists()).toBe(true)
        expect(view.find('[aria-label="Agregar pago de Bancolombia"]').exists()).toBe(false)
        expect(view.find('input').exists()).toBe(false)
        expect(action(view, 'Agregar otro banco').attributes('disabled')).toBeDefined()
    })

    it('selects less frequent banks and apps from More with the same automatic balance behavior', async () => {
        const view = mountSelector()
        await action(view, 'Más opciones de bancos').setValue('13')
        expect(currentOrder().bankPayments).toEqual([expect.objectContaining({ bankId: 13, bankName: 'Nequi', amount: 45000 })])
        expect(view.find('input').exists()).toBe(false)

        await action(view, 'Editar pago de Nequi').trigger('click')
        await action(view, 'Monto de Nequi').setValue('25000')
        await action(view, 'Guardar pago de Nequi').trigger('click')
        await action(view, 'Más opciones de aplicaciones').setValue('23')
        expect(currentOrder().appPayment).toMatchObject({ appId: 23, appName: 'App aliada', amount: 20000 })
        expect(view.find('input').exists()).toBe(false)
    })

    it('rejects empty, nonpositive, and excessive amounts without changing the saved payment', async () => {
        const view = mountSelector({ bankPayments: [bankPayment(10000)], appPayment: appPayment(20000) })
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        expectEditingSignal(view, true)

        for (const invalid of ['', '0', '-1', '26000']) {
            await action(view, 'Monto de Bancolombia').setValue(invalid)
            await action(view, 'Guardar pago de Bancolombia').trigger('click')
            expect(currentOrder().bankPayments[0]?.amount).toBe(10000)
            expect(action(view, 'Monto de Bancolombia').exists()).toBe(true)
            expectEditingSignal(view, true)
        }
        expect(harness.store.saveToLocalStorage).not.toHaveBeenCalled()
    })

    it('clears pending edits and additional-bank choices when switching order tabs', async () => {
        const view = mountSelector({ bankPayments: [bankPayment(10000)] })
        harness.store.draftOrders.set('two', draft({ tabId: 'two', bankPayments: [bankPayment(5000)] }))
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        expectEditingSignal(view, true)
        await action(view, 'Monto de Bancolombia').setValue('9000')

        harness.store.currentTabId = 'two'
        await flushPromises()
        expect(view.find('input').exists()).toBe(false)
        expectEditingSignal(view, false)
        expect(currentOrder().bankPayments[0]?.amount).toBe(5000)
        expect(harness.store.draftOrders.get('one')?.bankPayments[0]?.amount).toBe(10000)

        await action(view, 'Agregar otro banco').trigger('click')
        expect(action(view, 'Agregar pago de Davivienda').exists()).toBe(true)
        harness.store.currentTabId = 'one'
        await flushPromises()
        expect(view.find('[aria-label="Agregar pago de Davivienda"]').exists()).toBe(false)
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        expect((action(view, 'Monto de Bancolombia').element as HTMLInputElement).value).toBe('10000')
    })

    it('clears the editor on a branch change and rejects stale catalog actions until the new catalog arrives', async () => {
        const view = mountSelector({ bankPayments: [bankPayment(10000)] })
        const staleAppShortcut = action(view, 'Agregar pago de Rappi')
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        await action(view, 'Monto de Bancolombia').setValue('9000')

        harness.store.draftOrders.set('one', draft({ branchId: 2 }))
        await staleAppShortcut.trigger('click')
        await flushPromises()
        expect(view.find('input').exists()).toBe(false)
        expectEditingSignal(view, false)
        expect(view.find('[aria-label="Guardar pago de Bancolombia"]').exists()).toBe(false)
        expect(view.find('button[aria-label^="Agregar pago de "]').exists()).toBe(false)
        expect(currentOrder().appPayment).toBeNull()
        expect(currentOrder().bankPayments).toEqual([])

        harness.store.banks = [bank(31, 'Bancolombia Manrique', true, 2)]
        harness.store.apps = []
        await flushPromises()
        await action(view, 'Agregar pago de Bancolombia Manrique').trigger('click')
        expect(currentOrder().branchId).toBe(2)
        expect(currentOrder().bankPayments).toEqual([expect.objectContaining({ bankId: 31, amount: 45000 })])
    })
})

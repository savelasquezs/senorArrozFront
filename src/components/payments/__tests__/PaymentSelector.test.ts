import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentSelector from '@/components/payments/PaymentSelector.vue'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { useAuthStore } from '@/store/auth'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { UserRole } from '@/types/auth'
import type { App, Bank } from '@/types/bank'
import type { DraftOrder, OrderAppPayment, OrderBankPayment } from '@/types/order'

const harness = { store: {} as ReturnType<typeof useOrdersDraftsStore> }

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
        notes: '',
        orderItems: [{ tempId: 'rice', productId: 1, productName: 'Arroz familiar',
            productPrice: 42000, quantity: 1, unitPrice: 42000, discount: 0,
            subtotal: 42000, notes: '' }],
        bankPayments: [], appPayment: null,
        subtotal: 42000, total: 45000, discountTotal: 0,
        createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
        paidInStoreCash: false, paidInStoreCashAmount: null,
        ...overrides,
    }
}

let wrapper: VueWrapper | undefined
let mountTarget: HTMLDivElement | undefined
let pinia: ReturnType<typeof createPinia>

function mountSelector(overrides: Partial<DraftOrder> = {}) {
    harness.store.draftOrders.set('one', draft(overrides))
    mountTarget = document.createElement('div')
    document.body.append(mountTarget)
    wrapper = mount(defineComponent({
        setup: () => () => h(PaymentSelector, { order: harness.store.currentOrder! }),
    }), { attachTo: mountTarget, global: { plugins: [pinia] } })
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
        localStorage.clear()
        pinia = createPinia()
        setActivePinia(pinia)
        useAuthStore().user = { id: 4, name: 'Cajera', email: 'caja@example.com', phone: '',
            active: true, role: UserRole.CASHIER, branchId: 1, branchName: 'Santander' }
        // Exercise the real store and payment composable, including cash clamping and persistence.
        harness.store = useOrdersDraftsStore()
        harness.store.currentTabId = 'one'
        harness.store.banks = [bank(10, 'Banco inactivo', false), bank(11, 'Bancolombia'), bank(12, 'Davivienda'), bank(13, 'Nequi')]
        harness.store.apps = [app(20, 'App inactiva', false), app(21, 'Rappi'), app(22, 'DiDi Food'), app(23, 'App aliada')]
        vi.spyOn(harness.store, 'saveToLocalStorage')
    })

    afterEach(() => {
        wrapper?.unmount()
        mountTarget?.remove()
        wrapper = undefined
        mountTarget = undefined
        vi.restoreAllMocks()
    })

    it('offers the first two active banks and apps in catalog order, retaining the others in More', () => {
        const view = mountSelector()
        expect(view.findAll('section[aria-label="Bancos"] button[aria-label^="Agregar pago de "], section[aria-label="Aplicaciones"] button[aria-label^="Agregar pago de "]').map(button => button.attributes('aria-label')))
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

    it('records cash in one click, then edits, cancels, and removes it through the real store', async () => {
        const view = mountSelector()
        const cashSection = view.get('section[aria-label="Efectivo en tienda"]')
        const updateCash = vi.spyOn(harness.store, 'updatePaidInStoreCash')
        expect(cashSection.text()).toBe('Efectivo')
        expect(cashSection.find('input').exists()).toBe(false)

        const shortcut = action(view, 'Agregar pago de Efectivo')
        await Promise.all([shortcut.trigger('click'), shortcut.trigger('click')])
        expect(updateCash).toHaveBeenCalledExactlyOnceWith({ paidInStoreCash: true, paidInStoreCashAmount: 45000 })
        expect(currentOrder()).toMatchObject({ paidInStoreCash: true, paidInStoreCashAmount: 45000 })
        expect(cashSection.text()).toContain('45.000')
        expect(view.find('input').exists()).toBe(false)
        expect(view.find('[aria-label="Agregar pago de Efectivo"]').exists()).toBe(false)
        expectEditingSignal(view, false)

        await action(view, 'Editar pago de Efectivo').trigger('click')
        expectEditingSignal(view, true)
        expect(action(view, 'Monto de Efectivo').element.closest('section')).toBe(cashSection.element)
        await action(view, 'Monto de Efectivo').setValue('20000')
        await action(view, 'Cancelar edición de Efectivo').trigger('click')
        expect(currentOrder().paidInStoreCashAmount).toBe(45000)
        expect(view.find('input').exists()).toBe(false)
        expectEditingSignal(view, false)

        await action(view, 'Editar pago de Efectivo').trigger('click')
        await action(view, 'Monto de Efectivo').setValue('20000')
        await action(view, 'Guardar pago de Efectivo').trigger('click')
        expect(currentOrder()).toMatchObject({ paidInStoreCash: true, paidInStoreCashAmount: 20000 })
        expectEditingSignal(view, false)
        const persisted = JSON.parse(localStorage.getItem('senor-arroz-draft-orders')!)
        expect(persisted.draftOrders[0]).toMatchObject({ paidInStoreCash: true, paidInStoreCashAmount: 20000 })

        await action(view, 'Quitar pago de Efectivo').trigger('click')
        expect(currentOrder()).toMatchObject({ paidInStoreCash: false, paidInStoreCashAmount: null })
        expect(action(view, 'Agregar pago de Efectivo').exists()).toBe(true)
        expect(view.find('[aria-label="Editar pago de Efectivo"]').exists()).toBe(false)
    })

    it('adds cash for the remainder after a partial bank payment and preserves both in the submission DTO', async () => {
        const view = mountSelector()
        await action(view, 'Agregar pago de Bancolombia').trigger('click')
        await action(view, 'Editar pago de Bancolombia').trigger('click')
        await action(view, 'Monto de Bancolombia').setValue('15000')
        await action(view, 'Guardar pago de Bancolombia').trigger('click')
        await action(view, 'Agregar pago de Efectivo').trigger('click')

        expect(currentOrder()).toMatchObject({
            bankPayments: [{ bankId: 11, amount: 15000 }],
            paidInStoreCash: true, paidInStoreCashAmount: 30000,
        })
        expect(view.find('input').exists()).toBe(false)
        expect(action(view, 'Agregar pago de Rappi').attributes('disabled')).toBeDefined()
        const { transformDraftToCreateDto } = useOrderSubmission()
        expect(transformDraftToCreateDto(currentOrder())).toMatchObject({
            bankPayments: [{ bankId: 11, amount: 15000 }],
            paidInStoreCash: true, paidInStoreCashAmount: 30000,
        })

        await action(view, 'Quitar pago de Efectivo').trigger('click')
        expect(currentOrder().bankPayments).toEqual([expect.objectContaining({ bankId: 11, amount: 15000 })])
        expect(transformDraftToCreateDto(currentOrder())).toMatchObject({ paidInStoreCash: false })
        expect(transformDraftToCreateDto(currentOrder()).paidInStoreCashAmount).toBeUndefined()
    })

    it.each([
        { name: 'Bancolombia', draftPayment: { bankPayments: [{ bankId: 11, amount: 25000 }] }, dtoPayment: { bankPayments: [{ bankId: 11, amount: 25000 }] } },
        { name: 'Rappi', draftPayment: { appPayment: { appId: 21, amount: 25000 } }, dtoPayment: { appPayments: [{ appId: 21, amount: 25000 }] } },
    ])('keeps a cash deposit when adding $name and recalculating products', async ({ name, draftPayment, dtoPayment }) => {
        const view = mountSelector()
        await action(view, 'Agregar pago de Efectivo').trigger('click')
        await action(view, 'Editar pago de Efectivo').trigger('click')
        await action(view, 'Monto de Efectivo').setValue('20000')
        await action(view, 'Guardar pago de Efectivo').trigger('click')
        await action(view, `Agregar pago de ${name}`).trigger('click')
        expect(currentOrder()).toMatchObject({
            ...draftPayment, paidInStoreCash: true, paidInStoreCashAmount: 20000,
        })

        // A real product-price change must leave both recorded amounts intact.
        harness.store.recalculateTotals({
            ...currentOrder(),
            orderItems: currentOrder().orderItems.map(item => ({ ...item, productPrice: 52000, unitPrice: 52000 })),
        })
        await flushPromises()
        expect(currentOrder()).toMatchObject({
            ...draftPayment, total: 55000, paidInStoreCash: true, paidInStoreCashAmount: 20000,
        })
        const { transformDraftToCreateDto } = useOrderSubmission()
        expect(transformDraftToCreateDto(currentOrder())).toMatchObject({
            ...dtoPayment, paidInStoreCash: true, paidInStoreCashAmount: 20000,
        })
    })

    it('limits cash and noncash edits by all other recorded payments and keeps invalid edits pending', async () => {
        const view = mountSelector({
            bankPayments: [bankPayment(15000)], appPayment: appPayment(10000),
            paidInStoreCash: true, paidInStoreCashAmount: 12000,
        })
        await action(view, 'Editar pago de Efectivo').trigger('click')
        for (const invalid of ['', '0', '-1', '0.5', '20001']) {
            await action(view, 'Monto de Efectivo').setValue(invalid)
            await action(view, 'Guardar pago de Efectivo').trigger('click')
            expect(currentOrder().paidInStoreCashAmount).toBe(12000)
            expect(action(view, 'Monto de Efectivo').exists()).toBe(true)
            expectEditingSignal(view, true)
        }
        await action(view, 'Monto de Efectivo').setValue('20000')
        await action(view, 'Guardar pago de Efectivo').trigger('click')
        expect(currentOrder().paidInStoreCashAmount).toBe(20000)
        expectEditingSignal(view, false)

        for (const [name, excessiveAmount] of [['Bancolombia', '15001'], ['Rappi', '10001']]) {
            await action(view, `Editar pago de ${name}`).trigger('click')
            await action(view, `Monto de ${name}`).setValue(excessiveAmount)
            await action(view, `Guardar pago de ${name}`).trigger('click')
            expect(currentOrder()).toMatchObject({
                bankPayments: [{ amount: 15000 }], appPayment: { amount: 10000 },
                paidInStoreCash: true, paidInStoreCashAmount: 20000,
            })
            expectEditingSignal(view, true)
            await action(view, `Cancelar edición de ${name}`).trigger('click')
            expectEditingSignal(view, false)
        }
    })

    it('closes the cash editor when recalculating the total removes the cash payment', async () => {
        const view = mountSelector({
            bankPayments: [bankPayment(30000)], paidInStoreCash: true, paidInStoreCashAmount: 15000,
        })
        await action(view, 'Editar pago de Efectivo').trigger('click')
        expectEditingSignal(view, true)

        harness.store.recalculateTotals({
            ...currentOrder(),
            orderItems: currentOrder().orderItems.map(item => ({ ...item, productPrice: 27000, unitPrice: 27000 })),
        })
        await flushPromises()

        expect(currentOrder()).toMatchObject({
            total: 30000, bankPayments: [{ amount: 30000 }],
            paidInStoreCash: false, paidInStoreCashAmount: null,
        })
        expect(view.find('input').exists()).toBe(false)
        expect(view.find('[aria-label="Guardar pago de Efectivo"]').exists()).toBe(false)
        expectEditingSignal(view, false)
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
        expect(view.find('section[aria-label="Bancos"] button[aria-label^="Agregar pago de "], section[aria-label="Aplicaciones"] button[aria-label^="Agregar pago de "]').exists()).toBe(false)
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

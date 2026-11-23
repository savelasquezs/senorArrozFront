import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WhatsAppOrderQuickActions from '../WhatsAppOrderQuickActions.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/store/auth'
import { useWhatsAppTheme } from '@/composables/useWhatsAppTheme'
import { UserRole } from '@/types/auth'
import type { OrderBankPaymentDetail, OrderDetailView } from '@/types/order'

const api = vi.hoisted(() => ({ fetchDetail: vi.fn(), options: vi.fn(), createBankPayment: vi.fn(),
  updateBankPayment: vi.fn(), deletePayment: vi.fn(), verifyBankPayment: vi.fn(), unverifyBankPayment: vi.fn() }))
const events = vi.hoisted(() => ({ changed: (_event: any) => {}, refresh: () => {}, conflict: (_id: number) => {} }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: api }))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: api }))
vi.mock('@/services/MainAPI/bankPaymentApi', () => ({ bankPaymentApi: api }))
vi.mock('@/composables/useOrderManagementUpdates', async () => {
  const { ref } = await import('vue')
  return { useOrderManagementUpdates: (changed: any, refresh: any, conflict: any) => {
    Object.assign(events, { changed, refresh, conflict })
    return { isOnline: ref(true), isPageVisible: ref(true) }
  } }
})

let current: OrderDetailView
let pinia: ReturnType<typeof createPinia>
let wrapper: VueWrapper | undefined
const bank = (id: number, name: string) => ({ id, name, branchId: 2, active: true, type: 'bank' })
const payment = (amount = 10000): OrderBankPaymentDetail => ({ id: 91, orderId: 501, bankId: 11,
  bankName: 'Bancolombia', branchId: 2, branchName: 'Destino', amount, isVerified: false, verifiedAt: null })
const dialog = { props: ['modelValue', 'title'], emits: ['update:modelValue'],
  template: '<section v-if="modelValue" role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>' }

beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = { id: 7, role: UserRole.CASHIER, branchId: 1 } as any
  current = { id: 501, branchId: 2, branchName: 'Destino', managementVersion: 4, status: 'taken', type: 'delivery',
    total: 53000, createdAt: new Date().toISOString(), statusTimes: {}, bankPayments: [], appPayments: [],
    orderDetails: [], paidInStoreCash: false } as unknown as OrderDetailView
  api.fetchDetail.mockImplementation(async () => structuredClone(current))
  api.options.mockResolvedValue({ branchId: 2, banks: [bank(12, 'Nequi'), bank(11, 'Bancolombia'),
    { ...bank(10, 'Inactivo'), active: false }, bank(13, 'Otro banco')] })
  api.createBankPayment.mockImplementation(async ({ bankId, amount }) => {
    const created = { ...payment(amount), bankId, bankName: bankId === 12 ? 'Nequi' : 'Bancolombia' }
    current.bankPayments.push(created); current.managementVersion!++
    return created
  })
  api.updateBankPayment.mockImplementation(async (_id, amount) => {
    current.bankPayments[0]!.amount = amount; current.managementVersion!++
    return current.bankPayments[0]
  })
  api.deletePayment.mockImplementation(async () => { current.bankPayments = []; current.managementVersion!++ })
  api.verifyBankPayment.mockImplementation(async () => { current.bankPayments[0]!.isVerified = true; current.managementVersion!++ })
  api.unverifyBankPayment.mockImplementation(async () => { current.bankPayments[0]!.isVerified = false; current.managementVersion!++ })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; document.body.innerHTML = ''; vi.useRealTimers() })

async function render(dark = false, routeId?: number) {
  wrapper = mount(defineComponent({ props: ['active', 'orderId'], setup(props) {
    const { setTheme } = useWhatsAppTheme(() => 7)
    if (dark) setTheme('dark')
    return () => h(WhatsAppOrderQuickActions, { orderId: props.orderId, active: props.active, routeId,
      initialStatus: routeId == null ? undefined : 'on_the_way' })
  } }), { props: { active: true, orderId: 501 }, attachTo: document.body, global: { plugins: [pinia], stubs: { BaseDialog: dialog,
    OrderTrackingDialog: { props: ['modelValue', 'order'], template: '<div v-if="modelValue" data-test="tracking">{{ order.id }}</div>' } } } })
  await flushPromises()
  return wrapper.getComponent(WhatsAppOrderQuickActions)
}
function buttons() { return Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')) }
async function click(text: string) {
  const el = buttons().find(item => item.textContent?.trim() === text)
  expect(el, text).toBeDefined(); el!.click(); await flushPromises()
}
async function title(text: string) {
  const el = document.body.querySelector<HTMLButtonElement>(`[title="${text}"]`)
  expect(el, text).not.toBeNull(); el!.click(); await flushPromises()
}
async function open() {
  document.querySelector<HTMLButtonElement>('[aria-label="Acciones rápidas del pedido 501"]')!.click()
  await flushPromises()
}
const region = () => document.querySelector<HTMLElement>('[role="region"]')

it('shows the live status and keeps the main button opening the order detail', async () => {
  const view = await render()
  expect(view.text()).toContain('Tomado')
  await click('Gestionar pedido #501')
  expect(view.emitted('manage')).toHaveLength(1)
  expect(region()).toBeNull()
})

it('uses route status before opening and only loads bank actions on demand', async () => {
  current.status = 'on_the_way'
  current.deliveryRouteId = 99
  const view = await render(false, 17)
  expect(view.text()).toContain('En camino')
  expect(api.fetchDetail).not.toHaveBeenCalled()
  expect(api.options).not.toHaveBeenCalled()
  await open()
  expect(api.options).toHaveBeenCalledExactlyOnceWith(501)
  expect(region()!.textContent).not.toContain('Ver ubicación')
  await click('Hablar con el cliente')
  expect(view.emitted('contact-customer')).toHaveLength(1)
  expect(region()).toBeNull()
})

it.each([false, true])('opens on hover in the selected theme (dark=%s) without clipping the panel', async dark => {
  const view = await render(dark)
  await view.get('[data-test="order-actions-trigger"]').trigger('mouseenter')
  await flushPromises()
  expect(region()).not.toBeNull()
  expect(region()!.parentElement).toBe(document.body)
  expect(region()!.dataset.waTheme).toBe(dark ? 'dark' : 'light')
  expect(region()!.style.maxHeight).not.toBe('')
  expect(region()!.textContent).toContain('Total')
  expect(region()!.textContent).toContain('Saldo pendiente')
})

it('supports the touch toggle, keyboard opening, Escape and clicking outside', async () => {
  const view = await render()
  await open()
  expect(region()).not.toBeNull()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await flushPromises()
  expect(region()).toBeNull()
  expect(document.activeElement?.getAttribute('aria-expanded')).toBe('false')
  await view.get('[aria-label="Acciones rápidas del pedido 501"]').trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
  expect(region()!.contains(document.activeElement)).toBe(true)
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  await flushPromises()
  expect(region()).toBeNull()
})

it('keeps the menu open when a desktop click follows pointer entry on the toggle', async () => {
  const view = await render()
  await view.get('[data-test="order-actions-trigger"]').trigger('mouseenter')
  await open()
  expect(region()).not.toBeNull()
  await open()
  expect(region()).toBeNull()
})

it('keeps payments unavailable until a failed detail read is retried successfully', async () => {
  api.fetchDetail.mockRejectedValueOnce(new Error('No se pudo consultar el pedido'))
  const view = await render(); await open()
  expect(view.text()).toContain('Estado no disponible')
  expect(region()!.textContent).toContain('No se pudo consultar el pedido')
  expect(region()!.textContent).not.toContain('Transferencia a')
  await click('Reintentar')
  expect(view.text()).toContain('Tomado')
  expect(region()!.textContent).toContain('Transferencia a Nequi')
})

it('uses the destination banks in /orders order and creates one transfer for the balance', async () => {
  await render(); await open()
  expect(region()!.textContent).not.toContain('Otro banco')
  expect(region()!.textContent).not.toContain('Inactivo')
  const actions = Array.from(region()!.querySelectorAll<HTMLButtonElement>('button')).filter(b => b.textContent?.includes('Transferencia a'))
  expect(actions.map(b => b.textContent)).toEqual([expect.stringContaining('Bancolombia'), expect.stringContaining('Nequi')])
  let finish!: () => void
  api.createBankPayment.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  actions[0]!.click(); actions[0]!.click()
  await flushPromises()
  expect(api.createBankPayment).toHaveBeenCalledExactlyOnceWith({ orderId: 501, bankId: 11, amount: 53000 },
    expect.objectContaining({ branchId: 2, managementVersion: 4 }))
  current.bankPayments = [payment(53000)]; finish()
  await flushPromises()
  expect(region()!.textContent).not.toContain('Transferencia a')
  expect(region()!.textContent).toContain('Bancolombia')
})

it('deducts existing bank payments, apps and reservation deposits from the new transfer', async () => {
  current.bankPayments = [payment()]
  current.appPayments = [{ id: 92, amount: 5000 }] as any
  current.reservationDeposits = [{ id: 93, amount: 8000, isEffective: true }] as any
  await render(); await open()
  const action = buttons().find(b => b.textContent?.includes('Transferencia a Nequi'))!
  action.click(); await flushPromises()
  expect(api.createBankPayment).toHaveBeenCalledWith({ orderId: 501, bankId: 12, amount: 30000 }, expect.anything())
})

it('edits a transfer with amount validation and recalculates the balance', async () => {
  current.bankPayments = [payment()]
  await render(); await open(); await title('Editar monto')
  const input = wrapper!.get('input')
  wrapper!.getComponent(BaseInput).vm.$emit('update:modelValue', 60000)
  await flushPromises(); await click('Guardar')
  expect(api.updateBankPayment).not.toHaveBeenCalled()
  await input.setValue('15000'); await click('Guardar')
  expect(api.updateBankPayment).toHaveBeenCalledWith(91, 15000, expect.objectContaining({ managementVersion: 4 }))
  expect(wrapper!.find('[role="dialog"]').exists()).toBe(false)
  await open()
  expect(region()!.textContent).toContain('15.000')
  expect(region()!.textContent).toContain('38.000')
})

it('requires confirmation before deleting a transfer', async () => {
  current.bankPayments = [payment()]
  await render(); await open(); await title('Eliminar pago')
  expect(api.deletePayment).not.toHaveBeenCalled()
  await click('Cancelar')
  expect(api.deletePayment).not.toHaveBeenCalled()
  await open(); await title('Eliminar pago'); await click('Eliminar')
  expect(api.deletePayment).toHaveBeenCalledWith(91, expect.objectContaining({ id: 501 }))
  await open()
  expect(document.querySelector('[title="Eliminar pago"]')).toBeNull()
})

it('reuses the verification controls and refreshes their state', async () => {
  current.bankPayments = [payment()]
  await render(); await open(); await title('Verificar pago')
  expect(api.verifyBankPayment).toHaveBeenCalledWith(91, undefined, expect.objectContaining({ managementVersion: 4 }))
  await title('Desverificar pago')
  expect(api.unverifyBankPayment).toHaveBeenCalledWith(91, expect.objectContaining({ managementVersion: 5 }))
})

it.each(['paid', 'cancelled', 'rappi', 'no-permission', 'old'] as const)('hides new transfers for %s orders', async kind => {
  if (kind === 'paid') current.paidInStoreCash = true
  if (kind === 'cancelled') current.status = 'cancelled'
  if (kind === 'rappi') current.externalFulfillmentProvider = 'rappi'
  if (kind === 'no-permission') useAuthStore().user!.role = UserRole.KITCHEN
  if (kind === 'old') current.createdAt = '2020-01-01T12:00:00Z'
  await render(); await open()
  expect(region()!.textContent).not.toContain('Transferencia a')
})

it('keeps foreign-branch payments read-only', async () => {
  current.bankPayments = [{ ...payment(), branchId: 1 }]
  await render(); await open()
  expect(document.querySelector('[title="Editar monto"]')).toBeNull()
  expect(document.querySelector('[title="Eliminar pago"]')).toBeNull()
  expect(document.querySelector('[title="Verificar pago"]')).toBeNull()
})

it('refreshes status from realtime and opens tracking only for a delivery on the way', async () => {
  const view = await render(); await open()
  expect(region()!.textContent).not.toContain('Ver ubicación')
  current.status = 'on_the_way'; current.managementVersion = 5
  events.changed({ orderId: 999 }); await flushPromises()
  expect(api.fetchDetail).toHaveBeenCalledTimes(1)
  events.changed({ orderId: 501 }); await flushPromises()
  expect(view.text()).toContain('En camino')
  await click('Ver ubicación')
  expect(view.get('[data-test="tracking"]').text()).toBe('501')
  expect(region()).toBeNull()
})

it('requires reviewing an edit when the order version changed', async () => {
  current.bankPayments = [payment()]
  await render(); await open(); await title('Editar monto')
  current.bankPayments[0]!.amount = 20000; current.managementVersion = 5
  events.changed({ orderId: 501 }); await flushPromises()
  await wrapper!.get('input').setValue('25000'); await click('Guardar')
  expect(api.updateBankPayment).not.toHaveBeenCalled()
  expect(wrapper!.text()).toContain('El pedido cambió')
  await click('Recargar y revisar')
  expect((wrapper!.get('input').element as HTMLInputElement).value).toBe('20000')
  await wrapper!.get('input').setValue('25000'); await click('Guardar')
  expect(api.updateBankPayment).toHaveBeenCalledWith(91, 25000, expect.objectContaining({ managementVersion: 5 }))
})

it('reconciles an uncertain payment response before allowing a retry', async () => {
  await render(); await open()
  api.createBankPayment.mockImplementationOnce(async () => {
    current.bankPayments = [payment(53000)]
    events.conflict(501)
    throw new Error('La respuesta no pudo confirmarse')
  })
  buttons().find(b => b.textContent?.includes('Transferencia a Nequi'))!.click()
  await flushPromises()
  expect(region()!.textContent).toContain('La respuesta no pudo confirmarse')
  expect(region()!.textContent).not.toContain('Transferencia a')
})

it('closes overlays and ignores reads and realtime refreshes while inactive', async () => {
  const view = await render(); await open()
  let finish!: (value: OrderDetailView) => void
  api.fetchDetail.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  events.refresh(); await flushPromises()
  await wrapper!.setProps({ active: false })
  finish({ ...current, status: 'ready' }); await flushPromises()
  expect(region()).toBeNull()
  const count = api.fetchDetail.mock.calls.length
  events.refresh(); events.changed({ orderId: 501 }); await flushPromises()
  expect(api.fetchDetail).toHaveBeenCalledTimes(count)
  current.status = 'delivered'
  await wrapper!.setProps({ active: true }); await flushPromises()
  expect(view.text()).toContain('Entregado')
})

it('reconciles a write that finishes after returning to the same cached chat', async () => {
  await render(); await open()
  let finish!: () => void
  api.createBankPayment.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  buttons().find(b => b.textContent?.includes('Transferencia a Nequi'))!.click()
  await flushPromises()
  await wrapper!.setProps({ active: false })
  await wrapper!.setProps({ active: true }); await flushPromises()
  current.bankPayments = [payment(53000)]; current.managementVersion = 5
  finish(); await flushPromises()
  await open()
  expect(region()!.textContent).not.toContain('Transferencia a')
  expect(region()!.textContent).toContain('53.000')
})

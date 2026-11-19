import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, KeepAlive, onMounted, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWhatsAppCommercialDraft } from '../useWhatsAppCommercialDraft'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useBranchContextStore } from '@/store/branchContext'
import { createOrderDraft } from '@/helpers/orderDraft'
import type { WhatsAppCommercialDraft, WhatsAppConversation, WhatsAppProductSuggestion } from '@/types/whatsapp'

const api = vi.hoisted(() => ({ getCommercialDraft: vi.fn(), startCommercialDraft: vi.fn(), saveCommercialDraft: vi.fn(), commercialDraftAction: vi.fn(), sendCommercialAddressChoices: vi.fn(), sendCommercialProductChoices: vi.fn(), getProductSuggestions: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
vi.mock('@/store/products', () => ({ useProductsStore: () => ({ catalogProducts: [], ensureCatalogLoaded: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 7 }, branchId: 1 }) }))
vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: { getCustomerById: vi.fn() } }))

function session(id: number): WhatsAppCommercialDraft {
  return { sessionId: id, attemptId: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`, conversationId: id,
    version: 1, status: 'active', commercialStatus: 'in_progress', editor: null, orderId: null, checkoutId: null,
    confirmationStatus: null, confirmationError: null, internalNotes: [],
    order: { branchId: 2, takenById: 7, type: 'onsite', status: 'taken', guestName: 'Recoge',
      orderDetails: [{ productId: 31, quantity: 1, unitPrice: 10000, discount: 0 }] } }
}
let pinia: ReturnType<typeof createPinia>
const wrappers: ReturnType<typeof mount>[] = []
function render(id: number, initialRead?: Promise<WhatsAppCommercialDraft | null | undefined>) {
  const conversation = ref({ id, branchId: 1, operationalBranchId: 1, attentionMode: 'human', assignedUserId: 7,
    attentionRevision: 4 } as WhatsAppConversation)
  let model!: ReturnType<typeof useWhatsAppCommercialDraft>
  const wrapper = mount(defineComponent({ setup() { model = useWhatsAppCommercialDraft(conversation, initialRead); return () => h('div') } }), { global: { plugins: [pinia] } })
  wrappers.push(wrapper)
  vi.spyOn(model.editor, 'loadOperationalContext').mockResolvedValue(undefined)
  return { model, wrapper, conversation }
}

describe('shared commercial draft editor', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia)
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getCommercialDraft.mockImplementation(async (id: number) => ({ data: session(id) }))
    api.saveCommercialDraft.mockImplementation(async (id: number, request: any) => ({ data: { ...session(id), version: request.expectedVersion + 1 } }))
  })
  afterEach(async () => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    await flushPromises()
    vi.useRealTimers()
  })

  const riceSuggestion: WhatsAppProductSuggestion = { kind: 'add', productId: 31, name: 'Ropa vieja Súper con chicharrón',
    quantity: 2, unitPrice: 10000, available: true, reply: null }
  const verifiedSuggestion = (option: WhatsAppProductSuggestion, branchId = 2) => ({
    data: { branchId, messages: [{ messageId: 90, suggestions: [option] }] },
  })

  it('starts a first draft and saves a double-clicked suggestion once, retaining the marker on reload', async () => {
    api.getCommercialDraft.mockResolvedValueOnce({ data: null })
    api.getProductSuggestions.mockResolvedValue(verifiedSuggestion(riceSuggestion))
    api.saveCommercialDraft.mockImplementationOnce(async (_id, request) => {
      const saved = { ...session(8801), order: request.order, editor: request.editor, version: 2 }
      api.getCommercialDraft.mockResolvedValue({ data: saved })
      return { data: saved }
    })
    const { model } = render(8801)
    api.startCommercialDraft.mockImplementationOnce(async () => {
      await model.reconcile(true)
      return { data: session(8801) }
    })
    await model.load()
    await Promise.all([
      model.addProductSuggestion(90, riceSuggestion, () => true),
      model.addProductSuggestion(90, riceSuggestion, () => true),
    ])
    expect(api.startCommercialDraft).toHaveBeenCalledTimes(1)
    expect(api.getProductSuggestions).toHaveBeenCalledExactlyOnceWith(8801, [90])
    expect(api.saveCommercialDraft).toHaveBeenCalledExactlyOnceWith(8801, expect.objectContaining({
      order: expect.objectContaining({ branchId: 2, orderDetails: [
        expect.objectContaining({ productId: 31, quantity: 1 }),
        expect.objectContaining({ productId: 31, quantity: 2, unitPrice: 10000, whatsAppSuggestionMessageId: 90 }),
      ] }),
    }))
    await model.load(true)
    await model.addProductSuggestion(90, riceSuggestion, () => true)
    expect(api.saveCommercialDraft).toHaveBeenCalledTimes(1)
  })

  it.each([
    [verifiedSuggestion({ ...riceSuggestion, unitPrice: 11000 }), 'precio cambió'],
    [verifiedSuggestion({ ...riceSuggestion, available: false }), 'inventario suficiente'],
    [verifiedSuggestion(riceSuggestion, 1), 'precio cambió'],
  ])('skips an outdated suggestion before editing the draft', async (response, error) => {
    const { model } = render(8802)
    await model.load()
    api.getProductSuggestions.mockResolvedValue(response)
    await expect(model.addProductSuggestion(90, riceSuggestion, () => true)).rejects.toThrow(error)
    expect(model.draft.value?.orderItems).toHaveLength(1)
    expect(api.saveCommercialDraft).not.toHaveBeenCalled()
  })

  it('requires a new attempt after a previous order has ended', async () => {
    api.getCommercialDraft.mockResolvedValue({ data: { ...session(8803), status: 'completed', orderId: 79 } })
    const { model } = render(8803)
    await model.load()
    await model.addProductSuggestion(90, riceSuggestion, () => true)
    expect(api.startCommercialDraft).not.toHaveBeenCalled()
    expect(api.getProductSuggestions).not.toHaveBeenCalled()
  })

  it('reuses the order editor with explicit draft identity while preserving POS tabs and branch context', async () => {
    const pos = useOrdersDraftsStore()
    pos.draftOrders.set('pos', createOrderDraft('pos', 'POS', 1))
    pos.currentTabId = 'pos'
    const first = render(1101), second = render(1102)
    await first.model.load(); await second.model.load()
    first.model.editor.updateOrderNotes('Pedido de la primera conversación')
    first.model.editor.updatePaidInStoreCash({ paidInStoreCash: true, paidInStoreCashAmount: 1000 })
    expect(first.model.draft.value?.branchId).toBe(2)
    expect(first.conversation.value.operationalBranchId).toBe(1)
    expect(second.model.draft.value?.notes).toBe('')
    expect(second.model.draft.value?.paidInStoreCash).not.toBe(true)
    expect(pos.currentTabId).toBe('pos')
    expect(pos.currentOrder?.notes).toBe('')
    expect(pos.draftOrders.size).toBe(1)
    expect(first.model.editor.maxTabs).toBe(Number.MAX_SAFE_INTEGER)
    await first.model.flush()
    expect(api.saveCommercialDraft).toHaveBeenCalledWith(1101, expect.objectContaining({ attentionVersion: 4, expectedVersion: 1, order: expect.objectContaining({ branchId: 2, whatsappConversationId: 1101 }) }))
  })

  it('isolates cached editors by work context without changing the preparing branch', async () => {
    const context = useBranchContextStore()
    context.selectedBranchId = 1
    const first = render(2201)
    await first.model.load()
    first.model.editor.updateOrderNotes('Edición del primer contexto')
    context.selectedBranchId = 2
    const second = render(2201)
    await second.model.load()
    expect(second.model.editor.$id).not.toBe(first.model.editor.$id)
    expect(second.model.draft.value?.notes).toBe('')
    expect(second.model.draft.value?.branchId).toBe(2)
    expect(first.model.draft.value?.notes).toBe('Edición del primer contexto')
    expect(api.getCommercialDraft).toHaveBeenCalledTimes(2)
  })

  it('consumes a prefetched read once and still requests a fresh version on explicit reload', async () => {
    const first = render(2001, Promise.resolve(session(2001)))
    await first.model.load()
    expect(api.getCommercialDraft).not.toHaveBeenCalled()
    expect(first.model.draft.value?.branchId).toBe(2)
    await first.model.load(true)
    expect(api.getCommercialDraft).toHaveBeenCalledTimes(1)
  })

  it('reconciles a cached editor without rebuilding an unchanged draft or touching the POS', async () => {
    const first = render(1801)
    await first.model.load()
    const original = first.model.draft.value
    await first.model.reconcile()
    expect(first.model.draft.value).toBe(original)
    expect(api.getCommercialDraft).toHaveBeenCalledTimes(1)
    expect(first.model.editor.loadOperationalContext).toHaveBeenCalledTimes(1)
    api.getCommercialDraft.mockResolvedValueOnce({ data: { ...session(1801), version: 2, order: { ...session(1801).order, guestName: 'Cambio compartido' } } })
    await first.model.reconcile(true)
    expect(first.model.session.value?.version).toBe(2)
    expect(first.model.draft.value?.guestName).toBe('Cambio compartido')
    expect(first.model.draft.value?.branchId).toBe(2)
  })

  it.each(['message', 'save conflict'])('applies a customer address after a %s and keeps unsaved cashier changes', async (arrival) => {
    const original = session(1839)
    original.order.type = 'delivery'
    const latest = { ...original, version: 2, order: { ...original.order, addressId: 84, deliveryFee: 3500 } }
    api.getCommercialDraft.mockResolvedValueOnce({ data: original }).mockResolvedValueOnce({ data: latest })
    const { model } = render(1839)
    await model.load()
    model.editor.updateOrderNotes('Nota escrita mientras el cliente elige')
    if (arrival === 'message') await model.reconcile(true)
    else api.saveCommercialDraft.mockRejectedValueOnce(Object.assign(new Error('Borrador cambiado'), { status: 409 }))
    await model.flush()
    expect(model.draft.value).toMatchObject({ addressId: 84, deliveryFee: 3500, notes: 'Nota escrita mientras el cliente elige' })
    expect(api.saveCommercialDraft).toHaveBeenLastCalledWith(1839, expect.objectContaining({
      expectedVersion: 2, order: expect.objectContaining({ addressId: 84, deliveryFee: 3500, notes: 'Nota escrita mientras el cliente elige' }),
    }))
  })

  it('saves current draft edits before requesting address choices', async () => {
    const { model } = render(1882)
    await model.load()
    model.editor.updateOrderNotes('Cambios actuales')
    api.sendCommercialAddressChoices.mockResolvedValueOnce({ data: [] })
    await model.sendAddressChoices()
    expect(api.sendCommercialAddressChoices).toHaveBeenCalledWith(1882, { sessionId: 1882, expectedVersion: 2, attentionVersion: 4 })
  })

  it.each(['message', 'save conflict'])('keeps cashier changes when a product choice arrives after a %s', async (arrival) => {
    const original = session(1883)
    const chosen = { productId: 84, quantity: 1, unitPrice: 31000, discount: 0,
      whatsAppProductChoice: { key: 'chosen-order-product:1', name: 'Arroz Paisa Dúo' } }
    const latest = { ...original, version: 2, order: { ...original.order, orderDetails: [...original.order.orderDetails, chosen] } }
    api.getCommercialDraft.mockResolvedValueOnce({ data: original }).mockResolvedValueOnce({ data: latest })
    const { model } = render(1883)
    await model.load()
    model.editor.updateOrderNotes('Mantener nota')
    const local = model.draft.value!
    model.editor.recalculateTotals({ ...local, orderItems: local.orderItems.map(item => ({ ...item, quantity: 2, subtotal: 20000 })) })
    if (arrival === 'message') await model.reconcile(true)
    else api.saveCommercialDraft.mockRejectedValueOnce(Object.assign(new Error('Borrador cambiado'), { status: 409 }))
    await model.flush()
    expect(model.draft.value).toMatchObject({ notes: 'Mantener nota', orderItems: [
      { productId: 31, quantity: 2 }, { productId: 84, quantity: 1, unitPrice: 31000, productName: 'Arroz Paisa Dúo' },
    ] })
    expect(api.saveCommercialDraft).toHaveBeenLastCalledWith(1883, expect.objectContaining({
      expectedVersion: 2, order: expect.objectContaining({ orderDetails: [expect.objectContaining({ quantity: 2 }), expect.objectContaining(chosen)] }),
    }))
  })

  it('starts a draft before sending the selected catalog group from a new chat', async () => {
    const { model } = render(1884)
    api.getCommercialDraft.mockResolvedValueOnce({ data: null })
    api.startCommercialDraft.mockResolvedValueOnce({ data: session(1884) })
    api.sendCommercialProductChoices.mockResolvedValueOnce({ data: [] })
    await model.load()
    await model.sendProductChoices(15)
    expect(api.startCommercialDraft).toHaveBeenCalledWith(1884, { sessionId: 0, expectedVersion: 0, attentionVersion: 4 })
    expect(api.sendCommercialProductChoices).toHaveBeenCalledWith(1884, 15, { sessionId: 1884, expectedVersion: 1, attentionVersion: 4 })
  })

  it('reconciles a second shared update received while a previous read is in flight', async () => {
    const first = render(1803)
    await first.model.load()
    let resolve!: (value: unknown) => void
    api.getCommercialDraft.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    api.getCommercialDraft.mockResolvedValueOnce({ data: { ...session(1803), version: 3,
      order: { ...session(1803).order, guestName: 'Última versión compartida' } } })
    const pending = first.model.reconcile(true)
    void first.model.reconcile(true)
    resolve({ data: { ...session(1803), version: 2 } })
    await pending
    await flushPromises()
    expect(first.model.session.value?.version).toBe(3)
    expect(first.model.draft.value?.guestName).toBe('Última versión compartida')
    expect(first.model.draft.value?.branchId).toBe(2)
    expect(first.model.editable.value).toBe(true)
    expect(api.getCommercialDraft).toHaveBeenCalledTimes(3)
  })

  it('evicts clean editors beyond the eight cached conversations', async () => {
    const selected = ref(1900)
    const cached = defineComponent({ props: { id: { type: Number, required: true } }, setup(props) {
      const conversation = ref({ id: props.id, attentionMode: 'human', assignedUserId: 7, attentionRevision: 4 } as WhatsAppConversation)
      const model = useWhatsAppCommercialDraft(conversation)
      vi.spyOn(model.editor, 'loadOperationalContext').mockResolvedValue(undefined)
      onMounted(() => { void model.load() })
      return () => h('div', model.session.value?.sessionId)
    } })
    const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, { max: 8 }, { default: () => h(cached, { id: selected.value, key: selected.value }) }) }), { global: { plugins: [pinia] } })
    wrappers.push(wrapper)
    await flushPromises()
    for (let index = 1; index <= 12; index++) { selected.value = 1900 + index; await flushPromises() }
    expect([...pinia._s.keys()].filter(key => key.startsWith('order-editor:'))).toHaveLength(8)
  })

  it('a late reconciliation cannot overwrite a newly edited cached draft', async () => {
    const first = render(1802)
    await first.model.load()
    let resolve!: (value: unknown) => void
    api.getCommercialDraft.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000)
    const pending = first.model.reconcile()
    first.model.editor.updateOrderNotes('Edición durante la consulta')
    resolve({ data: { ...session(1802), version: 2 } })
    await pending
    clock.mockRestore()
    expect(first.model.draft.value?.notes).toBe('Edición durante la consulta')
    expect(first.model.session.value?.version).toBe(1)
    expect(first.model.saveState.value).toBe('pending')
  })

  it('a late save belongs to its captured conversation and cannot overwrite another draft', async () => {
    let resolve!: (value: unknown) => void
    api.saveCommercialDraft.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const first = render(1201), second = render(1202)
    await first.model.load(); await second.model.load()
    first.model.editor.updateOrderNotes('Primero')
    const pending = first.model.flush()
    second.model.editor.updateOrderNotes('Segundo')
    resolve({ data: { ...session(1201), version: 2 } })
    await pending
    expect(second.model.session.value?.conversationId).toBe(1202)
    expect(second.model.draft.value?.notes).toBe('Segundo')
    expect(first.model.saveState.value).toBe('saved')
    await second.model.flush()
  })

  it('refreshes a formerly read-only editor before enabling its new owner', async () => {
    const first = render(2101)
    first.conversation.value.assignedUserId = 8
    await first.model.load()
    first.model.draft.value!.updatedAt = new Date('2030-01-01T00:00:00Z')
    expect(first.model.saveState.value).toBe('saved')
    first.conversation.value.assignedUserId = 7
    first.conversation.value.attentionRevision++
    let resolve!: (value: unknown) => void
    api.getCommercialDraft.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const pending = first.model.reconcile(true)
    expect(first.model.editable.value).toBe(false)
    await expect(first.model.submit(first.model.draft.value!)).rejects.toThrow('Revisa el estado')
    resolve({ data: { ...session(2101), version: 4 } })
    await pending
    expect(first.model.editable.value).toBe(true)
    expect(first.model.session.value?.version).toBe(4)
    expect(first.model.draft.value?.branchId).toBe(2)
    expect(api.saveCommercialDraft).not.toHaveBeenCalled()
  })

  it('preserves local changes on revision conflict without silently retrying a new version', async () => {
    const first = render(1301)
    await first.model.load()
    api.saveCommercialDraft.mockRejectedValueOnce(Object.assign(new Error('El borrador cambió'), { status: 409 }))
    first.model.editor.updateOrderNotes('Cambios locales')
    await expect(first.model.flush()).rejects.toThrow('El borrador cambió')
    expect(first.model.saveState.value).toBe('conflict')
    expect(first.model.draft.value?.notes).toBe('Cambios locales')
    expect(first.model.session.value?.version).toBe(1)
    await first.model.flush()
    expect(api.saveCommercialDraft).toHaveBeenCalledTimes(1)
  })

  it('clears a failed save after reconnecting and successfully retrying', async () => {
    const first = render(1701)
    await first.model.load()
    first.model.editor.updateOrderNotes('Conservar al recuperar la conexión')
    api.saveCommercialDraft.mockRejectedValueOnce(new Error('Sin conexión'))
    await expect(first.model.flush()).rejects.toThrow('Sin conexión')
    expect(first.model.error.value).toBe('Sin conexión')
    await first.model.flush()
    expect(first.model.saveState.value).toBe('saved')
    expect(first.model.error.value).toBe('')
    expect(first.model.draft.value?.branchId).toBe(2)
  })

  it('rehydrates a Flow discount in the existing benefit fields without doubling its amount', async () => {
    const value = session(1601)
    Object.assign(value.order, { appliedBenefitType: 'daily_promotion', appliedBenefitSourceId: 51,
      appliedBenefitRewardType: 'percentage_discount', appliedBenefitAmount: 10 })
    value.order.orderDetails[0]!.discount = 1000
    api.getCommercialDraft.mockResolvedValueOnce({ data: value })
    const first = render(1601)
    await first.model.load()
    expect(first.model.draft.value?.appliedBenefitType).toBe('DailyPromotion')
    expect(first.model.draft.value?.orderItems[0]?.discount).toBe(0)
    expect(first.model.draft.value?.orderItems[0]?.dailyPromotionDiscount).toBe(1000)
    expect(first.model.draft.value?.total).toBe(9000)
  })

  it('does not start a sale when opening an informational conversation', async () => {
    api.getCommercialDraft.mockResolvedValueOnce({ data: null })
    const first = render(1401)
    await first.model.load()
    expect(first.model.session.value).toBeNull()
    expect(first.model.draft.value).toBeNull()
    expect(api.startCommercialDraft).not.toHaveBeenCalled()
  })

  it('keeps the confirmed order when confirmation times out after the server committed', async () => {
    const first = render(1501)
    await first.model.load()
    api.commercialDraftAction.mockRejectedValueOnce(new Error('Timeout'))
    api.getCommercialDraft.mockResolvedValueOnce({ data: { ...session(1501), orderId: 91, status: 'completed', commercialStatus: 'order_taken' } })
    const created = await first.model.submit(first.model.draft.value!)
    expect(created.id).toBe(91)
    expect(first.model.session.value?.commercialStatus).toBe('order_taken')
    expect(first.model.session.value?.confirmationStatus).toBeNull()
    expect(api.commercialDraftAction).toHaveBeenCalledTimes(1)
  })
})

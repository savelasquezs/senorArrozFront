import { generatePosCreationKey } from '@/utils/posCreationKey'
import { getActivePinia } from 'pinia'
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { customerApi } from '@/services/MainAPI/customerApi'
import { useProductsStore } from '@/store/products'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { provideOrderEditor } from './useOrderEditor'
import { useOrderSubmission } from './useOrderSubmission'
import { appendOrderProducts, createOrderDraft } from '@/helpers/orderDraft'
import type { DraftOrder, Order } from '@/types/order'
import type { WhatsAppCommercialDraft, WhatsAppConversation, WhatsAppProductSuggestion } from '@/types/whatsapp'

interface RetainedDraft {
  session: WhatsAppCommercialDraft | null
  savedSnapshot: string
  saveState: 'saved' | 'pending' | 'saving' | 'conflict' | 'error'
  commercialStatus: string
  error: string
  pendingSave: Promise<void> | null
}
const retainedDrafts = new Map<string, RetainedDraft>()
const mountedDrafts = new Map<string, number>()

export function useWhatsAppCommercialDraft(conversation: Ref<WhatsAppConversation>, initialRead?: Promise<WhatsAppCommercialDraft | null | undefined>) {
  const auth = useAuthStore()
  const conversationId = conversation.value.id
  const context = useBranchContextStore()
  const cacheKey = `${auth.user?.id}:${auth.user?.role}:${context.selectedBranchId ?? auth.branchId}:${conversationId}`
  mountedDrafts.set(cacheKey, (mountedDrafts.get(cacheKey) ?? 0) + 1)
  const userId = auth.user?.id
  const session = ref<WhatsAppCommercialDraft | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref('')
  const saveState = ref<'saved' | 'pending' | 'saving' | 'conflict' | 'error'>('saved')
  const commercialStatus = ref('in_progress')
  const editor = provideOrderEditor(cacheKey, submit)
  const pinia = getActivePinia()
  const { transformDraftToCreateDto } = useOrderSubmission()
  const owned = computed(() => conversation.value.attentionMode === 'human' && conversation.value.assignedUserId === auth.user?.id)
  const editable = computed(() => owned.value && session.value?.status === 'active' && !loading.value && !syncing.value && saveState.value !== 'conflict')
  const addingSuggestion = ref(false)
  const canApplyProductSuggestion = computed(() => !addingSuggestion.value
    && (editable.value || !session.value && owned.value && !loading.value && !syncing.value))
  let applying = false, disposed = false, timer: ReturnType<typeof setTimeout> | undefined
  let pendingSave: Promise<void> | null = null
  let generation = 0
  let queuedReconciliation = false
  let reconciledAt = 0, reconciledAttention: number | undefined
  const draft = computed(() => editor.currentOrder)
  const snapshot = () => JSON.stringify({ order: draft.value, status: commercialStatus.value })
  let savedSnapshot = ''
  const versions = () => ({ sessionId: session.value?.sessionId ?? 0, expectedVersion: session.value?.version ?? 0, attentionVersion: conversation.value.attentionRevision ?? 0 })

  async function apply(value: WhatsAppCommercialDraft | null) {
    const epoch = generation
    session.value = value
    if (!value) {
      editor.draftOrders.clear()
      editor.currentTabId = null
      savedSnapshot = snapshot()
      return
    }
    applying = true
    const base = createOrderDraft(`wa:${conversationId}:${value.attemptId}`, 'WhatsApp', editor.activeBranchId)
    const order = value.editor ? { ...base, ...value.editor } : base
    if (!value.editor) {
      const dto = value.order
      const benefitName = String(dto.appliedBenefitType ?? 'None').replace(/_/g, '').toLowerCase()
      const benefitType = (['None', 'DailyPromotion', 'Loyalty', 'DiscountCode', 'Manual'] as const).find(type => type.toLowerCase() === benefitName) ?? 'None'
      const rewardName = String(dto.appliedBenefitRewardType ?? '').replace(/_/g, '').toLowerCase()
      const rewardType = ['GiftProduct', 'FreeDelivery', 'PercentageDiscount'].find(type => type.toLowerCase() === rewardName)
      let giftProductId: number | null = null
      try {
        const snapshot = JSON.parse(dto.appliedBenefitSnapshot || '{}')
        giftProductId = snapshot.giftProductId ?? snapshot.GiftProductId ?? null
      } catch {}
      const automaticDiscount = ({ DailyPromotion: 'dailyPromotionDiscount', Loyalty: 'loyaltyDiscount', DiscountCode: 'discountCodeDiscount' } as Record<string, string>)[benefitType]
      Object.assign(order, {
        branchId: dto.branchId || null, customerId: dto.customerId ?? null,
        addressId: dto.addressId ?? null, guestName: dto.guestName ?? null, type: dto.type || 'delivery',
        deliveryFee: dto.deliveryFee ?? 0, notes: dto.notes ?? '',
        reservedFor: dto.reservedFor ? new Date(dto.reservedFor) : null,
        prepareAt: dto.prepareAt ? new Date(dto.prepareAt) : null, isLater: !!dto.prepareAt,
        billingRecipient: dto.electronicInvoice ?? null, requestElectronicInvoice: !!dto.electronicInvoice,
        freeDeliveryRequested: dto.freeDeliveryRequested || rewardType === 'FreeDelivery',
        selectedBenefitType: benefitType, appliedBenefitType: benefitType, appliedBenefitSourceId: dto.appliedBenefitSourceId,
        appliedBenefitCode: dto.appliedBenefitCode, appliedBenefitLabel: dto.appliedBenefitLabel,
        appliedBenefitRewardType: rewardType, appliedBenefitAmount: dto.appliedBenefitAmount,
        appliedBenefitSnapshot: dto.appliedBenefitSnapshot, manualBenefitReason: dto.manualBenefitReason,
        manualBenefitGiftProductId: dto.manualBenefitGiftProductId,
        orderItems: dto.orderDetails.map(item => ({ ...item, whatsAppProductChoice: item.whatsAppProductChoice ?? undefined,
          whatsAppSuggestionMessageId: item.whatsAppSuggestionMessageId ?? undefined,
          tempId: item.whatsAppProductChoice?.key ?? generatePosCreationKey(), productName: item.whatsAppProductChoice?.name ?? `Producto ${item.productId}`,
          productPrice: item.unitPrice, discount: automaticDiscount ? 0 : item.discount ?? 0, freeDeliveryDiscount: 0,
          notes: item.notes ?? '',
          ...(automaticDiscount ? { [automaticDiscount]: item.discount ?? 0 } : {}),
          isDailyPromotionGift: benefitType === 'DailyPromotion' && item.productId === giftProductId,
          isLoyaltyGift: benefitType === 'Loyalty' && item.productId === giftProductId,
          isDiscountCodeGift: benefitType === 'DiscountCode' && item.productId === giftProductId,
          subtotal: item.unitPrice * item.quantity - (item.discount ?? 0) })),
        bankPayments: (dto.bankPayments ?? []).map(item => ({ ...item, tempId: generatePosCreationKey(), bankName: `Banco ${item.bankId}` })),
        appPayment: dto.appPayments?.[0] ? { ...dto.appPayments[0], tempId: generatePosCreationKey(), appName: 'Aplicación' } : null,
        paidInStoreCash: dto.paidInStoreCash, paidInStoreCashAmount: dto.paidInStoreCashAmount,
      })
    }
    for (const key of ['createdAt', 'updatedAt', 'reservedFor', 'prepareAt'] as const) {
      if (order[key]) (order as unknown as Record<string, unknown>)[key] = new Date(order[key]!)
    }
    order.tabId = base.tabId
    if (!order.branchId || order.branchId <= 0) order.branchId = value.order.branchId || null
    order.workspaceBranchId = editor.activeBranchId
    order.whatsappConversationId = conversationId
    order.source = 'WhatsApp'
    order.posCreationKey = value.attemptId
    editor.draftOrders.clear()
    editor.draftOrders.set(order.tabId, order)
    editor.currentTabId = order.tabId
    editor.recalculateTotals(order)
    commercialStatus.value = value.commercialStatus
    savedSnapshot = snapshot()
    applying = false
    saveState.value = 'saved'
    const products = useProductsStore()
    const needsCatalog = order.orderItems.some(item => !item.productName || item.productName === `Producto ${item.productId}`)
    const [customerResult] = await Promise.all([
      order.customerId ? customerApi.getCustomerById(order.customerId) : Promise.resolve(null),
      editor.loadOperationalContext(order.branchId),
      needsCatalog ? products.ensureCatalogLoaded(order.branchId) : Promise.resolve(),
    ])
    if (disposed || auth.user?.id !== userId || session.value?.sessionId !== value.sessionId) return
    if (customerResult) {
      const result = customerResult
      if (disposed || auth.user?.id !== userId || session.value?.sessionId !== value.sessionId) return
      if (result.data) {
        const customer = result.data
        if (!Array.isArray(customer.addresses)) {
          const addresses = await customerApi.getCustomerAddresses(customer.id)
          if (disposed || auth.user?.id !== userId || generation !== epoch || session.value?.sessionId !== value.sessionId || session.value?.version !== value.version) return
          customer.addresses = addresses.data ?? []
        }
        editor.ensureCustomerInList(customer)
        if (!order.customerName) {
          applying = true
          const current = editor.draftOrders.get(order.tabId)!
          current.customerName = result.data.name
          current.customerPhone = result.data.phone1 ?? null
          current.guestName ||= result.data.name
          const address = result.data.addresses?.find(address => address.id === order.addressId)
          current.addressDescription = address?.address ?? null
          current.addressAdditionalInfo = address?.additionalInfo ?? null
          const coverage = address?.branchServices?.find(service => service.branchId === current.branchId && service.isCovered)
          if (!value.editor && coverage) current.deliveryFee = coverage.deliveryFee
          editor.recalculateTotals(current)
          savedSnapshot = snapshot()
          applying = false
        }
      }
    }
    const current = editor.draftOrders.get(order.tabId)
    if (current) {
      applying = true
      for (const item of current.orderItems) {
        const product = products.catalogBranchId === current.branchId
          ? products.catalogProducts.find(product => product.id === item.productId) : undefined
        if (product) { item.productName = product.name; item.productPrice = product.price }
      }
      for (const payment of current.bankPayments) payment.bankName = editor.banks.find(bank => bank.id === payment.bankId)?.name ?? payment.bankName
      if (current.appPayment) current.appPayment.appName = editor.apps.find(app => app.id === current.appPayment?.appId)?.name ?? current.appPayment.appName
      savedSnapshot = snapshot()
      applying = false
    }
  }

  function retireClean() {
    if (!disposed || mountedDrafts.has(cacheKey) || pendingSave || saveState.value !== 'saved' || session.value !== null && owned.value && snapshot() !== savedSnapshot) return
    retainedDrafts.delete(cacheKey)
    editor.draftOrders.clear()
    editor.customers = []; editor.banks = []; editor.apps = []
    editor.$dispose()
    if (pinia) delete pinia.state.value[editor.$id]
  }

  function retain() {
    retainedDrafts.set(cacheKey, { session: session.value, savedSnapshot, saveState: saveState.value,
      commercialStatus: commercialStatus.value, error: error.value, pendingSave })
  }

  async function load(discard = false) {
    const retained = retainedDrafts.get(cacheKey)
    if (!discard && retained && editor.currentOrder) {
      if (retained.pendingSave) await retained.pendingSave.catch(() => {})
      const latest = retainedDrafts.get(cacheKey) ?? retained
      session.value = latest.session
      savedSnapshot = latest.savedSnapshot
      commercialStatus.value = latest.commercialStatus
      error.value = latest.error
      saveState.value = latest.saveState === 'saving' ? 'pending' : latest.saveState
      if (snapshot() !== savedSnapshot) {
        if (saveState.value === 'pending') schedule()
        return
      }
    }
    const epoch = ++generation
    const attention = conversation.value.attentionRevision
    loading.value = true
    error.value = ''
    try {
      const preload = discard ? undefined : initialRead
      initialRead = undefined
      const prefetched = await preload?.catch(() => undefined)
      const result = prefetched === undefined ? await whatsappApi.getCommercialDraft(conversationId) : { data: prefetched }
      if (epoch === generation && !disposed && auth.user?.id === userId) {
        await apply(result.data ?? null)
        reconciledAt = Date.now(); reconciledAttention = attention
      }
    } catch (cause) { error.value = message(cause) }
    finally { if (epoch === generation) finishLoading() }
  }

  async function start() {
    if (!owned.value || loading.value || syncing.value) return
    loading.value = true
    error.value = ''
    try {
      const result = await whatsappApi.startCommercialDraft(conversationId, versions())
      if (!disposed && auth.user?.id === userId) await apply(result.data!)
    } catch (cause) { error.value = message(cause) }
    finally { finishLoading() }
  }

  async function addProductSuggestion(messageId: number, suggestion: WhatsAppProductSuggestion, isActive: () => boolean) {
    if (!canApplyProductSuggestion.value || suggestion.kind !== 'add' || !suggestion.productId) return
    const productId = suggestion.productId
    if (draft.value?.orderItems.some(item => item.productId === productId && item.whatsAppSuggestionMessageId === messageId)) return
    addingSuggestion.value = true
    error.value = ''
    try {
      if (!session.value) {
        await start()
        await settleDraftReconciliation(isActive)
      }
      if (!isActive() || !editable.value || disposed) return
      await flush()
      const branchId = draft.value?.branchId
      const attempt = session.value?.sessionId
      if (!branchId || branchId <= 0) throw new Error('Elige la sucursal que prepara el pedido.')
      const { data } = await whatsappApi.getProductSuggestions(conversationId, [messageId])
      await settleDraftReconciliation(isActive)
      if (!isActive() || disposed || !owned.value) return
      const current = draft.value
      if (!editable.value || current?.branchId !== branchId || session.value?.sessionId !== attempt)
        throw new Error('El borrador cambió. Vuelve a seleccionar la sugerencia.')
      const verified = data?.messages.find(message => message.messageId === messageId)?.suggestions
        .find(option => option.kind === 'add' && option.productId === productId)
      if (data?.branchId !== branchId || !verified?.name || verified.unitPrice === null
        || verified.unitPrice !== suggestion.unitPrice || verified.quantity !== suggestion.quantity) {
        throw new Error('La sugerencia o su precio cambió. Revisa la opción actualizada.')
      }
      if (!verified.available) throw new Error('No hay inventario suficiente en la sucursal que prepara.')
      const [item] = appendOrderProducts(current, [{ id: 0, productId, productName: verified.name, productDescription: '',
        unitPrice: verified.unitPrice, quantity: verified.quantity, discount: 0, notes: '', whatsAppSuggestionMessageId: messageId }])
      editor.recalculateTotals(current)
      try {
        await flush()
      } catch (cause) {
        const latest = draft.value
        if (latest && session.value?.sessionId === attempt && [400, 422].includes((cause as { status?: number }).status ?? 0)) {
          const index = latest.orderItems.findIndex(line => line.tempId === item!.tempId)
          if (index >= 0) latest.orderItems.splice(index, 1)
          editor.recalculateTotals(latest)
          if (snapshot() === savedSnapshot) saveState.value = 'saved'
        }
        throw cause
      }
    } finally {
      addingSuggestion.value = false
    }
  }

  function finishLoading() {
    loading.value = false
    if (queuedReconciliation && !disposed && auth.user?.id === userId) {
      queuedReconciliation = false
      void reconcile(true).catch(cause => { error.value = message(cause) })
    } else if (disposed) { queuedReconciliation = false; syncing.value = false }
  }

  function mergeCustomerChoice(latest: WhatsAppCommercialDraft | null | undefined) {
    const previous = session.value, local = draft.value
    if (!owned.value || !previous || !local || !latest || latest.sessionId !== previous.sessionId
      || latest.status !== 'active' || latest.version <= previous.version || latest.commercialStatus !== previous.commercialStatus) return false
    const { addressId: previousAddress, deliveryFee: previousFee, orderDetails: previousItems, ...previousOrder } = previous.order
    const { addressId, deliveryFee, orderDetails, ...latestOrder } = latest.order
    if (local.branchId !== latestOrder.branchId || (local.customerId ?? null) !== (latestOrder.customerId ?? null)
      || local.type !== latestOrder.type || JSON.stringify(previousOrder) !== JSON.stringify(latestOrder)
      || JSON.stringify(previousItems) !== JSON.stringify(orderDetails.slice(0, previousItems.length))) return false
    const addressChanged = addressId !== previousAddress || deliveryFee !== previousFee
    if (addressChanged && (addressId == null || (local.addressId ?? null) !== (previousAddress ?? null))) return false
    const appended = orderDetails.slice(previousItems.length)
    if ((!addressChanged && !appended.length) || appended.some(item => !item.whatsAppProductChoice)) return false
    const chosen = new Set(local.orderItems.map(item => item.tempId))
    const additions = appended.flatMap(item => {
      const choice = item.whatsAppProductChoice!
      if (chosen.has(choice.key)) return []
      return [{ ...item, whatsAppProductChoice: choice, whatsAppSuggestionMessageId: item.whatsAppSuggestionMessageId ?? undefined,
        tempId: choice.key, productName: choice.name,
        productPrice: item.unitPrice, discount: item.discount ?? 0, freeDeliveryDiscount: 0,
        subtotal: item.unitPrice * item.quantity, notes: item.notes ?? '' }]
    })
    const address = addressChanged ? editor.customers.find(customer => customer.id === local.customerId)
      ?.addresses?.find(item => item.id === addressId) : undefined
    applying = true
    editor.recalculateTotals({
      ...local,
      orderItems: [...local.orderItems, ...additions],
      ...(addressChanged ? {
        addressId: addressId ?? null, deliveryFee: deliveryFee ?? 0,
        addressDescription: latest.editor?.addressDescription ?? address?.address ?? null,
        addressAdditionalInfo: latest.editor?.addressAdditionalInfo ?? address?.additionalInfo ?? null,
      } : {}),
    })
    session.value = latest
    applying = false
    saveState.value = 'pending'
    error.value = ''
    return true
  }

  async function flush() {
    clearTimeout(timer)
    if (pendingSave) await pendingSave
    if (!editable.value || !draft.value || !session.value || snapshot() === savedSnapshot) return
    const captured = snapshot()
    const payload = { ...versions(), order: transformDraftToCreateDto(draft.value), editor: JSON.parse(JSON.stringify(draft.value)), commercialStatus: commercialStatus.value }
    saveState.value = 'saving'
    let choiceMerged = false
    pendingSave = (async () => {
      try {
        const result = await whatsappApi.saveCommercialDraft(conversationId, payload)
        if (auth.user?.id !== userId) return
        session.value = result.data!
        savedSnapshot = captured
        saveState.value = snapshot() === captured ? 'saved' : 'pending'
        error.value = ''
      } catch (cause) {
        const conflict = (cause as { status?: number }).status === 409
        if (conflict && !disposed && auth.user?.id === userId) {
          const current = await whatsappApi.getCommercialDraft(conversationId).catch(() => null)
          choiceMerged = !disposed && auth.user?.id === userId && mergeCustomerChoice(current?.data)
          if (choiceMerged) return
        }
        saveState.value = conflict ? 'conflict' : 'error'
        error.value = message(cause)
        throw cause
      } finally { pendingSave = null; retain(); retireClean() }
    })()
    await pendingSave
    if (choiceMerged && editable.value) return flush()
    if (snapshot() !== savedSnapshot && !disposed) schedule()
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => { void flush().catch(() => {}) }, 600)
  }

  async function refreshStatus() {
    const current = session.value
    if (!current || current.status === 'active') return
    const result = await whatsappApi.getCommercialDraft(conversationId)
    if (!disposed && auth.user?.id === userId && result.data?.sessionId === current.sessionId) session.value = result.data
  }

  let reconciliation: Promise<void> | null = null
  async function settleDraftReconciliation(isActive: () => boolean) {
    while (reconciliation && isActive() && !disposed) await reconciliation
  }

  function reconcile(force = false): Promise<void> {
    if (force) syncing.value = true
    if (reconciliation) { queuedReconciliation ||= force; return reconciliation }
    if (!force && reconciledAt && Date.now() - reconciledAt < 5000 && reconciledAttention === conversation.value.attentionRevision) return Promise.resolve()
    if (loading.value) { queuedReconciliation ||= force; return Promise.resolve() }
    if (!force && (saveState.value !== 'saved' || snapshot() !== savedSnapshot)) { syncing.value = false; return Promise.resolve() }
    const captured = snapshot(), epoch = generation
    const attention = conversation.value.attentionRevision
    reconciliation = (async () => {
      try {
        if (pendingSave) await pendingSave.catch(() => {})
        const result = await whatsappApi.getCommercialDraft(conversationId)
        if (disposed || auth.user?.id !== userId || epoch !== generation) return
        if (attention !== conversation.value.attentionRevision) { queuedReconciliation = true; return }
        const latest = result.data ?? null, current = session.value
        if (snapshot() !== captured || snapshot() !== savedSnapshot || saveState.value !== 'saved') {
          if (force && saveState.value === 'pending') mergeCustomerChoice(latest)
          return
        }
        if (latest?.sessionId !== current?.sessionId || latest?.version !== current?.version) {
          loading.value = true
          try { await apply(latest) } finally { loading.value = false }
        }
        else if (latest && current && (latest.confirmationStatus !== current.confirmationStatus || latest.confirmationError !== current.confirmationError))
          session.value = latest
        reconciledAt = Date.now(); reconciledAttention = attention
      } finally {
        reconciliation = null
        if (attention !== conversation.value.attentionRevision) queuedReconciliation = true
        if (queuedReconciliation && !disposed && auth.user?.id === userId) {
          queuedReconciliation = false
          void reconcile(true).catch(cause => { error.value = message(cause) })
        } else {
          syncing.value = false
          if (!disposed && saveState.value === 'pending') schedule()
        }
      }
    })()
    return reconciliation
  }

  async function action(name: 'cancel' | 'note' | 'retry-message', note?: string) {
    if (syncing.value) throw new Error('Espera a que termine de actualizarse el pedido.')
    await flush()
    const result = await whatsappApi.commercialDraftAction(conversationId, name, { ...versions(), note })
    session.value = result.data!
    if (name === 'cancel') commercialStatus.value = 'no_sale'
  }

  async function sendAddressChoices() {
    await flush()
    if (!editable.value || saveState.value !== 'saved') throw new Error('Guarda el borrador antes de enviar las direcciones.')
    const result = await whatsappApi.sendCommercialAddressChoices(conversationId, versions())
    return result.data ?? []
  }

  async function sendProductChoices(groupId: number) {
    if (!session.value && owned.value) await start()
    if (session.value?.status !== 'active') throw new Error(error.value || 'Inicia un pedido para enviar las presentaciones.')
    await flush()
    if (!editable.value || saveState.value !== 'saved') throw new Error('Guarda el borrador antes de enviar las presentaciones.')
    const result = await whatsappApi.sendCommercialProductChoices(conversationId, groupId, versions())
    return result.data ?? []
  }

  async function submit(_draft: DraftOrder): Promise<Order> {
    await flush()
    if (!editable.value || saveState.value !== 'saved') throw new Error('Revisa el estado de guardado y la atención antes de confirmar.')
    const request = versions()
    try {
      const result = await whatsappApi.commercialDraftAction(conversationId, 'confirm', request)
      session.value = result.data!
    } catch (cause) {
      const recovered = await whatsappApi.getCommercialDraft(conversationId).catch(() => null)
      if (recovered?.data?.sessionId === request.sessionId && recovered.data.orderId) session.value = recovered.data
      else throw cause
    }
    return { id: session.value!.orderId!, branchId: session.value!.order.branchId } as Order
  }

  watch(snapshot, () => {
    if (applying) return
    if (!owned.value && saveState.value === 'saved') { savedSnapshot = snapshot(); return }
    if (!editable.value || snapshot() === savedSnapshot) return
    saveState.value = 'pending'
    schedule()
  }, { flush: 'sync' })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    void flush().catch(() => {})
    retain()
    disposed = true
    const count = (mountedDrafts.get(cacheKey) ?? 1) - 1
    if (count > 0) mountedDrafts.set(cacheKey, count)
    else mountedDrafts.delete(cacheKey)
    retireClean()
    generation++
  })
  return { editor, session, draft, loading, syncing, error, saveState, commercialStatus, editable, owned, load, start, flush, action, submit, refreshStatus, reconcile, sendAddressChoices, sendProductChoices, canApplyProductSuggestion, addProductSuggestion }
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : 'No se pudo guardar el pedido. Reintenta.' }

import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useOrderManagementUpdates } from '@/composables/useOrderManagementUpdates'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { orderApi } from '@/services/MainAPI/orderApi'
import { orderManagementApi } from '@/services/MainAPI/orderManagementApi'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { isOrderMutationPending } from '@/services/MainAPI/orderMutation'
import { useAuthStore } from '@/store/auth'
import { orderCashToCollect } from '@/utils/orderCashToCollect'
import type { OrderBankPaymentDetail, OrderDetailView } from '@/types/order'
import type { OrderOperationOptions } from '@/types/orderManagement'

/** Local snapshots: opening a chat must never replace the active POS catalogs or order. */
export function useWhatsAppOrderActions(orderId: Ref<number>, active: Ref<boolean>) {
  const order = ref<OrderDetailView | null>(null)
  const options = ref<OrderOperationOptions | null>(null)
  const loading = ref(false), busy = ref(false), fresh = ref(false), error = ref(''), loadError = ref('')
  const permissions = useOrderPermissions()
  const auth = useAuthStore()
  let generation = 0
  let pending: Promise<boolean> | undefined
  let refreshAgain = false
  let disposed = false

  const { isOnline, isPageVisible } = useOrderManagementUpdates(
    event => { if (event.orderId === orderId.value) void refresh() },
    () => { void refresh() },
    id => { if (id === orderId.value) { fresh.value = false; void refresh() } },
  )
  const available = computed(() => active.value && !disposed && isOnline.value && isPageVisible.value)
  const disabled = computed(() => !available.value || !fresh.value || loading.value || busy.value || isOrderMutationPending(orderId.value))
  const remaining = computed(() => order.value ? orderCashToCollect(order.value.total, order.value, {
    floorAtZero: true, paidInStoreCash: order.value.paidInStoreCash,
    paidInStoreCashAmount: order.value.paidInStoreCashAmount,
  }) : 0)
  const quickBanks = computed(() => (options.value?.banks ?? []).filter(bank => bank.active)
    .sort((a, b) => a.id - b.id).slice(0, 2))
  const canAdd = computed(() => !!order.value && order.value.status !== 'cancelled' &&
    permissions.canEditPayments(order.value) && !order.value.paidInStoreCash && remaining.value > 0)
  const canTrack = computed(() => !auth.isDeliveryman && order.value?.type === 'delivery' && order.value.status === 'on_the_way')
  const canEdit = (payment: OrderBankPaymentDetail) => !!order.value &&
    permissions.canEditPayments(order.value) && payment.branchId === order.value.branchId
  const canVerify = (payment: OrderBankPaymentDetail) => !!order.value && order.value.status !== 'cancelled' &&
    permissions.canVerifyPayments() && (payment.branchId === order.value.branchId || auth.isSuperadmin)
  const canUnverify = (payment: OrderBankPaymentDetail) => !!order.value && order.value.status !== 'cancelled' &&
    permissions.canUnverifyPayments() && (payment.branchId === order.value.branchId || auth.isSuperadmin)

  async function refresh(): Promise<boolean> {
    if (!available.value) return false
    if (pending) { refreshAgain = true; return pending }
    const request = generation, id = orderId.value
    loading.value = true
    fresh.value = false
    pending = (async () => {
      const [detail, catalogs] = await Promise.allSettled([orderApi.fetchDetail(id), orderManagementApi.options(id)])
      if (request !== generation || !available.value || id !== orderId.value) return false
      if (detail.status === 'fulfilled') { order.value = detail.value; fresh.value = true }
      options.value = catalogs.status === 'fulfilled' ? catalogs.value : null
      const failure = detail.status === 'rejected' ? detail.reason : catalogs.status === 'rejected' ? catalogs.reason : null
      loadError.value = failure ? failure instanceof Error ? failure.message : 'No se pudo actualizar el pedido.' : ''
      return detail.status === 'fulfilled'
    })()
    try { return await pending } finally {
      if (request === generation) {
        pending = undefined
        loading.value = false
        if (refreshAgain) { refreshAgain = false; void refresh() }
      }
    }
  }

  async function mutate(operation: (snapshot: OrderDetailView) => Promise<unknown>, expected = order.value): Promise<boolean> {
    if (disabled.value || !order.value || !expected) return false
    if (expected.id !== order.value.id || expected.managementVersion !== order.value.managementVersion) {
      error.value = 'El pedido cambió. Revisa los valores actualizados antes de guardar.'
      return false
    }
    const request = generation
    busy.value = true
    error.value = ''
    let completed = false, failure = ''
    try { await operation(expected); completed = true } catch (cause) {
      failure = cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
    } finally {
      if (request === generation) {
        // Even an uncertain response must be reconciled before another payment can be created.
        fresh.value = false
        await refresh()
        if (request === generation) {
          if (failure) error.value = failure
          busy.value = false
        }
      } else if (expected.id === orderId.value && available.value) {
        // The same cached chat may have been reactivated while the write was still pending.
        fresh.value = false
        await refresh()
      }
    }
    return completed && request === generation
  }

  async function transfer(bankId: number) {
    if (!canAdd.value || !quickBanks.value.some(bank => bank.id === bankId)) return false
    return mutate(snapshot => bankPaymentApi.createBankPayment({ orderId: snapshot.id, bankId, amount: remaining.value }, snapshot))
  }
  async function edit(payment: OrderBankPaymentDetail, amount: number, snapshot: OrderDetailView) {
    if (!canEdit(payment)) return false
    const max = orderCashToCollect(snapshot.total, snapshot, { floorAtZero: true,
      paidInStoreCash: snapshot.paidInStoreCash, paidInStoreCashAmount: snapshot.paidInStoreCashAmount }) + payment.amount
    if (!Number.isFinite(amount) || amount <= 0 || amount > max) {
      error.value = 'Ingresa un monto mayor a cero que no exceda el saldo disponible para este pago.'
      return false
    }
    return mutate(current => bankPaymentApi.updateBankPayment(payment.id, amount, current), snapshot)
  }
  async function remove(payment: OrderBankPaymentDetail, snapshot: OrderDetailView) {
    if (!canEdit(payment)) return false
    return mutate(current => bankPaymentApi.deletePayment(payment.id, current), snapshot)
  }
  async function verify(payment: OrderBankPaymentDetail, verified: boolean) {
    if (verified ? !canVerify(payment) : !canUnverify(payment)) return false
    return mutate(current => verified ? bankPaymentApi.verifyBankPayment(payment.id, undefined, current) :
      bankPaymentApi.unverifyBankPayment(payment.id, current))
  }

  watch([orderId, active], () => {
    generation++
    pending = undefined; refreshAgain = false
    fresh.value = false; loading.value = false; busy.value = false
    error.value = ''; loadError.value = ''; options.value = null; order.value = null
    if (active.value) void refresh()
  }, { immediate: true })
  onBeforeUnmount(() => { disposed = true; generation++ })

  return { order, options, loading, busy, error: computed(() => error.value || loadError.value), disabled, remaining, quickBanks, canAdd, canTrack,
    canEdit, canVerify, canUnverify, refresh: () => { error.value = ''; return refresh() }, transfer, edit, remove, verify }
}

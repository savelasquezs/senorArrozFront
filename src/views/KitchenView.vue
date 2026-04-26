<template>
    <MainLayout>
        <div class="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            <!-- Pestañas + barra de cocina (solo rol Kitchen) en la misma franja -->
            <div
                class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3 border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0"
            >
                <nav class="-mb-px flex min-w-0 flex-1 items-end space-x-4 sm:space-x-6 overflow-x-auto">
                    <button type="button" @click="activeTab = 'scheduled'" :class="[
                        'py-2 sm:py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0',
                        activeTab === 'scheduled'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        <span>Reservas hoy</span>
                        <span v-if="scheduledReservationOrders.length > 0"
                            class="ml-1.5 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs bg-indigo-100 text-indigo-700">
                            {{ scheduledReservationOrders.length }}
                        </span>
                    </button>

                    <button type="button" @click="activeTab = 'active'" :class="[
                        'py-2 sm:py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0',
                        activeTab === 'active'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        <span>Pedidos Activos</span>
                        <span v-if="activeOrders.length > 0"
                            class="ml-1.5 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs bg-emerald-100 text-emerald-600">
                            {{ activeOrders.length }}
                        </span>
                    </button>

                    <button type="button" @click="activeTab = 'ready'" :class="[
                        'py-2 sm:py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0',
                        activeTab === 'ready'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        <span>Pedidos Listos</span>
                        <span v-if="readyOrders.length > 0"
                            class="ml-1.5 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs bg-green-100 text-green-600">
                            {{ readyOrders.length }}
                        </span>
                    </button>

                    <div v-if="activeTab === 'active'"
                        class="ml-auto flex flex-shrink-0 items-end pl-2 sm:pl-4 pb-2 sm:pb-2.5 -mb-px self-end">
                        <label
                            class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-800 cursor-pointer select-none whitespace-nowrap"
                            title="Agrupa Tomado y En preparación en un solo bloque">
                            <input v-model="combinedKitchenMode" type="checkbox"
                                class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span class="font-medium">Modo combinado</span>
                        </label>
                    </div>
                </nav>

                <div v-if="authStore.isKitchen"
                    class="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 sm:pb-0.5 sm:flex-shrink-0">
                    <div :class="[
                        'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[11px] sm:text-xs',
                        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    ]">
                        <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', isConnected ? 'bg-green-500' : 'bg-red-500']"></span>
                        <span class="whitespace-nowrap">{{ isConnected ? 'Conectado' : 'Desconectado' }}</span>
                    </div>

                    <button v-if="permission === 'default'" type="button" @click="requestPermission"
                        class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        title="Activar notificaciones">
                        <BellIcon class="w-3.5 h-3.5 flex-shrink-0" />
                        <span class="hidden sm:inline">Activar notificaciones</span>
                    </button>
                    <div v-else :class="[
                        'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs',
                        permission === 'granted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    ]" :title="permission === 'granted' ? 'Notificaciones activas' : 'Notificaciones desactivadas'">
                        <BellIcon class="w-3.5 h-3.5 flex-shrink-0" />
                        <span class="hidden sm:inline">{{ permission === 'granted' ? 'Notif. OK' : 'No' }}</span>
                    </div>
                    <button type="button" @click="toggleSound" :class="[
                        'p-1 rounded-md transition-colors',
                        soundEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    ]" :title="soundEnabled ? 'Desactivar sonido' : 'Activar sonido'">
                        <component :is="soundEnabled ? SpeakerWaveIcon : SpeakerXMarkIcon" class="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <BaseButton @click="refreshOrders" variant="outline" size="sm" :loading="isLoading">
                        <span class="flex items-center gap-1">
                            <ArrowPathIcon class="w-3.5 h-3.5" />
                            <span class="text-xs">Actualizar</span>
                        </span>
                    </BaseButton>
                </div>
            </div>

            <div v-if="activeTab === 'scheduled'">
                <p v-if="scheduledReservationOrders.length === 0" class="text-sm text-gray-500 mb-3">
                    No hay reservas del día en «Tomado» pendientes de hora. Al llegar la hora de cocina o al pasar a preparación aparecen en Pedidos activos.
                </p>
                <OrderCardGrid v-else ref="cardGridRef" :orders="scheduledReservationOrders"
                    :order-items-map="orderItemsMap" :show-status-actions="false"
                    @change-status="handleChangeStatus" />
            </div>

            <div v-else-if="activeTab === 'active'">
                <OrderCardGrid ref="cardGridRef" :orders="activeOrders" :order-items-map="orderItemsMap"
                    :combined-mode="combinedKitchenMode" @change-status="handleChangeStatus" />
            </div>

            <div v-else-if="activeTab === 'ready'">
                <ReadyOrdersTable :orders="readyOrders" :order-items-map="orderItemsMap" @reprint="handleReprint" />
            </div>
        </div>

        <ConfirmStatusChangeModal :is-open="showConfirmModal" :orders="ordersToConfirm" :order-items-map="orderItemsMap"
            :chain-taken-to-ready="confirmChainTakenToReady" @close="closeConfirmModal" @updated="handleModalUpdated" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useOrdersDataStore } from '@/store/ordersData'
import { useSignalR } from '@/composables/useSignalR'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useNotifications } from '@/composables/useNotifications'
import { useToast } from '@/composables/useToast'
import { KitchenService } from '@/services/domain/KitchenService'
import type { KitchenOrderModificationSummary } from '@/types/kitchenModification'
import { printJobsApi } from '@/services/MainAPI/printJobsApi'
import type { OrderListItem, OrderDetailItem, OrderStatus } from '@/types/order'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'
import ReadyOrdersTable from '@/components/kitchen/ReadyOrdersTable.vue'
import ConfirmStatusChangeModal from '@/components/kitchen/ConfirmStatusChangeModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowPathIcon, SpeakerWaveIcon, SpeakerXMarkIcon, BellIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const ordersStore = useOrdersDataStore()
const { success, error } = useToast()
const { speak, cancel } = useTextToSpeech()
const { permission, requestPermission, notify } = useNotifications()

const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5000/hubs/orders'
const { isConnected, on, off } = useSignalR(SIGNALR_HUB_URL)

const KITCHEN_COMBINED_MODE_KEY = 'senorarroz.kitchen.combinedMode'
const combinedKitchenMode = ref(
    typeof localStorage !== 'undefined' && localStorage.getItem(KITCHEN_COMBINED_MODE_KEY) === '1'
)
watch(combinedKitchenMode, (v) => {
    localStorage.setItem(KITCHEN_COMBINED_MODE_KEY, v ? '1' : '0')
})

const activeTab = ref<'scheduled' | 'active' | 'ready'>('active')
const soundEnabled = ref(true)
const isLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToConfirm = ref<OrderListItem[]>([])
/** Copia de `combinedKitchenMode` al abrir el modal (confirmación encadenada a Listo). */
const confirmChainTakenToReady = ref(false)
const orderItemsMap = ref(new Map<number, OrderDetailItem[]>())
const cardGridRef = ref<InstanceType<typeof OrderCardGrid> | null>(null)

/** Ids cuyo due de cocina ya anunció el servidor (ReservationReady) pero el reloj local podría aún considerar “pendiente de hora”. Alinea lista activa con el backend. */
const reservationServerDue = ref<Set<number>>(new Set())

const allOrders = computed(() => ordersStore.list?.items || [])

/** Reservas del día en «Tomado» cuya hora de cocina aún no llegó (prepareAt o reservedFor−1h); luego pasan a Pedidos activos. */
const scheduledReservationOrders = computed(() => {
    const list = allOrders.value.filter(
        (o) =>
            KitchenService.isReservationTakenPendingKitchenTime(o) &&
            !reservationServerDue.value.has(o.id)
    )
    return list.sort((a, b) => {
        const ta = new Date(a.prepareAt ?? a.reservedFor ?? 0).getTime()
        const tb = new Date(b.prepareAt ?? b.reservedFor ?? 0).getTime()
        return ta - tb
    })
})

const activeOrders = computed(() => {
    const skip = new Set(scheduledReservationOrders.value.map((o) => o.id))
    return allOrders.value.filter(
        (o) =>
            (o.status === 'taken' || o.status === 'in_preparation') &&
            !skip.has(o.id)
    )
})

const readyOrders = computed(() => allOrders.value.filter(o => o.status === 'ready'))

const loadOrders = async () => {
    try {
        isLoading.value = true
        await ordersStore.fetch({
            branchId: authStore.user?.branchId,
            page: 1,
            pageSize: 100,
            forKitchen: true
        })
        await loadOrderDetails()
        // Quitar override cuando el cliente ya considera vencida la hora de cocina (reloj alineado o usuario pasó a preparación).
        reservationServerDue.value = new Set(
            [...reservationServerDue.value].filter((id) => {
                const o = allOrders.value.find((x) => x.id === id)
                if (!o) return false
                return KitchenService.isReservationTakenPendingKitchenTime(o)
            })
        )
    } catch (err: any) {
        error('Error al cargar pedidos', err.message)
    } finally {
        isLoading.value = false
    }
}

const loadOrderDetails = async () => {
    for (const order of allOrders.value) {
        try {
            await ordersStore.fetchById(order.id)
            if (ordersStore.current) {
                orderItemsMap.value.set(order.id, [...(ordersStore.current.orderDetails || [])])
            }
        } catch (err) {
            console.error(`Error loading details for order ${order.id}:`, err)
        }
    }
}

const notifyOrderShownInKitchen = async (orderData: any, isReservation: boolean) => {
    const order = allOrders.value.find(o => o.id === orderData.id)
    if (!order || order.status !== 'taken') return

    try {
        await ordersStore.fetchById(order.id)
        if (!ordersStore.current) return

        const products = ordersStore.current.orderDetails.map(item => ({
            name: item.productName,
            quantity: item.quantity
        }))
        const title = isReservation ? `Reserva #${order.id} en cocina` : `Nuevo pedido #${order.id}`
        const bodyText = KitchenService.generateOrderNotificationText(order, products)
        const speechText = KitchenService.generateOrderSpeechText(order, products)

        if (soundEnabled.value) {
            if (permission.value === 'granted') {
                notify(title, { body: bodyText, tag: `order-${order.id}` })
            }
            speak(speechText)
        }
    } catch (err) {
        console.error('Error loading order details for notification/TTS:', err)
    }
}

const handleNewOrder = async (orderData: any) => {
    await loadOrders()
    await notifyOrderShownInKitchen(orderData, false)
}

const handleReservationReady = async (orderData: any) => {
    await loadOrders()
    const oid = typeof orderData?.id === 'number' ? orderData.id : Number(orderData?.id)
    if (Number.isFinite(oid)) {
        reservationServerDue.value = new Set([...reservationServerDue.value, oid as number])
    }
    await notifyOrderShownInKitchen(orderData, true)
}

/** Notificación TTS + navegador; actualiza ítems en mapa desde API. */
const notifyKitchenOrderModified = async (
    orderData: any,
    modificationKind: string,
    kitchenChanges: KitchenOrderModificationSummary | undefined
) => {
    const oid = orderData?.id
    const prev = oid ? allOrders.value.find((o) => o.id === oid) : undefined
    let skip = ''
    if (!oid) skip = 'no_order_id'
    else if (!prev) skip = 'no_prev_in_list'
    else if (prev.status !== 'taken' && prev.status !== 'in_preparation') skip = `bad_status:${prev.status}`
    else if (!KitchenService.isVisibleToActiveKitchenForAlerts(prev)) skip = 'not_visible_reservation_window'
    if (skip || !prev) return

    try {
        await ordersStore.fetchById(orderData.id)
        if (!ordersStore.current) return

        orderItemsMap.value.set(orderData.id, [...(ordersStore.current.orderDetails || [])])

        const orderNotes = ordersStore.current.notes ?? null
        const title = KitchenService.buildOrderModifiedNotificationTitle(prev.id)
        const { body: bodyText } = KitchenService.buildOrderModifiedNotificationBody(
            prev.id,
            modificationKind,
            kitchenChanges,
            orderNotes
        )
        const speechText = KitchenService.buildOrderModifiedSpeechText(
            prev.id,
            modificationKind,
            kitchenChanges,
            orderNotes
        )

        if (soundEnabled.value) {
            if (permission.value === 'granted') {
                notify(title, { body: bodyText, tag: `order-mod-${prev.id}-${Date.now()}` })
            }
            speak(speechText)
        }
    } catch (err) {
        console.error('Error notificación pedido modificado:', err)
    }
}

const handleOrderModified = async (payload: any) => {
    const data = payload?.order ?? payload
    const kind = typeof payload?.modificationKind === 'string' ? payload.modificationKind : 'content'
    const kitchenChanges = payload?.kitchenChanges as KitchenOrderModificationSummary | undefined
    const prev = data?.id ? allOrders.value.find((o) => o.id === data.id) : undefined
    const visible = prev ? KitchenService.isVisibleToActiveKitchenForAlerts(prev) : false
    if (!data?.id) return
    if (prev && visible) {
        await notifyKitchenOrderModified(data, kind, kitchenChanges)
    }
    await loadOrders()
}

const handleOrderCancelled = async (payload: any) => {
    const orderId = typeof payload?.orderId === 'number' ? payload.orderId : Number(payload?.orderId)
    if (!Number.isFinite(orderId)) return
    orderItemsMap.value.delete(orderId)
    if (cardGridRef.value) cardGridRef.value.clearSelection()
    error(
        `Pedido #${orderId} cancelado`,
        typeof payload?.reasonPreview === 'string' && payload.reasonPreview.trim()
            ? payload.reasonPreview.trim()
            : 'El pedido fue cancelado.',
        8000
    )
    if (soundEnabled.value) {
        speak(`Pedido número ${orderId} cancelado.`)
    }
    await loadOrders()
}

const handleChangeStatus = (orderIds: number[], newStatus: OrderStatus) => {
    const selectedOrders = allOrders.value.filter(o => orderIds.includes(o.id))

    if (newStatus === 'ready') {
        confirmChainTakenToReady.value = combinedKitchenMode.value
        ordersToConfirm.value = selectedOrders
        showConfirmModal.value = true
    } else {
        executeStatusChange(orderIds, newStatus)
    }
}

const executeStatusChange = async (orderIds: number[], newStatus: OrderStatus) => {
    try {
        isLoading.value = true

        for (const orderId of orderIds) {
            await ordersStore.updateStatus(orderId, newStatus)
        }

        success(`${orderIds.length} pedido(s) actualizado(s)`, 5000)
        await loadOrders()

        if (cardGridRef.value) {
            cardGridRef.value.clearSelection()
        }
    } catch (err: any) {
        error('Error al cambiar estado', err.message)
    } finally {
        isLoading.value = false
    }
}

const handleModalUpdated = async () => {
    await loadOrders()
    if (cardGridRef.value) {
        cardGridRef.value.clearSelection()
    }
}

const closeConfirmModal = () => {
    showConfirmModal.value = false
    ordersToConfirm.value = []
    confirmChainTakenToReady.value = false
}

const refreshOrders = async () => {
    await loadOrders()
}

const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    if (soundEnabled.value) {
        speak('Listo')
    } else {
        cancel()
    }
}

const handleReprint = async (orderId: number) => {
    const branchId = authStore.user?.branchId
    if (!branchId) {
        error('Sin sucursal', 'Tu usuario no tiene sucursal asignada.')
        return
    }
    try {
        const res = await printJobsApi.enqueueKitchenJob(branchId, [orderId])
        if (!res.isSuccess) {
            error('Reimpresión', res.message || 'No se pudo encolar la comanda.')
            return
        }
        success('Comanda en cola', 3500, 'El agente de impresión la emitirá en breve.')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo encolar la reimpresión.'
        error('Reimpresión', msg)
    }
}

onMounted(async () => {
    if (authStore.userRole !== 'Kitchen' && authStore.userRole !== 'Admin' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }

    if (permission.value === 'default') {
        await requestPermission()
    }

    await loadOrders()

    // Evita handlers duplicados (p. ej. HMR o remount) que disparen TTS varias veces por el mismo evento.
    off('NewOrder')
    off('ReservationReady')
    off('OrderModified')
    off('OrderCancelled')
    on('NewOrder', handleNewOrder)
    on('ReservationReady', handleReservationReady)
    on('OrderModified', handleOrderModified)
    on('OrderCancelled', handleOrderCancelled)
})
</script>

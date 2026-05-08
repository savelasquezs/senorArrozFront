<template>
    <MainLayout>
        <div class="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            <!-- PestaÃ±as + barra de cocina (solo rol Kitchen) en la misma franja -->
            <div
                class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3 border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0"
            >
                <!-- PestaÃ±as: scroll solo en esta franja (sin envolver al checkbox) para no mostrar barra rara entre check y "Conectado" -->
                <div class="-mb-px flex min-w-0 flex-1 items-end gap-2 sm:gap-3">
                    <nav
                        class="kitchen-tabs-nav min-w-0 flex-1 flex items-end space-x-4 sm:space-x-6 overflow-x-auto overflow-y-hidden"
                        aria-label="Vistas de cocina">
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

                        <button type="button" @click="activeTab = 'hourly_summary'" :class="[
                            'py-2 sm:py-2.5 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0',
                            activeTab === 'hourly_summary'
                                ? 'border-amber-500 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        ]">
                            <span>Resumen por hora</span>
                            <span v-if="hourlySummary.hourSlots.length > 0"
                                class="ml-1.5 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs bg-amber-100 text-amber-700">
                                {{ hourlySummary.hourSlots.length }}
                            </span>
                        </button>
                    </nav>

                    <div v-if="activeTab === 'active'" class="flex flex-shrink-0 items-end pb-2 sm:pb-2.5 -mb-px">
                        <label
                            class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-800 cursor-pointer select-none whitespace-nowrap"
                            title="Agrupa Tomado y En preparaciÃ³n en un solo bloque">
                            <input v-model="combinedKitchenMode" type="checkbox"
                                class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span class="font-medium">Modo combinado</span>
                        </label>
                    </div>
                </div>

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
                    No hay reservas del dÃ­a en Â«TomadoÂ» pendientes de hora. Al llegar la hora de cocina o al pasar a preparaciÃ³n aparecen en Pedidos activos.
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

            <div v-else-if="activeTab === 'hourly_summary'" class="space-y-3 sm:space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div class="w-full sm:w-52">
                            <BaseInput v-model="summaryDate" type="date" label="Fecha" />
                        </div>
                        <div class="text-xs sm:text-sm text-gray-500">
                            <span v-if="hourlySummary.totalOrderCount > 0">
                                {{ hourlySummary.totalOrderCount }} pedido(s) en Tomado / En preparación
                            </span>
                            <span v-else-if="!summaryLoading">
                                No hay pedidos para la fecha seleccionada.
                            </span>
                            <span v-else>
                                Cargando resumen...
                            </span>
                        </div>
                    </div>
                </div>

                <div v-if="summaryLoading"
                    class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                    Cargando resumen por hora...
                </div>

                <template v-else>
                    <div v-if="canViewDailyCategorySummary"
                        class="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <h2 class="text-sm sm:text-base font-semibold text-gray-900">
                                    Resumen del día
                                </h2>
                                <p class="mt-1 text-xs sm:text-sm text-gray-500">
                                    Acumulado por categoría para la fecha seleccionada
                                </p>
                            </div>
                            <span v-if="dailyCategorySummary.length > 0"
                                class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-amber-700">
                                {{ dailyCategorySummary.length }} categoría(s)
                            </span>
                        </div>

                        <div v-if="dailyCategorySummary.length > 0"
                            class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <article v-for="group in dailyCategorySummary" :key="group.key"
                                class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div class="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
                                    <div class="min-w-0">
                                        <h3 class="text-sm font-semibold text-gray-900 break-words">
                                            {{ group.title }}
                                        </h3>
                                    </div>
                                    <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] sm:text-xs font-medium text-gray-600">
                                        {{ group.totalQuantity }}
                                    </span>
                                </div>

                                <div class="mt-3 space-y-2">
                                    <div v-for="line in group.lines" :key="line.name"
                                        class="flex items-start justify-between gap-3 text-sm">
                                        <span class="font-semibold text-gray-900 tabular-nums">
                                            {{ line.quantity }}
                                        </span>
                                        <span class="min-w-0 flex-1 text-right text-gray-700 break-words">
                                            {{ line.name }}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </div>

                        <p v-else class="mt-3 text-sm text-gray-500">
                            No hay productos para resumir en la fecha seleccionada.
                        </p>
                    </div>

                    <div v-if="hourlySummary.hourSlots.length > 0"
                        class="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Horas con pedidos
                        </p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button
                                v-for="slot in hourlySummary.hourSlots"
                                :key="slot.key"
                                type="button"
                                @click="selectedSummaryHourKey = slot.key"
                                :class="[
                                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors',
                                    selectedSummaryHourKey === slot.key
                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800',
                                ]">
                                <span>{{ slot.label }}</span>
                                <span class="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] sm:text-xs">
                                    {{ slot.orderCount }}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div v-if="selectedSummaryGroups.length > 0"
                        class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <article v-for="group in selectedSummaryGroups" :key="group.key"
                            class="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                            <div class="flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
                                <div class="min-w-0">
                                    <h3 class="text-sm sm:text-base font-semibold text-gray-900 break-words">
                                        {{ group.title }}
                                    </h3>
                                </div>
                                <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-gray-600">
                                    {{ group.totalQuantity }}
                                </span>
                            </div>

                            <div class="mt-3 space-y-2">
                                <div v-for="line in group.lines" :key="line.name"
                                    class="flex items-start justify-between gap-3 text-sm">
                                    <span class="font-semibold text-gray-900 tabular-nums">
                                        {{ line.quantity }}
                                    </span>
                                    <span class="min-w-0 flex-1 text-right text-gray-700 break-words">
                                        {{ line.name }}
                                    </span>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div v-else-if="hourlySummary.hourSlots.length > 0"
                        class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                        La hora seleccionada no tiene líneas para resumir.
                    </div>

                    <div v-else
                        class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                        No hay horas con pedidos en Tomado o En preparación para la fecha seleccionada.
                    </div>
                </template>
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
import { buildKitchenHourlySummary, buildKitchenDailyCategorySummary } from '@/composables/useKitchenHourlySummary'
import { KitchenService } from '@/services/domain/KitchenService'
import { orderApi } from '@/services/MainAPI/orderApi'
import type { KitchenOrderModificationSummary } from '@/types/kitchenModification'
import { printJobsApi } from '@/services/MainAPI/printJobsApi'
import type { OrderListItem, OrderDetailItem, OrderStatus } from '@/types/order'
import { defaultBusinessCalendar } from '@/utils/datetime'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'
import ReadyOrdersTable from '@/components/kitchen/ReadyOrdersTable.vue'
import ConfirmStatusChangeModal from '@/components/kitchen/ConfirmStatusChangeModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
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

const activeTab = ref<'scheduled' | 'active' | 'ready' | 'hourly_summary'>('active')
const soundEnabled = ref(true)
const isLoading = ref(false)
const summaryLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToConfirm = ref<OrderListItem[]>([])
/** Copia de `combinedKitchenMode` al abrir el modal (confirmaciÃ³n encadenada a Listo). */
const confirmChainTakenToReady = ref(false)
const orderItemsMap = ref(new Map<number, OrderDetailItem[]>())
const cardGridRef = ref<InstanceType<typeof OrderCardGrid> | null>(null)
const summaryOrders = ref<OrderListItem[]>([])
const summaryDate = ref(defaultBusinessCalendar.todayYmd())
const selectedSummaryHourKey = ref('')
const canViewDailyCategorySummary = computed(() => authStore.isAdmin || authStore.isSuperadmin)

/** Ids cuyo due de cocina ya anunciÃ³ el servidor (ReservationReady) pero el reloj local podrÃ­a aÃºn considerar â€œpendiente de horaâ€. Alinea lista activa con el backend. */
const reservationServerDue = ref<Set<number>>(new Set())

const allOrders = computed(() => ordersStore.list?.items || [])

/** Reservas del dÃ­a en Â«TomadoÂ» cuya hora de cocina aÃºn no llegÃ³ (prepareAt o reservedForâˆ’1h); luego pasan a Pedidos activos. */
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
const hourlySummary = computed(() =>
    buildKitchenHourlySummary(summaryOrders.value, orderItemsMap.value, summaryDate.value),
)
const dailyCategorySummary = computed(() =>
    buildKitchenDailyCategorySummary(summaryOrders.value, orderItemsMap.value, summaryDate.value),
)
const selectedSummaryGroups = computed(
    () => hourlySummary.value.groupedByHour[selectedSummaryHourKey.value] ?? [],
)

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
        // Quitar override cuando el cliente ya considera vencida la hora de cocina (reloj alineado o usuario pasÃ³ a preparaciÃ³n).
        reservationServerDue.value = new Set(
            [...reservationServerDue.value].filter((id) => {
                const o = allOrders.value.find((x) => x.id === id)
                if (!o) return false
                return KitchenService.isReservationTakenPendingKitchenTime(o)
            })
        )
        if (activeTab.value === 'hourly_summary') {
            await loadSummaryOrders()
        }
    } catch (err: any) {
        error('Error al cargar pedidos', err.message)
    } finally {
        isLoading.value = false
    }
}

const ensureOrderDetails = async (orderIds: number[]) => {
    const uniqueIds = [...new Set(orderIds)]
    const idsToFetch = uniqueIds.filter((id) => !orderItemsMap.value.has(id))
    if (idsToFetch.length === 0) return

    const results = await Promise.allSettled(idsToFetch.map((id) => orderApi.fetchDetail(id)))
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            orderItemsMap.value.set(idsToFetch[index]!, [...(result.value.orderDetails || [])])
        } else {
            console.error(`Error loading details for order ${idsToFetch[index]}:`, result.reason)
        }
    })
}

const loadOrderDetails = async () => {
    await ensureOrderDetails(allOrders.value.map((order) => order.id))
}

const loadSummaryOrders = async () => {
    const branchId = authStore.user?.branchId
    if (!branchId) {
        summaryOrders.value = []
        selectedSummaryHourKey.value = ''
        return
    }

    const merged = new Map<number, OrderListItem>()
    const pageSize = 200

    try {
        summaryLoading.value = true

        for (const status of ['taken', 'inPreparation']) {
            let page = 1
            let totalPages = 1

            do {
                const response = await orderApi.searchOrders({
                    branchId,
                    status,
                    page,
                    pageSize,
                })

                for (const order of response.items) {
                    merged.set(order.id, order)
                }

                totalPages = response.totalPages || 1
                page += 1
            } while (page <= totalPages)
        }

        summaryOrders.value = [...merged.values()]
        await ensureOrderDetails(summaryOrders.value.map((order) => order.id))
    } catch (err: any) {
        summaryOrders.value = []
        selectedSummaryHourKey.value = ''
        error('Error al cargar resumen cocina', err.message)
    } finally {
        summaryLoading.value = false
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
        const speechText = KitchenService.generateOrderSpeechText(
            order,
            products,
            ordersStore.current.notes ?? null
        )

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

/** NotificaciÃ³n TTS + navegador; actualiza Ã­tems en mapa desde API. */
const notifyKitchenOrderModified = async (
    orderData: any,
    modificationKind: string,
    kitchenChanges: KitchenOrderModificationSummary | undefined
) => {
    const oid = orderData?.id
    const prev = oid ? allOrders.value.find((o) => o.id === oid) : undefined
    const scheduleAnnouncement = kitchenChanges?.scheduleChanged === true
    let skip = ''
    if (!oid) skip = 'no_order_id'
    else if (!prev && !scheduleAnnouncement) skip = 'no_prev_in_list'
    else if (!scheduleAnnouncement && prev && prev.status !== 'taken' && prev.status !== 'in_preparation') skip = `bad_status:${prev.status}`
    else if (!scheduleAnnouncement && prev && !KitchenService.isVisibleToActiveKitchenForAlerts(prev)) skip = 'not_visible_reservation_window'
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
        console.error('Error notificaciÃ³n pedido modificado:', err)
    }
}

const handleOrderModified = async (payload: any) => {
    const data = payload?.order ?? payload
    const kind = typeof payload?.modificationKind === 'string' ? payload.modificationKind : 'content'
    const kitchenChanges = payload?.kitchenChanges as KitchenOrderModificationSummary | undefined
    const prev = data?.id ? allOrders.value.find((o) => o.id === data.id) : undefined
    const visible = prev ? KitchenService.isVisibleToActiveKitchenForAlerts(prev) : false
    if (!data?.id) return
    if ((prev && visible) || kitchenChanges?.scheduleChanged) {
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
        speak(`Pedido nÃºmero ${orderId} cancelado.`)
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
            error('ReimpresiÃ³n', res.message || 'No se pudo encolar la comanda.')
            return
        }
        success('Comanda en cola', 3500, 'El agente de impresiÃ³n la emitirÃ¡ en breve.')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo encolar la reimpresiÃ³n.'
        error('ReimpresiÃ³n', msg)
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
watch(
    () => hourlySummary.value.defaultHourKey,
    (defaultHourKey) => {
        if (!hourlySummary.value.hourSlots.length) {
            selectedSummaryHourKey.value = ''
            return
        }
        if (!hourlySummary.value.hourSlots.some((slot) => slot.key === selectedSummaryHourKey.value)) {
            selectedSummaryHourKey.value = defaultHourKey
        }
    },
    { immediate: true },
)

watch(
    [activeTab, summaryDate],
    async ([tab]) => {
        if (tab !== 'hourly_summary') return
        await loadSummaryOrders()
    },
)
</script>

<style scoped>
/* Scroll horizontal solo en las pestaÃ±as, sin barra/rueditas nativas visibles (no aporta y confunde). */
.kitchen-tabs-nav {
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.kitchen-tabs-nav::-webkit-scrollbar {
    display: none;
}
</style>







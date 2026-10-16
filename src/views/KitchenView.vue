<template>
    <MainLayout>
        <div class="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            <div v-if="(authStore.isKitchen || authStore.isAdmin || authStore.isSuperadmin) && !soundReady"
                class="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span>{{ voiceError || 'La voz no está activa. Chrome requiere un clic para anunciar los pedidos.' }}</span>
                <button type="button" class="font-semibold underline whitespace-nowrap" :disabled="soundActivating" @click="toggleSound">Activar voz</button>
            </div>
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

                <div v-if="authStore.isKitchen || authStore.isAdmin || authStore.isSuperadmin"
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
                    <button type="button" @click="toggleSound" :disabled="soundActivating" :class="[
                        'flex items-center gap-1 p-1 rounded-md transition-colors',
                        soundReady ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'
                    ]" :title="soundReady ? 'Desactivar sonido' : 'Activar sonido y probar voz'">
                        <component :is="soundReady ? SpeakerWaveIcon : SpeakerXMarkIcon" class="w-4 h-4 sm:w-5 sm:h-5" />
                        <span class="text-[11px]">{{ soundReady ? 'Voz lista' : 'Activar voz' }}</span>
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
                <ReadyOrdersTable :orders="readyOrders" :order-items-map="orderItemsMap"
                    :can-return-to-preparation="authStore.isAdmin || authStore.isSuperadmin"
                    @reprint="handleReprint" @return-to-preparation="handleReturnToPreparation" />
            </div>

            <div v-else-if="activeTab === 'hourly_summary'" class="space-y-3 sm:space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div class="w-full sm:w-52">
                            <BaseDatePicker v-model="summaryDate" label="Fecha" variant="compact" />
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useOrdersDataStore } from '@/store/ordersData'
import { useBranchContextStore } from '@/store/branchContext'
import { syncKitchenPageDetails } from '@/helpers/kitchenPageDetails'
import { useSignalR } from '@/composables/useSignalR'
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useNotifications } from '@/composables/useNotifications'
import { useToast } from '@/composables/useToast'
import { buildKitchenHourlySummary, buildKitchenDailyCategorySummary } from '@/composables/useKitchenHourlySummary'
import { KitchenService } from '@/services/domain/KitchenService'
import { orderApi } from '@/services/MainAPI/orderApi'
import type { KitchenOrderModificationSummary } from '@/types/kitchenModification'
import { printJobsApi } from '@/services/MainAPI/printJobsApi'
import type { OrderListItem, OrderDetailItem, OrderStatus, KitchenSummaryOrder } from '@/types/order'
import { defaultBusinessCalendar } from '@/utils/datetime'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'
import ReadyOrdersTable from '@/components/kitchen/ReadyOrdersTable.vue'
import ConfirmStatusChangeModal from '@/components/kitchen/ConfirmStatusChangeModal.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowPathIcon, SpeakerWaveIcon, SpeakerXMarkIcon, BellIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const ordersStore = useOrdersDataStore()
const branchStore = useBranchContextStore()
const { success, error } = useToast()
const { speak, cancel, lastError: ttsError } = useTextToSpeech()
const { permission, requestPermission, notify } = useNotifications()

const { isConnected, on, off, connect, disconnect } = useSignalR(ORDERS_SIGNALR_HUB_URL)
const kitchenBranchId = computed(() => branchStore.selectedBranchId || authStore.user?.branchId || 0)

const KITCHEN_COMBINED_MODE_KEY = 'senorarroz.kitchen.combinedMode'
const combinedKitchenMode = ref(
    typeof localStorage !== 'undefined' && localStorage.getItem(KITCHEN_COMBINED_MODE_KEY) === '1'
)
watch(combinedKitchenMode, (v) => {
    localStorage.setItem(KITCHEN_COMBINED_MODE_KEY, v ? '1' : '0')
})

const activeTab = ref<'scheduled' | 'active' | 'ready' | 'hourly_summary'>('active')
const soundEnabled = ref(false)
const soundReady = ref(false)
const soundActivating = ref(false)
const voiceError = ref<string | null>(null)
const isLoading = ref(false)
const summaryLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToConfirm = ref<OrderListItem[]>([])
/** Copia de `combinedKitchenMode` al abrir el modal (confirmaciÃ³n encadenada a Listo). */
const confirmChainTakenToReady = ref(false)
const orderItemsMap = ref(new Map<number, OrderDetailItem[]>())
const cardGridRef = ref<InstanceType<typeof OrderCardGrid> | null>(null)
const summaryOrders = ref<KitchenSummaryOrder[]>([])
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

// Kitchen must load every eligible order, not silently truncate the last 100.
const KITCHEN_PAGE_SIZE = 100
let kitchenLoadInFlight: Promise<void> | null = null
let kitchenReloadRequested = false

const loadKitchenPage = async () => {
    try {
        isLoading.value = true
        const filters = {
            branchId: kitchenBranchId.value,
            page: 1,
            pageSize: KITCHEN_PAGE_SIZE,
            sortBy: 'id',
            sortOrder: 'asc' as const,
            forKitchen: true,
        }
        const first = await orderApi.getOrders(filters)
        const byId = new Map<number, OrderListItem>()
        const addPage = (items: typeof first.items) => {
            for (const order of items) byId.set(order.id, order as unknown as OrderListItem)
        }
        addPage(first.items)
        const totalPages = Math.max(1, first.totalPages ?? Math.ceil(first.totalCount / KITCHEN_PAGE_SIZE))
        for (let page = 2; page <= totalPages; page++) {
            const response = await orderApi.getOrders({ ...filters, page })
            addPage(response.items)
        }

        // Publish one complete snapshot, rather than flashing a partial first page.
        const complete = [...byId.values()]
        ordersStore.list = { ...first, items: complete }
        await loadOrderDetails()
        reservationServerDue.value = new Set(
            [...reservationServerDue.value].filter((id) => {
                const o = complete.find((x) => x.id === id)
                return o != null && KitchenService.isReservationTakenPendingKitchenTime(o)
            }),
        )
        if (activeTab.value === 'hourly_summary') await loadSummaryOrders()
    } catch (err: any) {
        error('Error al cargar pedidos', err.message)
    } finally {
        isLoading.value = false
    }
}

// Serializes SignalR/refresh loads. Changes while fetching schedule exactly one
// additional current snapshot; stale results cannot be the final displayed state.
const loadOrders = (): Promise<void> => {
    kitchenReloadRequested = true
    if (kitchenLoadInFlight) return kitchenLoadInFlight
    const running = (async () => {
        while (kitchenReloadRequested) {
            kitchenReloadRequested = false
            await loadKitchenPage()
        }
    })()
    kitchenLoadInFlight = running
    void running.then(
        () => { if (kitchenLoadInFlight === running) kitchenLoadInFlight = null },
        () => { if (kitchenLoadInFlight === running) kitchenLoadInFlight = null },
    )
    return running
}

const ensureOrderDetails = async (orderIds: number[]) => {
    const uniqueIds = [...new Set(orderIds)]
    const idsToFetch = uniqueIds.filter((id) => !orderItemsMap.value.has(id))
    if (idsToFetch.length === 0) return

    // Only the legacy backend needs per-order fallback. Bound concurrent
    // requests to avoid saturating the browser/backend during an old deployment.
    for (let offset = 0; offset < idsToFetch.length; offset += 5) {
        const batch = idsToFetch.slice(offset, offset + 5)
        const results = await Promise.allSettled(batch.map((id) => orderApi.fetchDetail(id)))
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                orderItemsMap.value.set(batch[index]!, [...(result.value.orderDetails || [])])
            } else {
                console.error(`Error loading details for order ${batch[index]}:`, result.reason)
            }
        })
    }
}

const loadOrderDetails = async () => {
    // Missing field = older backend; empty array = legitimate order with no lines.
    const missingIds = syncKitchenPageDetails(allOrders.value, orderItemsMap.value)
    await ensureOrderDetails(missingIds)
}

let latestSummaryRequest = 0
const summaryInFlight = new Map<string, Promise<KitchenSummaryOrder[]>>()

function kitchenSummaryOnce(date: string, branchId: number) {
    const key = `${branchId}:${date}`
    const previous = summaryInFlight.get(key)
    if (previous) return previous
    const pending = orderApi.getKitchenSummary(date, branchId)
    summaryInFlight.set(key, pending)
    const clear = () => { if (summaryInFlight.get(key) === pending) summaryInFlight.delete(key) }
    void pending.then(clear, clear)
    return pending
}

const loadSummaryOrders = async () => {
    const branchId = kitchenBranchId.value
    const request = ++latestSummaryRequest
    if (!branchId) {
        summaryOrders.value = []
        selectedSummaryHourKey.value = ''
        return
    }

    try {
        summaryLoading.value = true
        const page = await kitchenSummaryOnce(summaryDate.value, branchId)
        if (request !== latestSummaryRequest) return
        summaryOrders.value = page
        const missing = syncKitchenPageDetails(page, orderItemsMap.value)
        await ensureOrderDetails(missing)
    } catch (err: any) {
        if (request !== latestSummaryRequest) return
        if (err?.response?.status === 404) {
            // While deploying backend first, preserve the previous summary flow
            // until /orders/kitchen-summary becomes available.
            try {
                const merged = new Map<number, OrderListItem>()
                const pageSize = 200
                for (const status of ['taken', 'inPreparation']) {
                    let page = 1
                    let totalPages = 1
                    do {
                        const response = await orderApi.searchOrders({
                            branchId, status, page, pageSize,
                        })
                        if (request !== latestSummaryRequest) return
                        for (const order of response.items) merged.set(order.id, order)
                        totalPages = response.totalPages || 1
                        page += 1
                    } while (page <= totalPages)
                }
                // The older endpoint does not embed line details.
                const previous = [...merged.values()]
                summaryOrders.value = previous.map(o => ({
                    id: o.id, status: o.status, createdAt: o.createdAt,
                    prepareAt: o.prepareAt, kitchenDetails: [],
                }))
                await ensureOrderDetails(previous.map(o => o.id))
            } catch (legacyError: any) {
                if (request === latestSummaryRequest)
                    error('Error al cargar resumen cocina', legacyError.message)
            }
        } else {
            summaryOrders.value = []
            selectedSummaryHourKey.value = ''
            error('Error al cargar resumen cocina', err.message)
        }
    } finally {
        if (request === latestSummaryRequest) summaryLoading.value = false
    }
}

type VoiceEvent = { id: number; orderId: number; branchId: number; kind: 'new' | 'reservation' }
let voiceSyncInFlight: Promise<void> | null = null
let voiceSyncRequested = false
let kitchenMounted = false
let voiceCheckTimer: number | undefined
let initialKitchenLoadDone = false

const cursorKey = () => `senor-arroz:kitchen-voice:${authStore.user?.id ?? 0}:${kitchenBranchId.value}`
const readCursor = (key: string): number | undefined => {
    const stored = localStorage.getItem(key)
    if (stored === null) return undefined
    const value = Number(stored)
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

const announceVoiceEvent = async (event: VoiceEvent): Promise<boolean> => {
    // Reuse kitchen's batched details; only ask for one order when absent.
    const order = allOrders.value.find(o => o.id === event.orderId)
    let details = orderItemsMap.value.get(event.orderId)
    let notes = order?.notes ?? null
    if (!details) {
        const full = await orderApi.fetchDetail(event.orderId)
        details = full.orderDetails ?? []
        notes = full.notes ?? null
        orderItemsMap.value.set(event.orderId, details)
    }
    const products = details.map(item => ({ name: item.productName, quantity: item.quantity }))
    const baseText = KitchenService.generateOrderSpeechText(
        (order ?? { id: event.orderId }) as OrderListItem, products, notes,
    )
    const text = event.kind === 'reservation'
        ? baseText.replace(/^Nuevo pedido/, 'Reserva lista para cocina')
        : baseText
    const played = await speak(text)
    if (played && permission.value === 'granted') {
        notify(event.kind === 'reservation' ? `Reserva #${event.orderId}` : `Nuevo pedido #${event.orderId}`, {
            body: products.map(p => `${p.quantity}x ${p.name}`).join(', '),
            tag: `kitchen-voice-${event.id}`,
        })
    }
    return played
}

// WebSocket events are hints. Durable event IDs and local cursor prevent loss and duplication.
const syncVoiceEvents = (): Promise<void> => {
    voiceSyncRequested = true
    if (voiceSyncInFlight) return voiceSyncInFlight
    const run = (async () => {
        while (voiceSyncRequested && kitchenMounted && soundEnabled.value && soundReady.value) {
            voiceSyncRequested = false
            const key = cursorKey()
            const branchId = kitchenBranchId.value
            if (!branchId || !navigator.onLine) return
            try {
                let after = readCursor(key)
                let more: boolean
                do {
                    const feed = await orderApi.getKitchenVoiceEvents(after, branchId)
                    for (const event of feed.events) {
                        if (!kitchenMounted || !soundEnabled.value || !soundReady.value) return
                        if (event.branchId !== branchId || cursorKey() !== key) return
                        if (event.id <= (readCursor(key) ?? 0)) continue
                        const played = await announceVoiceEvent(event)
                        if (!played) {
                            if (soundEnabled.value) {
                                soundReady.value = false
                                voiceError.value = `No se pudo reproducir el anuncio. ${ttsError.value ?? 'Activa la voz de nuevo.'}`
                            }
                            return
                        }
                        localStorage.setItem(key, String(event.id))
                    }
                    if (feed.cursor > (readCursor(key) ?? 0))
                        localStorage.setItem(key, String(feed.cursor))
                    after = readCursor(key)
                    more = feed.hasMore
                } while (more && kitchenMounted && soundReady.value)
                voiceError.value = null
            } catch (cause) {
                console.error('Error recuperando avisos de cocina:', cause)
                voiceError.value = 'No se pudieron sincronizar los avisos; se reintentará automáticamente.'
            }
        }
    })()
    voiceSyncInFlight = run
    void run.finally(() => {
        if (voiceSyncInFlight === run) voiceSyncInFlight = null
        if (voiceSyncRequested && kitchenMounted && soundEnabled.value && soundReady.value)
            void syncVoiceEvents()
    })
    return run
}

// Combine events received in the same JavaScript turn before beginning an HTTP refresh.
let scheduledEventRefresh: Promise<void> | null = null
const refreshAfterKitchenEvent = (): Promise<void> => {
    if (scheduledEventRefresh) return scheduledEventRefresh
    const pending = Promise.resolve().then(() => loadOrders())
    scheduledEventRefresh = pending
    void pending.then(
        () => { if (scheduledEventRefresh === pending) scheduledEventRefresh = null },
        () => { if (scheduledEventRefresh === pending) scheduledEventRefresh = null },
    )
    return pending
}

const handleNewOrder = async (_orderData: any) => {
    void syncVoiceEvents()
    await refreshAfterKitchenEvent()
}

const handleReservationReady = async (orderData: any) => {
    const oid = Number(orderData?.id)
    if (Number.isSafeInteger(oid))
        reservationServerDue.value = new Set([...reservationServerDue.value, oid])
    void syncVoiceEvents()
    await refreshAfterKitchenEvent()
}

/** NotificaciÃ³n TTS + navegador; actualiza Ã­tems en mapa desde API. */
const notifyKitchenOrderModified = async (
    orderData: any,
    modificationKind: string,
    kitchenChanges: KitchenOrderModificationSummary | undefined,
    previousOrder?: OrderListItem,
) => {
    const oid = orderData?.id
    const prev = previousOrder ?? (oid ? allOrders.value.find((o) => o.id === oid) : undefined)
    const scheduleAnnouncement = kitchenChanges?.scheduleChanged === true
    let skip = ''
    if (!oid) skip = 'no_order_id'
    else if (!prev && !scheduleAnnouncement) skip = 'no_prev_in_list'
    else if (!scheduleAnnouncement && prev && prev.status !== 'taken' && prev.status !== 'in_preparation') skip = `bad_status:${prev.status}`
    else if (!scheduleAnnouncement && prev && !KitchenService.isVisibleToActiveKitchenForAlerts(prev)) skip = 'not_visible_reservation_window'
    if (skip || !prev) return

    try {
        // A refreshed kitchen page already contains current notes, product lines
        // and quantities; do not issue another full /orders/{id}/details request.
        const current = allOrders.value.find(o => o.id === orderData.id)
        let orderNotes = current?.notes ?? null
        if (!current || !orderItemsMap.value.has(orderData.id)) {
            await ordersStore.fetchById(orderData.id)
            if (!ordersStore.current) return
            orderItemsMap.value.set(orderData.id, [...(ordersStore.current.orderDetails || [])])
            orderNotes = ordersStore.current.notes ?? null
        }
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

        if (soundEnabled.value && soundReady.value) {
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
    await refreshAfterKitchenEvent()
    if ((prev && visible) || kitchenChanges?.scheduleChanged)
        await notifyKitchenOrderModified(data, kind, kitchenChanges, prev)
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
    if (soundEnabled.value && soundReady.value) {
        void speak(`Pedido nÃºmero ${orderId} cancelado.`)
    }
    await refreshAfterKitchenEvent()
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

const toggleSound = async () => {
    if (soundReady.value) {
        soundEnabled.value = false
        soundReady.value = false
        cancel()
        return
    }
    soundActivating.value = true
    voiceError.value = null
    try {
        // Only a real click can unlock browser speech autoplay.
        const audible = await speak('Listo')
        soundEnabled.value = audible
        soundReady.value = audible
        if (!audible) voiceError.value = `Chrome no permitió la voz: ${ttsError.value ?? 'revisa el volumen.'}`
        else void syncVoiceEvents()
    } finally {
        soundActivating.value = false
    }
}

const handleReprint = async (orderId: number) => {
    const branchId = kitchenBranchId.value
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

const handleReturnToPreparation = async (orderId: number) => {
    if (!authStore.isAdmin && !authStore.isSuperadmin) {
        error('Sin permisos', 'Solo un administrador puede devolver pedidos a preparación.')
        return
    }
    await executeStatusChange([orderId], 'in_preparation')
}

onMounted(async () => {
    if (authStore.userRole !== 'Kitchen' && authStore.userRole !== 'Admin' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }
    kitchenMounted = true
    // Attach events before permission prompts or slow HTTP loads.
    off('NewOrder')
    off('ReservationReady')
    off('OrderModified')
    off('OrderCancelled')
    on('NewOrder', handleNewOrder)
    on('ReservationReady', handleReservationReady)
    on('OrderModified', handleOrderModified)
    on('OrderCancelled', handleOrderCancelled)
    voiceCheckTimer = window.setInterval(() => { void syncVoiceEvents() }, 60_000)
    window.addEventListener('online', resumeKitchenAlerts)
    document.addEventListener('visibilitychange', resumeKitchenAlerts)
    await loadOrders()
    initialKitchenLoadDone = true
})

const resumeKitchenAlerts = () => {
    if (!kitchenMounted || !navigator.onLine || document.visibilityState === 'hidden') return
    void syncVoiceEvents()
    void refreshAfterKitchenEvent()
}

watch(isConnected, connected => {
    if (!connected || !kitchenMounted) return
    void syncVoiceEvents()
    if (initialKitchenLoadDone) void refreshAfterKitchenEvent()
})

// The shared websocket must join the new branch group after Superadmin switches.
watch(() => branchStore.revision, async () => {
    if (!kitchenMounted || !authStore.isSuperadmin) return
    cancel()
    soundReady.value = false
    soundEnabled.value = false
    await disconnect()
    await connect()
    await loadOrders()
})

onUnmounted(() => {
    kitchenMounted = false
    if (voiceCheckTimer !== undefined) window.clearInterval(voiceCheckTimer)
    window.removeEventListener('online', resumeKitchenAlerts)
    document.removeEventListener('visibilitychange', resumeKitchenAlerts)
    off('NewOrder', handleNewOrder)
    off('ReservationReady', handleReservationReady)
    off('OrderModified', handleOrderModified)
    off('OrderCancelled', handleOrderCancelled)
    cancel()
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







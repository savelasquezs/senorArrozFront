<template>
    <div :class="embedded ? 'mt-0' : ''" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div :class="embedded ? 'px-4 py-3' : 'px-6 py-4'" class="border-b border-gray-100 bg-slate-50">
            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h3 class="text-base font-semibold text-gray-900">
                        {{ embedded ? 'Movimientos del período' : 'Movimientos por período' }}
                    </h3>
                    <p v-if="!lockDateRange" class="text-xs text-gray-500 mt-0.5">
                        Rango por días calendario (Colombia). Aplica para ver totales y listados.
                    </p>
                    <p v-else class="text-xs text-gray-500 mt-0.5">
                        Referencia de fechas del cuadre (ver nota al pie del cuadre si difiere del cierre exacto).
                    </p>
                </div>
                <div v-if="!lockDateRange" class="flex flex-wrap items-end gap-2">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-0.5">Desde</label>
                        <input v-model="fromDate" type="date"
                            class="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-0.5">Hasta</label>
                        <input v-model="toDate" type="date"
                            class="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                    </div>
                    <BaseButton variant="primary" size="sm" :loading="summaryLoading" @click="applyRange">
                        Aplicar
                    </BaseButton>
                </div>
                <div v-else class="text-sm text-gray-600">
                    {{ fromDate }} → {{ toDate }}
                </div>
            </div>
        </div>

        <div :class="embedded ? 'p-4' : 'p-6'" class="space-y-4">
            <BaseLoading v-if="summaryLoading && !periodBreakdown" />
            <p v-else-if="summaryError" class="text-sm text-red-600">{{ summaryError }}</p>

            <div v-if="periodBreakdown" class="grid grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
                <div class="rounded-lg bg-gray-50 p-2 border border-gray-100">
                    <p class="text-gray-500">+ Pagos órdenes</p>
                    <p class="font-semibold text-gray-900 tabular-nums">{{ formatCurrency(periodBreakdown.bankPaymentsIn) }}
                    </p>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 border border-gray-100">
                    <p class="text-gray-500">− Gastos</p>
                    <p class="font-semibold text-rose-700 tabular-nums">{{
                        formatCurrency(periodBreakdown.expenseBankPaymentsOut) }}</p>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 border border-gray-100">
                    <p class="text-gray-500">− Transf. salida</p>
                    <p class="font-semibold text-rose-700 tabular-nums">{{
                        formatCurrency(periodBreakdown.outgoingTransfers) }}</p>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 border border-gray-100">
                    <p class="text-gray-500">+ Transf. entrada</p>
                    <p class="font-semibold text-emerald-700 tabular-nums">{{
                        formatCurrency(periodBreakdown.incomingTransfers) }}</p>
                </div>
                <div class="rounded-lg bg-gray-50 p-2 border border-gray-100">
                    <p class="text-gray-500">+ Domiciliarios</p>
                    <p class="font-semibold text-emerald-700 tabular-nums">{{
                        formatCurrency(periodBreakdown.deliverymanBankTransferIn) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                    <p class="text-emerald-800">Neto período</p>
                    <p class="font-bold text-emerald-900 tabular-nums">{{ formatCurrency(periodBreakdown.netBalance) }}
                    </p>
                </div>
            </div>

            <div class="border-b border-gray-200">
                <nav class="flex flex-wrap gap-1 -mb-px" aria-label="Tabs">
                    <button v-for="tab in tabs" :key="tab.id" type="button" @click="selectTab(tab.id)" :class="[
                        'px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors',
                        activeTab === tab.id
                            ? 'border-indigo-600 text-indigo-700 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]">
                        {{ tab.label }}
                    </button>
                </nav>
            </div>

            <div class="min-h-[200px]">
                <BaseLoading v-if="tabLoading" />
                <p v-else-if="tabError" class="text-sm text-red-600">{{ tabError }}</p>

                <div v-else-if="activeTab === 'orders'" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Pedido</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="row in orderPayments.items" :key="row.id" class="hover:bg-gray-50">
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.id }}</td>
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <button type="button" class="text-indigo-600 hover:underline"
                                        @click="router.push(`/orders/${row.orderId}`)">
                                        #{{ row.orderId }}
                                    </button>
                                </td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.amount) }}</td>
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.isVerified ? 'Verificado' : 'Pendiente' }}
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ formatDateTime(row.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else-if="activeTab === 'expenses'" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Gasto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Proveedor</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="row in expenseLines.items" :key="row.id" class="hover:bg-gray-50">
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.id }}</td>
                                <td class="px-3 py-2 whitespace-nowrap">#{{ row.expenseHeaderId }}</td>
                                <td class="px-3 py-2">{{ row.supplierName }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.amount) }}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ formatDateTime(row.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else-if="activeTab === 'out'" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Hacia</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="row in transfersOut.items" :key="row.id" class="hover:bg-gray-50">
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.id }}</td>
                                <td class="px-3 py-2">{{ row.toBankName }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.amount) }}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ formatDateTime(row.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else-if="activeTab === 'in'" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Desde</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="row in transfersIn.items" :key="row.id" class="hover:bg-gray-50">
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.id }}</td>
                                <td class="px-3 py-2">{{ row.fromBankName }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.amount) }}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ formatDateTime(row.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else-if="activeTab === 'delivery'" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Domiciliario</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Notas</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="row in deliveryLines.items" :key="row.id" class="hover:bg-gray-50">
                                <td class="px-3 py-2 whitespace-nowrap">{{ row.id }}</td>
                                <td class="px-3 py-2">{{ row.deliverymanName }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.amount) }}</td>
                                <td class="px-3 py-2 max-w-xs truncate text-gray-600" :title="row.notes || ''">{{
                                    row.notes || '—' }}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ formatDateTime(row.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="pagination.totalPages > 1 && !tabLoading && !tabError"
                    class="flex items-center justify-between mt-3 text-sm text-gray-600">
                    <button type="button"
                        class="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        :disabled="pagination.page <= 1" @click="changePage(-1)">
                        Anterior
                    </button>
                    <span>Página {{ pagination.page }} / {{ pagination.totalPages }}</span>
                    <button type="button"
                        class="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                        :disabled="pagination.page >= pagination.totalPages" @click="changePage(1)">
                        Siguiente
                    </button>
                </div>

                <p v-if="!tabLoading && !tabError && pagination.totalCount === 0 && loadedTabs.has(activeTab)"
                    class="text-sm text-gray-500 text-center py-6">
                    Sin movimientos en este período.
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { bankApi } from '@/services/MainAPI/bankApi'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { bankTransferApi } from '@/services/MainAPI/bankTransferApi'
import type { BankBalanceBreakdown, BankPayment, DeliverymanBankAdvanceLine, ExpenseBankPaymentLine } from '@/types/bank'
import type { BankTransfer } from '@/types/cashRegister'
import { formatYmdBogota } from '@/utils/colombiaDate'
import { defaultBusinessCalendar } from '@/utils/datetime'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

type TabId = 'orders' | 'expenses' | 'out' | 'in' | 'delivery'

const props = withDefaults(
    defineProps<{
        bankId: number
        branchId?: number | null
        embedded?: boolean
        lockDateRange?: boolean
        initialFromDate?: string
        initialToDate?: string
    }>(),
    { embedded: false, lockDateRange: false }
)

const router = useRouter()
const pageSize = 15

const tabs: { id: TabId; label: string }[] = [
    { id: 'orders', label: 'Pagos órdenes' },
    { id: 'expenses', label: 'Pagos gastos' },
    { id: 'out', label: 'Transf. salida' },
    { id: 'in', label: 'Transf. entrada' },
    { id: 'delivery', label: 'Domiciliarios' },
]

const todayYmd = formatYmdBogota(new Date())
const fromDate = ref(props.lockDateRange ? props.initialFromDate || todayYmd : todayYmd)
const toDate = ref(props.lockDateRange ? props.initialToDate || todayYmd : todayYmd)

const activeTab = ref<TabId>('orders')
const loadedTabs = ref<Set<TabId>>(new Set())

const periodBreakdown = ref<BankBalanceBreakdown | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)

const tabLoading = ref(false)
const tabError = ref<string | null>(null)

const branchFilter = computed(() => props.branchId ?? undefined)

function emptyPaged<T>(): { items: T[]; page: number; totalPages: number; totalCount: number } {
    return { items: [], page: 1, totalPages: 0, totalCount: 0 }
}

const orderPayments = ref(emptyPaged<BankPayment>())
const expenseLines = ref(emptyPaged<ExpenseBankPaymentLine>())
const transfersOut = ref(emptyPaged<BankTransfer>())
const transfersIn = ref(emptyPaged<BankTransfer>())
const deliveryLines = ref(emptyPaged<DeliverymanBankAdvanceLine>())

const pagination = computed(() => {
    switch (activeTab.value) {
        case 'orders':
            return {
                page: orderPayments.value.page,
                totalPages: Math.max(1, orderPayments.value.totalPages),
                totalCount: orderPayments.value.totalCount,
            }
        case 'expenses':
            return {
                page: expenseLines.value.page,
                totalPages: Math.max(1, expenseLines.value.totalPages),
                totalCount: expenseLines.value.totalCount,
            }
        case 'out':
            return {
                page: transfersOut.value.page,
                totalPages: Math.max(1, transfersOut.value.totalPages),
                totalCount: transfersOut.value.totalCount,
            }
        case 'in':
            return {
                page: transfersIn.value.page,
                totalPages: Math.max(1, transfersIn.value.totalPages),
                totalCount: transfersIn.value.totalCount,
            }
        case 'delivery':
            return {
                page: deliveryLines.value.page,
                totalPages: Math.max(1, deliveryLines.value.totalPages),
                totalCount: deliveryLines.value.totalCount,
            }
        default:
            return { page: 1, totalPages: 0, totalCount: 0 }
    }
})

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
        value ?? 0
    )
}

function formatDateTime(iso: string) {
    return defaultBusinessCalendar.formatDateTimeCompact(iso)
}

async function loadSummary() {
    summaryLoading.value = true
    summaryError.value = null
    try {
        periodBreakdown.value = await bankApi.getBankLedgerPeriod(props.bankId, fromDate.value, toDate.value)
    } catch (e: any) {
        summaryError.value = e.message || 'Error al cargar resumen'
        periodBreakdown.value = null
    } finally {
        summaryLoading.value = false
    }
}

async function loadActiveTab(page = 1) {
    tabLoading.value = true
    tabError.value = null
    const from = fromDate.value
    const to = toDate.value
    const bf = branchFilter.value

    try {
        switch (activeTab.value) {
            case 'orders': {
                const r = await bankPaymentApi.getBankPayments({
                    bankId: props.bankId,
                    fromDate: from,
                    toDate: to,
                    page,
                    pageSize,
                    ...(bf !== undefined ? { branchId: bf } : {}),
                })
                orderPayments.value = {
                    items: r.items,
                    page: r.page,
                    totalPages: r.totalPages,
                    totalCount: r.totalCount,
                }
                break
            }
            case 'expenses': {
                const r = await bankApi.getBankExpensePaymentsPaged(props.bankId, from, to, {
                    branchId: bf,
                    page,
                    pageSize,
                })
                expenseLines.value = {
                    items: r.items,
                    page: r.page,
                    totalPages: r.totalPages,
                    totalCount: r.totalCount,
                }
                break
            }
            case 'out': {
                const r = await bankTransferApi.getBankTransfers({
                    fromBankId: props.bankId,
                    fromDate: from,
                    toDate: to,
                    page,
                    pageSize,
                    ...(bf !== undefined ? { branchId: bf } : {}),
                })
                transfersOut.value = {
                    items: r.items,
                    page: r.page,
                    totalPages: r.totalPages,
                    totalCount: r.totalCount,
                }
                break
            }
            case 'in': {
                const r = await bankTransferApi.getBankTransfers({
                    toBankId: props.bankId,
                    fromDate: from,
                    toDate: to,
                    page,
                    pageSize,
                    ...(bf !== undefined ? { branchId: bf } : {}),
                })
                transfersIn.value = {
                    items: r.items,
                    page: r.page,
                    totalPages: r.totalPages,
                    totalCount: r.totalCount,
                }
                break
            }
            case 'delivery': {
                const r = await bankApi.getBankDeliverymanTransfersPaged(props.bankId, from, to, {
                    branchId: bf,
                    page,
                    pageSize,
                })
                deliveryLines.value = {
                    items: r.items,
                    page: r.page,
                    totalPages: r.totalPages,
                    totalCount: r.totalCount,
                }
                break
            }
        }
        loadedTabs.value.add(activeTab.value)
    } catch (e: any) {
        tabError.value = e.message || 'Error al cargar movimientos'
    } finally {
        tabLoading.value = false
    }
}

function selectTab(id: TabId) {
    activeTab.value = id
    if (!loadedTabs.value.has(id)) void loadActiveTab(1)
}

function changePage(delta: number) {
    const p = pagination.value
    const next = Math.min(Math.max(1, p.page + delta), Math.max(1, p.totalPages))
    void loadActiveTab(next)
}

async function applyRange() {
    loadedTabs.value = new Set()
    await loadSummary()
    await loadActiveTab(1)
}

watch(
    () => [props.initialFromDate, props.initialToDate, props.lockDateRange] as const,
    () => {
        if (props.lockDateRange && props.initialFromDate && props.initialToDate) {
            fromDate.value = props.initialFromDate
            toDate.value = props.initialToDate
            void applyRange()
        }
    }
)

watch(
    () => props.bankId,
    () => {
        loadedTabs.value = new Set()
        void applyRange()
    }
)

onMounted(() => {
    if (props.lockDateRange && props.initialFromDate && props.initialToDate) {
        fromDate.value = props.initialFromDate
        toDate.value = props.initialToDate
    }
    void applyRange()
})
</script>

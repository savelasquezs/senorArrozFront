<template>
    <BaseDialog :model-value="open" title="Historial de pedidos" size="6xl" @update:model-value="onOpenChange">
        <div class="space-y-3">
            <p v-if="customer" class="text-xs text-gray-600">
                Cliente: <strong class="text-gray-900">{{ customer.name }}</strong>
                <span v-if="!unrestrictedDateRange" class="block mt-1 text-gray-500">
                    Periodo: desde registro del cliente ({{ registrationDateStr }}) hasta hoy (Colombia).
                </span>
                <span v-else class="block mt-1 text-gray-500">Periodo: sin filtro de fechas (todos los pedidos).</span>
            </p>

            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input v-model="unrestrictedDateRange" type="checkbox" class="rounded border-gray-300 text-emerald-600" @change="onRangeToggle" />
                Ver todo el historial (sin límite de fechas)
            </label>

            <BaseLoading v-if="loading" text="Cargando pedidos…" />

            <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {{ loadError }}
            </div>

            <template v-else>
                <p class="text-xs text-gray-500">
                    Mostrando {{ orders.length }} de {{ totalCount }} pedido(s). Incluye todos los estados.
                </p>
                <div class="border border-gray-200 rounded-lg max-h-[min(70vh,36rem)] overflow-y-auto overflow-x-auto">
                    <CustomerOrdersHistoryTable
                        :orders="orders"
                        :order-lines-by-id="orderLinesById"
                        :loading="loading"
                        :loading-details="loadingDetails" />
                </div>

                <div v-if="totalPages > 1" class="flex justify-center gap-2 pt-2">
                    <BaseButton variant="outline" size="sm" :disabled="page <= 1" @click="goPage(page - 1)">Anterior</BaseButton>
                    <span class="text-sm text-gray-600 self-center">Página {{ page }} / {{ totalPages }}</span>
                    <BaseButton variant="outline" size="sm" :disabled="page >= totalPages" @click="goPage(page + 1)">Siguiente</BaseButton>
                </div>
            </template>
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Customer } from '@/types/customer'
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerOrdersHistoryTable from '@/components/customers/CustomerOrdersHistoryTable.vue'

const props = defineProps<{
    open: boolean
    customer: Customer | null
}>()

const emit = defineEmits<{ close: [] }>()

const loading = ref(false)
const loadingDetails = ref(false)
const loadError = ref('')
const orders = ref<OrderListItem[]>([])
const orderLinesById = ref<Record<number, OrderDetailItem[] | undefined>>({})
const totalCount = ref(0)
const totalPages = ref(0)
const page = ref(1)
const pageSize = 20
/** true = sin fromDate/toDate en el API */
const unrestrictedDateRange = ref(false)

const registrationDateStr = computed(() => {
    if (!props.customer?.createdAt) return ''
    return new Date(props.customer.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
})

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

function onOpenChange(val: boolean) {
    if (!val) emit('close')
}

function onRangeToggle() {
    page.value = 1
    if (props.open && props.customer) void fetchOrders()
}

async function fetchOrderLinesForOrders(items: OrderListItem[]) {
    if (items.length === 0) {
        orderLinesById.value = {}
        return
    }
    loadingDetails.value = true
    try {
        const entries = await Promise.all(
            items.map(async (o) => {
                try {
                    const detail = await orderApi.fetchDetail(o.id)
                    return [o.id, detail.orderDetails] as const
                } catch {
                    return [o.id, undefined] as const
                }
            }),
        )
        const map: Record<number, OrderDetailItem[] | undefined> = {}
        for (const [id, lines] of entries) {
            map[id] = lines
        }
        orderLinesById.value = map
    } finally {
        loadingDetails.value = false
    }
}

async function fetchOrders() {
    if (!props.customer) return
    loading.value = true
    loadError.value = ''
    try {
        const body: Record<string, unknown> = {
            customerId: props.customer.id,
            branchId: props.customer.branchId > 0 ? props.customer.branchId : undefined,
            page: page.value,
            pageSize,
            sortBy: 'CreatedAt',
            sortOrder: 'desc',
            excludeFutureReservations: false,
        }
        if (!unrestrictedDateRange.value && props.customer.createdAt) {
            body.fromDate = new Date(props.customer.createdAt).toLocaleDateString('en-CA', {
                timeZone: 'America/Bogota',
            })
            body.toDate = todayStr()
        }

        const res = await orderApi.searchOrders(body)
        orders.value = res.items ?? []
        totalCount.value = res.totalCount ?? 0
        totalPages.value = Math.max(1, res.totalPages ?? 1)
        void fetchOrderLinesForOrders(orders.value)
    } catch (e: unknown) {
        loadError.value = e instanceof Error ? e.message : 'Error al cargar pedidos'
        orders.value = []
        orderLinesById.value = {}
        totalCount.value = 0
        totalPages.value = 0
    } finally {
        loading.value = false
    }
}

function goPage(p: number) {
    page.value = p
    void fetchOrders()
}

watch(
    () => [props.open, props.customer?.id] as const,
    ([open]) => {
        if (open && props.customer) {
            page.value = 1
            unrestrictedDateRange.value = false
            void fetchOrders()
        } else if (!open) {
            orders.value = []
            orderLinesById.value = {}
            loadError.value = ''
        }
    },
)
</script>

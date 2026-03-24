<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="`Detalle - ${detail?.deliverymanName || ''}`" size="6xl">
        <div v-if="detail" class="space-y-4">
            <nav class="flex gap-1 border-b border-gray-200" aria-label="Vistas del detalle">
                <button type="button"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="activeTab === 'cycle'
                        ? 'bg-emerald-50 text-emerald-800 border border-b-0 border-gray-200 -mb-px'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                    @click="activeTab = 'cycle'">
                    Ciclo actual
                </button>
                <button type="button"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="activeTab === 'fullday'
                        ? 'bg-slate-50 text-slate-800 border border-b-0 border-gray-200 -mb-px'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                    @click="activeTab = 'fullday'">
                    Resumen del día
                </button>
            </nav>

            <p v-if="activeTab === 'cycle'" class="text-xs text-gray-500">
                Datos para cuadrar y liquidar (desde la última liquidación del día, si hubo).
            </p>
            <p v-else class="text-xs text-gray-500">
                Totales del día calendario completos (todos los pedidos entregados y abonos del día).
                Referencia; el monto a liquidar ahora está en <strong>Ciclo actual</strong>.
            </p>

            <!-- Ciclo actual -->
            <div v-show="activeTab === 'cycle'" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <p class="text-sm text-blue-600 font-medium">Pedidos entregados</p>
                        <p class="text-2xl font-bold text-blue-900">{{ detail.ordersCount }}</p>
                    </div>
                    <div class="bg-emerald-50 rounded-lg p-4">
                        <p class="text-sm text-emerald-600 font-medium">Efectivo recolectado</p>
                        <p class="text-2xl font-bold text-emerald-900">{{ formatCurrency(detail.totalCash) }}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <p class="text-sm text-purple-600 font-medium">Ganancia (delivery)</p>
                        <p class="text-2xl font-bold text-purple-900">{{ formatCurrency(detail.totalDeliveryFee) }}</p>
                    </div>
                    <div class="bg-orange-50 rounded-lg p-4">
                        <p class="text-sm text-orange-600 font-medium">Total abonos</p>
                        <p class="text-2xl font-bold text-orange-900">{{ formatCurrency(detail.totalAdvances) }}</p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Dinero que debe tener (ciclo)</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Base inicial:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(detail.baseAmount) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Efectivo recolectado:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(detail.totalCash) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Total abonos:</span>
                            <span class="font-medium text-gray-900">- {{ formatCurrency(detail.totalAdvances) }}</span>
                        </div>
                        <div class="flex justify-between text-base font-bold border-t pt-2">
                            <span class="text-gray-700">Balance actual:</span>
                            <span :class="[
                                detail.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            ]">
                                {{ formatCurrency(detail.currentBalance) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Pedidos del ciclo ({{ detail.orders.length }})</h4>
                    <div class="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <OrdersTable :orders="detail.orders" :loading="false" />
                    </div>
                </div>
            </div>

            <!-- Resumen del día -->
            <div v-show="activeTab === 'fullday'" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <p class="text-sm text-blue-600 font-medium">Pedidos entregados</p>
                        <p class="text-2xl font-bold text-blue-900">{{ fullDay.ordersCount }}</p>
                    </div>
                    <div class="bg-emerald-50 rounded-lg p-4">
                        <p class="text-sm text-emerald-600 font-medium">Efectivo recolectado</p>
                        <p class="text-2xl font-bold text-emerald-900">{{ formatCurrency(fullDay.totalCash) }}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <p class="text-sm text-purple-600 font-medium">Ganancia (delivery)</p>
                        <p class="text-2xl font-bold text-purple-900">{{ formatCurrency(fullDay.totalDeliveryFee) }}</p>
                    </div>
                    <div class="bg-orange-50 rounded-lg p-4">
                        <p class="text-sm text-orange-600 font-medium">Total abonos</p>
                        <p class="text-2xl font-bold text-orange-900">{{ formatCurrency(fullDay.totalAdvances) }}</p>
                    </div>
                </div>

                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Dinero del día (referencia)</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Base inicial:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(fullDay.baseAmount) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Efectivo recolectado (día):</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(fullDay.totalCash) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Total abonos (día):</span>
                            <span class="font-medium text-gray-900">- {{ formatCurrency(fullDay.totalAdvances) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Tiempo promedio entrega:</span>
                            <span class="font-medium text-gray-900">{{ fullDay.averageDeliveryTime }} min</span>
                        </div>
                        <div class="flex justify-between text-base font-bold border-t pt-2">
                            <span class="text-gray-700">Balance teórico día:</span>
                            <span :class="[
                                fullDay.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            ]">
                                {{ formatCurrency(fullDay.currentBalance) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">
                        Todos los pedidos del día ({{ (detail.fullDayOrders ?? detail.orders).length }})
                    </h4>
                    <div class="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <OrdersTable :orders="detail.fullDayOrders ?? detail.orders" :loading="false" />
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cerrar
            </BaseButton>
            <BaseButton v-if="canOpenLiquidation && activeTab === 'cycle'"
                type="button" @click="emit('open-liquidation')" variant="success" :loading="loading">
                Liquidar ({{ formatCurrency(detail!.currentBalance) }})
            </BaseButton>
            <p v-else-if="activeTab === 'cycle' && detail && detail.ordersOnTheWayCount && detail.ordersOnTheWayCount > 0"
                class="text-xs text-amber-800 mr-auto max-w-md">
                No se puede liquidar: hay {{ detail.ordersOnTheWayCount }} pedido(s) en camino. Entréguelos primero.
            </p>
            <p v-else-if="activeTab === 'cycle' && detail?.dayBlocked" class="text-xs text-amber-800 mr-auto">
                Domiciliario liquidado hoy. Desbloquea desde la tarjeta si necesitas operar de nuevo.
            </p>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DeliverymanDetail, DeliverymanStats } from '@/types/deliveryman.ts'
import { useFormatting } from '@/composables/useFormatting'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'

interface Props {
    isOpen: boolean
    detail: DeliverymanDetail | null
    loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'close': []
    'open-liquidation': []
}>()

const { formatCurrency } = useFormatting()

const activeTab = ref<'cycle' | 'fullday'>('cycle')

watch(
    () => props.isOpen,
    (open) => {
        if (open) activeTab.value = 'cycle'
    }
)

/** Vista “día completo”; si faltara en respuestas antiguas, reutiliza el ciclo. */
const fullDay = computed((): DeliverymanStats => {
    const d = props.detail
    if (!d) {
        return {
            deliverymanId: 0,
            deliverymanName: '',
            ordersCount: 0,
            averageDeliveryTime: 0,
            totalCash: 0,
            totalDeliveryFee: 0,
            totalAdvances: 0,
            baseAmount: 0,
            currentBalance: 0,
        }
    }
    return d.fullDayStats ?? d
})

const canOpenLiquidation = computed(() => {
    const d = props.detail
    if (!d || d.dayBlocked) return false
    const onTheWay = d.ordersOnTheWayCount ?? 0
    return d.currentBalance > 0 && onTheWay === 0
})

</script>

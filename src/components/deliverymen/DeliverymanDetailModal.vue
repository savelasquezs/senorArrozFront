<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="`Detalle - ${detail?.deliverymanName || ''}`" size="6xl">
        <div v-if="detail" class="space-y-6">
            <!-- Estadísticas resumidas -->
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

            <!-- Dinero que debe tener -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Dinero que debe tener</h4>
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

            <!-- Tabla de pedidos -->
            <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Pedidos del día ({{ detail.orders.length }})</h4>
                <div class="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <OrdersTable :orders="detail.orders" :loading="false" />
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
            <BaseButton v-if="detail && detail.currentBalance > detail.baseAmount" @click="handleLiquidate"
                variant="success" :loading="loading">
                Liquidar ({{ formatCurrency(detail.currentBalance - detail.baseAmount) }})
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import type { DeliverymanDetail } from '@/types/deliveryman.ts'
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
    'liquidate': [deliverymanId: number, amount: number]
}>()

const { formatCurrency } = useFormatting()

const handleLiquidate = () => {
    if (!props.detail) return

    const liquidationAmount = props.detail.currentBalance - props.detail.baseAmount

    if (confirm(`¿Confirmas liquidar a ${props.detail.deliverymanName} con un abono de ${formatCurrency(liquidationAmount)}?`)) {
        emit('liquidate', props.detail.deliverymanId, liquidationAmount)
    }
}
</script>

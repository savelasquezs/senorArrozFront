<template>
    <div class="order-items-container">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
            <BaseLoading text="Cargando productos..." size="md" />
        </div>

        <!-- Empty State -->
        <div v-else-if="items.length === 0" class="empty-state">
            <ShoppingCartIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 class="text-sm font-medium text-gray-900 mb-1">No hay productos</h3>
            <p class="text-xs text-gray-500 mb-3">Agrega productos desde el catálogo</p>
          
        </div>

        <!-- Items List -->
        <div v-else class="items-section">
            <!-- Items List with Animations -->
            <TransitionGroup name="item-list" tag="div" class="items-list">
                <OrderItem v-for="item in items" :key="item.tempId" :item="item" :tab-id="tabId"
                    @quantity-change="handleQuantityChange" @price-change="handlePriceChange"
                    @discount-change="handleDiscountChange" @remove="handleRemoveItem" />
            </TransitionGroup>

            <!-- Clear All Button -->
            <div v-if="items.length > 0" class="clear-all-section">
                <BaseButton @click="handleClearAll" variant="ghost" size="sm" class="text-red-600 hover:bg-red-50">
                    <div class="flex items-center">
                        <TrashIcon class="w-3 h-3 mr-1" />
                        Limpiar
                    </div>
                </BaseButton>

            </div>

            <!-- Totals Summary -->
            <div class="totals-summary">
                <div class="summary-line">
                    <span class="text-xs text-gray-600">Items:</span>
                    <span class="text-xs font-medium">{{ itemsCount }}</span>
                </div>
                <div class="summary-line">
                    <span class="text-xs text-gray-600">Subtotal:</span>
                    <span class="text-xs font-medium">{{ formatCurrency(subtotal) }}</span>
                </div>
                <div v-if="discountTotal > 0" class="summary-line text-green-600">
                    <span class="text-xs">Desc:</span>
                    <span class="text-xs">-{{ formatCurrency(discountTotal) }}</span>
                </div>
                <div class="summary-line">
                    <span class="text-xs text-gray-600">Envío:</span>
                    <div class="flex items-center gap-1">
                        <input v-model.number="localDeliveryFee" type="number" min="0" step="100"
                            @input="handleDeliveryFeeChange"
                            class="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                </div>
                <div v-if="showFreeDeliveryCheckbox" class="summary-line items-start">
                    <label class="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                        <input type="checkbox" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            :checked="currentOrder?.freeDeliveryRequested === true"
                            @change="onFreeDeliveryCheckboxChange" />
                        Domicilio gratis
                    </label>
                    <span class="text-[10px] text-gray-400 text-right max-w-[9rem] leading-tight">
                        Hasta {{ formatCurrency(freeDeliveryBudgetCap) }} sobre el envío
                    </span>
                </div>
                <div v-if="freeDeliveryAppliedTotal > 0" class="summary-line text-xs text-emerald-700">
                    <span>Domicilio gratis aplicado</span>
                    <span>−{{ formatCurrency(freeDeliveryAppliedTotal) }}</span>
                </div>
                <div class="summary-line total-line">
                    <span class="text-sm font-bold">Total:</span>
                    <span class="text-sm font-bold text-emerald-600">{{ formatCurrency(total) }}</span>
                </div>
                <BaseButton type="button" variant="outline" size="sm" class="w-full mt-1.5 justify-center"
                    @click="copyOrderSummaryToClipboard">
                    <span class="flex items-center justify-center gap-1.5">
                        <ClipboardDocumentIcon class="w-4 h-4" />
                        Copiar mensaje
                    </span>
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useBranchPosSettingsStore } from '@/store/branchPosSettings'
import { useOrderItems } from '@/composables/useOrderItems'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import { deliveryDiscountBudget } from '@/composables/useFreeDeliveryDiscount'
import { buildPosOrderCopyMessage } from '@/composables/useOrderCopyMessage'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderItem from '@/components/orders/OrderItem.vue'

// Icons
import {
    ShoppingCartIcon,
    TrashIcon,
    ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    tabId: string
    loading?: boolean
}

withDefaults(defineProps<Props>(), {
    loading: false
})

// Emits
const emit = defineEmits<{
    addProducts: []
}>()

// Composables
const { formatCurrency, formatTime, formatDateShort } = useFormatting()
const { success, error: showError } = useToast()
const ordersStore = useOrdersDraftsStore()
const authStore = useAuthStore()
const branchPosSettings = useBranchPosSettingsStore()
const orderItems = useOrderItems()

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const items = computed(() => currentOrder.value?.orderItems || [])
const itemsCount = computed(() => items.value.reduce((acc, item) => acc + item.quantity, 0))
const subtotal = computed(() => currentOrder.value?.subtotal || 0)
const discountTotal = computed(() => currentOrder.value?.discountTotal || 0)
const deliveryFee = computed(() => currentOrder.value?.deliveryFee || 0)
const total = computed(() => currentOrder.value?.total || 0)
const showFreeDeliveryCheckbox = computed(() => {
    const o = currentOrder.value
    if (!o) return false
    return o.type === 'delivery' || (o.type === 'reservation' && o.addressId != null)
})

const freeDeliveryBudgetCap = computed(() =>
    deliveryDiscountBudget(deliveryFee.value, branchPosSettings.maxFreeDeliveryDiscount),
)

const freeDeliveryAppliedTotal = computed(() =>
    (currentOrder.value?.orderItems ?? []).reduce((s, i) => s + (i.freeDeliveryDiscount ?? 0), 0),
)

const onFreeDeliveryCheckboxChange = (e: Event) => {
    const el = e.target as HTMLInputElement
    ordersStore.updateFreeDeliveryRequested(el.checked)
}

onMounted(async () => {
    await branchPosSettings.ensureForBranch(authStore.branchId ?? undefined)
    const o = ordersStore.currentOrder
    if (o) ordersStore.recalculateTotals(o)
})

watch(
    () => branchPosSettings.maxFreeDeliveryDiscount,
    () => {
        const o = ordersStore.currentOrder
        if (o) ordersStore.recalculateTotals(o)
    },
)

// Local state
const localDeliveryFee = ref(deliveryFee.value)

// Watch para sincronizar localDeliveryFee con el store
watch(deliveryFee, (newFee) => {
    localDeliveryFee.value = newFee
})

// Methods
const handleQuantityChange = (itemTempId: string, quantity: number) => {
    try {
        orderItems.updateQuantity(itemTempId, quantity)
    } catch (error: any) {
        showError('Error al actualizar cantidad', error.message || 'No se pudo actualizar la cantidad del producto')
    }
}

const handlePriceChange = (itemTempId: string, price: number) => {
    try {
        orderItems.updatePrice(itemTempId, price)
    } catch (error: any) {
        showError('Error al actualizar precio', error.message || 'No se pudo actualizar el precio del producto')
    }
}

const handleDiscountChange = (itemTempId: string, discountValue: number) => {
    try {
        orderItems.updateDiscount(itemTempId, discountValue)
    } catch (error: any) {
        showError('Error al actualizar descuento', error.message || 'No se pudo actualizar el descuento del producto')
    }
}

const handleRemoveItem = (itemTempId: string) => {
    try {
        orderItems.removeItem(itemTempId)
        success('Producto eliminado', 1500, 'El producto ha sido eliminado del pedido')
    } catch (error: any) {
        showError('Error al eliminar producto', error.message || 'No se pudo eliminar el producto del pedido')
    }
}

const handleDeliveryFeeChange = () => {
    try {
        ordersStore.updateDeliveryFee(localDeliveryFee.value || 0)
    } catch (error: any) {
        showError('Error al actualizar envío', error.message || 'No se pudo actualizar el costo de envío')
    }
}

async function copyOrderSummaryToClipboard() {
    const o = currentOrder.value
    if (!o) return
    const msg = buildPosOrderCopyMessage({
        orderType: o.type,
        isLater: o.isLater === true,
        addressId: o.addressId,
        reservedFor: o.reservedFor,
        orderTotal: total.value,
        deliveryFee: deliveryFee.value,
        freeDeliveryRequested: o.freeDeliveryRequested === true,
        maxBranchCap: branchPosSettings.maxFreeDeliveryDiscount,
        formatCurrency,
        formatTime,
        formatDateShort,
        guestName: o.guestName,
        etaPhrase: branchPosSettings.posCopyMessageEtaPhrase,
    })
    try {
        await navigator.clipboard.writeText(msg)
        success('Copiado', 2500, 'Mensaje listo para pegar.')
    } catch {
        showError('No se pudo copiar', 'Permite el portapapeles en el navegador o copia manualmente.')
    }
}

const handleClearAll = () => {
    if (items.value.length === 0) return

    const confirmed = confirm(`¿Estás seguro de que quieres eliminar todos los productos (${items.value.length}) de este pedido?`)

    if (confirmed) {
        try {
            // Eliminar todos los items uno por uno
            items.value.forEach(item => {
                orderItems.removeItem(item.tempId)
            })
            success('Pedido limpiado', 2000, 'Todos los productos han sido eliminados del pedido')
        } catch (error: any) {
            showError('Error al limpiar pedido', error.message || 'No se pudo limpiar el pedido')
        }
    }
}


</script>

<style scoped>
.order-items-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
}

.empty-state {
    text-align: center;
    padding: 1rem;
}

.items-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.clear-all-section {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.25rem;
    border-top: 1px solid #f3f4f6;
}

.totals-summary {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.total-line {
    border-top: 1px solid #e5e7eb;
    padding-top: 0.25rem;
    margin-top: 0.25rem;
}

/* Eliminar spinner de input number */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

/* Animations */
.item-list-enter-active,
.item-list-leave-active {
    transition: all 0.3s ease;
}

.item-list-enter-from {
    opacity: 0;
    transform: translateX(-20px);
}

.item-list-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

.item-list-move {
    transition: transform 0.3s ease;
}
</style>

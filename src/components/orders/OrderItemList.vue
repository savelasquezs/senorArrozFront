<template>
    <div class="order-items-container">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
            <BaseLoading text="Cargando productos..." size="md" />
        </div>

        <!-- Empty State -->
        <div v-else-if="items.length === 0" class="empty-state">
            <div class="empty-icon">
                <ShoppingCartIcon class="w-12 h-12 text-gray-400" />
            </div>
            <h3 class="empty-title">No hay productos en este pedido</h3>
            <p class="empty-description">Agrega productos desde el catálogo</p>
            <BaseButton @click="handleAddProducts" variant="primary" size="sm" class="mt-4">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Agregar Productos
                </span>
            </BaseButton>
        </div>

        <!-- Items List -->
        <div v-else class="items-section">
            <!-- Items List with Animations -->
            <TransitionGroup name="item-list" tag="div" class="items-list">
                <OrderItem v-for="item in items" :key="item.tempId" :item="item" :tab-id="tabId"
                    @quantity-change="handleQuantityChange" @price-change="handlePriceChange"
                    @discount-change="handleDiscountChange" @remove="handleRemoveItem" @edit="handleEditItem" />
            </TransitionGroup>

            <!-- Clear All Button -->
            <div v-if="items.length > 0" class="clear-all-section">
                <BaseButton @click="handleClearAll" variant="outline" size="sm"
                    class="text-red-600 border-red-300 hover:bg-red-50">
                    <span class="flex items-center">
                        <TrashIcon class="w-4 h-4 mr-2" />
                        Limpiar Todo
                    </span>
                </BaseButton>
            </div>

            <!-- Totals Summary -->
            <div class="totals-summary">
                <div class="summary-line">
                    <span>Items:</span>
                    <span class="font-medium">{{ items.length }}</span>
                </div>
                <div class="summary-line">
                    <span>Subtotal:</span>
                    <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
                </div>
                <div v-if="discountTotal > 0" class="summary-line text-green-600">
                    <span>Descuentos:</span>
                    <span>-{{ formatCurrency(discountTotal) }}</span>
                </div>
                <div v-if="deliveryFee > 0" class="summary-line">
                    <span>Domicilio:</span>
                    <span>{{ formatCurrency(deliveryFee) }}</span>
                </div>
                <div class="summary-line total-line">
                    <span>Total:</span>
                    <span class="font-bold text-lg">{{ formatCurrency(total) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderItem from '@/components/orders/OrderItem.vue'

// Icons
import {
    ShoppingCartIcon,
    PlusIcon,
    TrashIcon
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
    editItem: [itemTempId: string]
}>()

// Composables
const { formatCurrency } = useFormatting()
const { success, error: showError } = useToast()
const ordersStore = useOrdersStore()

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const items = computed(() => currentOrder.value?.orderItems || [])
const subtotal = computed(() => currentOrder.value?.subtotal || 0)
const discountTotal = computed(() => currentOrder.value?.discountTotal || 0)
const deliveryFee = computed(() => currentOrder.value?.deliveryFee || 0)
const total = computed(() => currentOrder.value?.total || 0)

// Methods
const handleQuantityChange = (itemTempId: string, quantity: number) => {
    try {
        ordersStore.updateItemQuantity(itemTempId, quantity)
    } catch (error: any) {
        showError('Error al actualizar cantidad', error.message || 'No se pudo actualizar la cantidad del producto')
    }
}

const handlePriceChange = (itemTempId: string, price: number) => {
    try {
        ordersStore.updateItemPrice(itemTempId, price)
    } catch (error: any) {
        showError('Error al actualizar precio', error.message || 'No se pudo actualizar el precio del producto')
    }
}

const handleDiscountChange = (itemTempId: string, discountValue: number) => {
    try {
        ordersStore.updateItemDiscount(itemTempId, discountValue)
    } catch (error: any) {
        showError('Error al actualizar descuento', error.message || 'No se pudo actualizar el descuento del producto')
    }
}

const handleRemoveItem = (itemTempId: string) => {
    try {
        ordersStore.removeItem(itemTempId)
        success('Producto eliminado', 1500, 'El producto ha sido eliminado del pedido')
    } catch (error: any) {
        showError('Error al eliminar producto', error.message || 'No se pudo eliminar el producto del pedido')
    }
}

const handleEditItem = (itemTempId: string) => {
    emit('editItem', itemTempId)
}

const handleClearAll = () => {
    if (items.value.length === 0) return

    const confirmed = confirm(`¿Estás seguro de que quieres eliminar todos los productos (${items.value.length}) de este pedido?`)

    if (confirmed) {
        try {
            // Eliminar todos los items uno por uno
            items.value.forEach(item => {
                ordersStore.removeItem(item.tempId)
            })
            success('Pedido limpiado', 2000, 'Todos los productos han sido eliminados del pedido')
        } catch (error: any) {
            showError('Error al limpiar pedido', error.message || 'No se pudo limpiar el pedido')
        }
    }
}

const handleAddProducts = () => {
    emit('addProducts')
}
</script>

<style scoped>
.order-items-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 0;
}

.empty-state {
    text-align: center;
    padding: 2rem 1rem;
}

.empty-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
}

.empty-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.5rem;
}

.empty-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
}

.items-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.clear-all-section {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
}

.totals-summary {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.summary-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
}

.total-line {
    font-size: 1rem;
    font-weight: 700;
    border-top: 1px solid #e5e7eb;
    padding-top: 0.5rem;
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

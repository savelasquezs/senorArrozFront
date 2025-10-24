<template>
    <div class="space-y-4">
        <!-- Header con botón de edición -->
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Productos del Pedido</h3>
            <BaseButton v-if="!editing && canEdit" size="sm" variant="secondary" @click="enterEditMode">
                <PencilIcon class="w-4 h-4 mr-1" />
                Editar Productos
            </BaseButton>
        </div>

        <!-- Tabla de productos -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Descuento</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                        <th v-if="editing" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="(item, index) in localProducts" :key="item.id || index">
                        <!-- Producto -->
                        <td class="px-4 py-3">
                            <div>
                                <p class="text-sm font-medium text-gray-900">{{ item.productName }}</p>
                                <p v-if="item.productDescription" class="text-xs text-gray-500">
                                    {{ item.productDescription }}
                                </p>
                                <p v-if="item.notes" class="text-xs text-gray-600 mt-1 italic">
                                    Nota: {{ item.notes }}
                                </p>
                            </div>
                        </td>

                        <!-- Cantidad -->
                        <td class="px-4 py-3 text-center">
                            <BaseInput v-if="editing" v-model.number="item.quantity" type="number" min="1" class="w-20"
                                @input="recalculateSubtotal(item)" />
                            <span v-else class="text-sm text-gray-900">{{ item.quantity }}</span>
                        </td>

                        <!-- Precio unitario -->
                        <td class="px-4 py-3 text-right">
                            <BaseInput v-if="editing" v-model.number="item.unitPrice" type="number" min="0" step="100"
                                class="w-28" @input="recalculateSubtotal(item)" />
                            <span v-else class="text-sm text-gray-900">{{ formatCurrency(item.unitPrice) }}</span>
                        </td>

                        <!-- Descuento -->
                        <td class="px-4 py-3 text-right">
                            <BaseInput v-if="editing" v-model.number="item.discount" type="number" min="0" step="100"
                                class="w-28" @input="recalculateSubtotal(item)" />
                            <span v-else class="text-sm text-gray-900">
                                {{ item.discount > 0 ? formatCurrency(item.discount) : '-' }}
                            </span>
                        </td>

                        <!-- Subtotal -->
                        <td class="px-4 py-3 text-right">
                            <span class="text-sm font-medium text-gray-900">{{ formatCurrency(item.subtotal) }}</span>
                        </td>

                        <!-- Acciones (solo en modo edición) -->
                        <td v-if="editing" class="px-4 py-3 text-center">
                            <button class="text-red-600 hover:text-red-700 p-1" title="Eliminar producto"
                                @click="removeProduct(index)">
                                <TrashIcon class="w-4 h-4" />
                            </button>
                        </td>
                    </tr>

                    <!-- Mensaje si no hay productos -->
                    <tr v-if="localProducts.length === 0">
                        <td :colspan="editing ? 6 : 5" class="px-4 py-8 text-center text-gray-500">
                            No hay productos en este pedido
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Botón agregar producto (modo edición) -->
        <div v-if="editing" class="pt-2">
            <BaseButton size="sm" variant="outline" @click="showAddProductModal = true">
                <PlusIcon class="w-4 h-4 mr-1" />
                Agregar Producto
            </BaseButton>
        </div>

        <!-- Panel de totales -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(calculatedSubtotal) }}</span>
            </div>
            <div v-if="discountTotal > 0" class="flex justify-between text-sm">
                <span class="text-gray-600">Descuentos:</span>
                <span class="font-medium text-red-600">-{{ formatCurrency(discountTotal) }}</span>
            </div>
            <div v-if="deliveryFee > 0" class="flex justify-between text-sm">
                <span class="text-gray-600">Domicilio:</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(deliveryFee) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span class="text-gray-900">Total:</span>
                <span class="text-emerald-600">{{ formatCurrency(calculatedTotal) }}</span>
            </div>
        </div>

        <!-- Botones de acción (modo edición) -->
        <div v-if="editing" class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <BaseButton variant="secondary" @click="cancelEdit">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="localProducts.length === 0" @click="saveChanges">
                Guardar Cambios
            </BaseButton>
        </div>

        <!-- Modal para agregar producto -->
        <AddProductModal :open="showAddProductModal" :existing-product-ids="existingProductIds"
            @close="showAddProductModal = false" @product-added="handleProductAdded" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderDetailItem, UpdateOrderDetailDto } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AddProductModal from './AddProductModal.vue'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Props {
    products: OrderDetailItem[]
    deliveryFee: number
    canEdit: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    save: [products: UpdateOrderDetailDto[]]
}>()

const { formatCurrency } = useFormatting()
const { error } = useToast()

// Estado
const editing = ref(false)
const saving = ref(false)
const showAddProductModal = ref(false)
const localProducts = ref<OrderDetailItem[]>([])
const originalProducts = ref<OrderDetailItem[]>([])

// Computed
const calculatedSubtotal = computed(() => {
    return localProducts.value.reduce((sum, item) => sum + item.subtotal, 0)
})

const discountTotal = computed(() => {
    return localProducts.value.reduce((sum, item) => sum + item.discount, 0)
})

const calculatedTotal = computed(() => {
    return calculatedSubtotal.value - discountTotal.value + props.deliveryFee
})

const existingProductIds = computed(() => {
    return localProducts.value.map(p => p.productId)
})

// Métodos
const recalculateSubtotal = (item: OrderDetailItem) => {
    item.subtotal = item.quantity * item.unitPrice - item.discount
}

const enterEditMode = () => {
    // Hacer copia profunda de los productos
    originalProducts.value = JSON.parse(JSON.stringify(props.products))
    localProducts.value = JSON.parse(JSON.stringify(props.products))
    editing.value = true
}

const cancelEdit = () => {
    localProducts.value = []
    editing.value = false
}

const removeProduct = (index: number) => {
    localProducts.value.splice(index, 1)
}

const handleProductAdded = (newProduct: any) => {
    localProducts.value.push({
        id: 0,  // ID 0 indica que es nuevo para el backend
        productId: newProduct.productId,
        productName: newProduct.productName,
        productDescription: newProduct.productDescription,
        quantity: newProduct.quantity,
        unitPrice: newProduct.unitPrice,
        discount: newProduct.discount,
        notes: newProduct.notes,
        subtotal: (newProduct.quantity * newProduct.unitPrice) - newProduct.discount,
        orderId: 0, // Temporal, se asignará en el backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    })

    showAddProductModal.value = false
}

const saveChanges = async () => {
    if (localProducts.value.length === 0) {
        error('Error', 'El pedido debe tener al menos un producto')
        return
    }

    const updateDto: UpdateOrderDetailDto[] = localProducts.value.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        notes: item.notes || undefined,
    }))

    emit('save', updateDto)
}

// Inicializar productos
localProducts.value = [...props.products]
</script>

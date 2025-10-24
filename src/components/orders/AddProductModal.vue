<template>
    <BaseDialog :model-value="open" title="Agregar Producto" size="4xl" @update:model-value="$emit('close')">
        <div class="flex h-full min-h-[500px]">
            <!-- Columna izquierda: Filtros + Lista (60%) -->
            <div class="w-3/5 pr-4 border-r border-gray-200">
                <div class="space-y-4">
                    <!-- Filtro de Categorías -->
                    <ProductCategories :categories="categories" :selected-category="selectedCategoryId"
                        layout="horizontal" :show-counts="false" :compact="true"
                        @category-selected="handleCategorySelected" />

                    <!-- Input de Búsqueda -->
                    <BaseInput v-model="searchQuery" placeholder="Buscar productos..." :icon="MagnifyingGlassIcon" />

                    <!-- Lista de Productos -->
                    <ProductListView :products="filteredProducts" :loading="productsStore.isLoading"
                        :selected-product="selectedProduct" :disabled-product-ids="existingProductIds"
                        empty-message="No se encontraron productos"
                        empty-description="Intenta ajustar los filtros de búsqueda"
                        @product-selected="handleProductSelect" />
                </div>
            </div>

            <!-- Columna derecha: Formulario (40%) -->
            <div class="w-2/5 pl-4">
                <Transition name="slide-left" mode="out-in">
                    <div v-if="selectedProduct" key="form" class="space-y-4">
                        <!-- Header del producto -->
                        <div class="flex items-start justify-between">
                            <div>
                                <h4 class="text-lg font-medium text-gray-900">{{ selectedProduct.name }}</h4>
                                <p v-if="selectedProduct.categoryName" class="text-sm text-gray-500">
                                    {{ selectedProduct.categoryName }}
                                </p>
                                <p class="text-sm text-emerald-600 font-medium">
                                    Precio: {{ formatCurrency(selectedProduct.price) }}
                                </p>
                            </div>
                            <button @click="clearSelection" class="text-gray-400 hover:text-gray-600 p-1">
                                <XMarkIcon class="w-5 h-5" />
                            </button>
                        </div>

                        <!-- Formulario -->
                        <div class="space-y-4">
                            <!-- Cantidad -->
                            <BaseInput label="Cantidad" v-model.number="quantity" type="number" min="1"
                                :error="quantityError" />

                            <!-- Precio unitario -->
                            <BaseInput label="Precio Unitario" v-model.number="unitPrice" type="number" min="0"
                                step="100" :error="unitPriceError" />

                            <!-- Descuento -->
                            <BaseInput label="Descuento" v-model.number="discount" type="number" min="0" step="100" />

                            <!-- Notas -->
                            <BaseInput label="Notas (opcional)" v-model="notes"
                                placeholder="Ej: Sin cebolla, extra picante..." />
                        </div>

                        <!-- Resumen -->
                        <div class="bg-gray-50 rounded-lg p-4 border">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Subtotal:</span>
                                <span class="font-medium text-gray-900">{{ formatCurrency(calculatedSubtotal) }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-else key="empty" class="empty-state">
                        <div class="text-center py-12">
                            <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 class="text-lg font-medium text-gray-900 mb-2">
                                Selecciona un producto
                            </h3>
                            <p class="text-gray-500">
                                Haz clic en un producto de la lista para agregarlo al pedido
                            </p>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end space-x-3">
                <BaseButton variant="secondary" @click="$emit('close')">
                    Cancelar
                </BaseButton>
                <BaseButton variant="primary" :disabled="!canAddProduct" @click="addProduct">
                    Agregar al Pedido
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types/product'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ProductCategories from './products/ProductCategories.vue'
import ProductListView from './products/ProductListView.vue'

// Icons
import { XMarkIcon, MagnifyingGlassIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    open: boolean
    existingProductIds: number[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    close: []
    'product-added': [product: {
        id: number  // Siempre 0 para productos nuevos
        productId: number
        productName: string
        productDescription: string | null
        quantity: number
        unitPrice: number
        discount: number
        notes: string
    }]
}>()

// Stores
const productsStore = useProductsStore()
const categoriesStore = useProductCategoriesStore()

// Composables
const { formatCurrency } = useFormatting()
const { success, error } = useToast()

// State
const selectedProduct = ref<Product | null>(null)
const quantity = ref<number>(1)
const unitPrice = ref<number>(0)
const discount = ref<number>(0)
const notes = ref<string>('')
const searchQuery = ref<string>('')
const selectedCategoryId = ref<number | null>(null)

// Computed
const products = computed(() => productsStore.currentProducts)
const categories = computed(() => categoriesStore.currentCategories)

const filteredProducts = computed(() => {
    let filtered = [...products.value]

    // 1. Filtrar por categoría seleccionada
    if (selectedCategoryId.value) {
        filtered = filtered.filter(p => p.categoryId === selectedCategoryId.value)
    }

    // 2. Filtrar por búsqueda
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query)
        )
    }

    // 3. Excluir productos ya agregados
    filtered = filtered.filter(p =>
        !props.existingProductIds.includes(p.id)
    )

    // 4. Solo productos activos
    filtered = filtered.filter(p => p.active)

    return filtered
})

const calculatedSubtotal = computed(() => {
    return (quantity.value * unitPrice.value) - discount.value
})

const quantityError = computed(() => {
    if (quantity.value < 1) return 'La cantidad debe ser al menos 1'
    return undefined
})

const unitPriceError = computed(() => {
    if (unitPrice.value < 0) return 'El precio no puede ser negativo'
    return undefined
})

const canAddProduct = computed(() => {
    return selectedProduct.value &&
        quantity.value >= 1 &&
        unitPrice.value >= 0 &&
        !quantityError.value &&
        !unitPriceError.value
})

// Methods
const handleCategorySelected = (categoryId: number | null) => {
    selectedCategoryId.value = categoryId
}

const handleProductSelect = (product: Product) => {
    selectProduct(product)
}

const selectProduct = (product: Product) => {
    selectedProduct.value = product
    quantity.value = 1
    unitPrice.value = product.price
    discount.value = 0
    notes.value = ''
}

const clearSelection = () => {
    selectedProduct.value = null
    quantity.value = 1
    unitPrice.value = 0
    discount.value = 0
    notes.value = ''
}

const addProduct = () => {
    if (!selectedProduct.value || !canAddProduct.value) return

    const newProduct = {
        id: 0,  // Siempre 0 para productos nuevos
        productId: selectedProduct.value.id,
        productName: selectedProduct.value.name,
        productDescription: selectedProduct.value.categoryName || null,
        quantity: quantity.value,
        unitPrice: unitPrice.value,
        discount: discount.value,
        notes: notes.value.trim() || ''
    }

    emit('product-added', newProduct)
    success('Producto agregado', 1500, `${selectedProduct.value.name}`)

    // Limpiar selección pero mantener formulario visible
    clearSelection()
}

// Lifecycle
onMounted(async () => {
    try {
        // Cargar productos y categorías si no están cargados
        if (products.value.length === 0) {
            await productsStore.fetch({
                active: true,
                page: 1,
                pageSize: 1000
            })
        }
        if (categories.value.length === 0) {
            await categoriesStore.fetch({
                page: 1,
                pageSize: 1000
            })
        }

        // Auto-seleccionar categoría "Arroces"
        const arrocesCategory = categories.value.find(c =>
            c.name.toLowerCase().includes('arroz')
        )
        if (arrocesCategory) {
            selectedCategoryId.value = arrocesCategory.id
        }
    } catch (err) {
        error('Error', 'No se pudieron cargar los productos')
        console.error('Error loading products:', err)
    }
})

// Watch para limpiar selección cuando se cierra el modal
watch(() => props.open, (isOpen) => {
    if (!isOpen) {
        clearSelection()
        searchQuery.value = ''
    }
})
</script>

<style scoped>
/* Transición slide-left para el panel derecho */
.slide-left-enter-active,
.slide-left-leave-active {
    transition: all 0.3s ease;
}

.slide-left-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.slide-left-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}

.empty-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
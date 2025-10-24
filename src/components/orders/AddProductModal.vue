<template>
    <BaseDialog :model-value="open" title="Agregar Producto" size="xl" @update:model-value="$emit('close')">
        <div class="space-y-6">
            <!-- ProductSearch -->
            <ProductSearch 
                :products="products" 
                :categories="categories"
                :placeholder="'Buscar productos...'"
                :show-filters="true"
                :show-search-history="false"
                @search="handleSearch"
                @filter="handleFilter"
                @suggestion-selected="handleSuggestionSelected" />

            <!-- ProductGrid -->
            <ProductGrid 
                :products="filteredProducts" 
                :loading="productsStore.isLoading"
                :card-variant="'compact'"
                :empty-message="'No se encontraron productos'"
                :empty-description="'Intenta ajustar los filtros de búsqueda'"
                @product-click="handleProductSelect" />

            <!-- Formulario de producto seleccionado -->
            <div v-if="selectedProduct" class="bg-gray-50 rounded-lg p-4 border">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h4 class="text-lg font-medium text-gray-900">{{ selectedProduct.name }}</h4>
                        <p v-if="selectedProduct.categoryName" class="text-sm text-gray-500">
                            {{ selectedProduct.categoryName }}
                        </p>
                        <p class="text-sm text-emerald-600 font-medium">
                            Precio: {{ formatCurrency(selectedProduct.price) }}
                        </p>
                    </div>
                    <button 
                        @click="clearSelection"
                        class="text-gray-400 hover:text-gray-600 p-1">
                        <XMarkIcon class="w-5 h-5" />
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Cantidad -->
                    <BaseInput 
                        label="Cantidad" 
                        v-model.number="quantity" 
                        type="number" 
                        min="1"
                        :error="quantityError" />

                    <!-- Precio unitario -->
                    <BaseInput 
                        label="Precio Unitario" 
                        v-model.number="unitPrice" 
                        type="number" 
                        min="0"
                        step="100"
                        :error="unitPriceError" />

                    <!-- Descuento -->
                    <BaseInput 
                        label="Descuento" 
                        v-model.number="discount" 
                        type="number" 
                        min="0"
                        step="100" />

                    <!-- Notas -->
                    <BaseInput 
                        label="Notas (opcional)" 
                        v-model="notes" 
                        placeholder="Ej: Sin cebolla, extra picante..." />
                </div>

                <!-- Resumen -->
                <div class="mt-4 p-3 bg-white rounded border">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Subtotal:</span>
                        <span class="font-medium text-gray-900">{{ formatCurrency(calculatedSubtotal) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end space-x-3">
                <BaseButton variant="secondary" @click="$emit('close')">
                    Cancelar
                </BaseButton>
                <BaseButton 
                    variant="primary" 
                    :disabled="!canAddProduct"
                    @click="addProduct">
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
import type { Product, ProductCategory, ProductFilters } from '@/types/product'
import type { OrderDetailItem } from '@/types/order'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ProductSearch from './products/ProductSearch.vue'
import ProductGrid from './products/ProductGrid.vue'

// Icons
import { XMarkIcon } from '@heroicons/vue/24/outline'

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
        id: 0  // Siempre 0 para productos nuevos
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
const filters = ref<ProductFilters>({
    active: true,
    page: 1,
    pageSize: 1000
})

// Computed
const products = computed(() => productsStore.currentProducts)
const categories = computed(() => categoriesStore.currentCategories)

const filteredProducts = computed(() => {
    let filtered = [...products.value]
    
    // Filtrar productos ya agregados al pedido
    filtered = filtered.filter(product => !props.existingProductIds.includes(product.id))
    
    // Aplicar filtros de búsqueda
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(query) ||
            (product.categoryName && product.categoryName.toLowerCase().includes(query))
        )
    }
    
    // Aplicar filtros de categoría
    if (filters.value.categoryId) {
        filtered = filtered.filter(product => product.categoryId === filters.value.categoryId)
    }
    
    // Aplicar filtros de precio
    if (filters.value.minPrice !== undefined) {
        filtered = filtered.filter(product => product.price >= filters.value.minPrice!)
    }
    if (filters.value.maxPrice !== undefined) {
        filtered = filtered.filter(product => product.price <= filters.value.maxPrice!)
    }
    
    return filtered
})

const calculatedSubtotal = computed(() => {
    return (quantity.value * unitPrice.value) - discount.value
})

const quantityError = computed(() => {
    if (quantity.value < 1) return 'La cantidad debe ser al menos 1'
    return null
})

const unitPriceError = computed(() => {
    if (unitPrice.value < 0) return 'El precio no puede ser negativo'
    return null
})

const canAddProduct = computed(() => {
    return selectedProduct.value && 
           quantity.value >= 1 && 
           unitPrice.value >= 0 &&
           !quantityError.value &&
           !unitPriceError.value
})

// Methods
const handleSearch = (query: string) => {
    searchQuery.value = query
}

const handleFilter = (newFilters: ProductFilters) => {
    filters.value = { ...filters.value, ...newFilters }
}

const handleSuggestionSelected = (product: Product) => {
    selectProduct(product)
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
    
    // Limpiar selección
    clearSelection()
}

// Lifecycle
onMounted(async () => {
    try {
        // Cargar productos y categorías si no están cargados
        if (products.value.length === 0) {
            await productsStore.fetch(filters.value)
        }
        if (categories.value.length === 0) {
            await categoriesStore.fetch({
                page: 1,
                pageSize: 1000
            })
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
    }
})
</script>

<style scoped>
/* Estilos adicionales si es necesario */
</style>

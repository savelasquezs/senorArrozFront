<template>
    <div class="space-y-4">
        <!-- Category Filter -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <BaseSelect :model-value="selectedCategory" :options="categoryOptions" placeholder="Todas las categorías"
                value-key="value" display-key="label" @update:model-value="handleCategoryChange" />
        </div>

        <!-- Price Range -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Precio Mín</label>
                <BaseInput :model-value="minPrice?.toString() || ''" type="number" placeholder="0" min="0"
                    @update:model-value="handleMinPriceChange" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Precio Máx</label>
                <BaseInput :model-value="maxPrice?.toString() || ''" type="number" placeholder="999999" min="0"
                    @update:model-value="handleMaxPriceChange" />
            </div>
        </div>

        <!-- Stock Filter -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Estado del Stock</label>
            <BaseSelect :model-value="selectedStockFilter" :options="stockFilterOptions" placeholder="Todos los estados"
                value-key="value" display-key="label" @update:model-value="handleStockFilterChange" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import type { ProductCategory } from '@/types/product'

interface Props {
    selectedCategory: number | null
    minPrice: number | null
    maxPrice: number | null
    selectedStockFilter: string | null
    categories: ProductCategory[]
    stockFilterOptions: Array<{ value: string | null; label: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'category-change': [categoryId: number | null]
    'min-price-change': [price: number | null]
    'max-price-change': [price: number | null]
    'stock-filter-change': [filter: string | null]
}>()

const categoryOptions = computed(() => [
    { value: null, label: 'Todas las categorías' },
    ...props.categories.map(category => ({
        value: category.id,
        label: category.name
    }))
])

const handleCategoryChange = (categoryId: number | null) => {
    emit('category-change', categoryId)
}

const handleMinPriceChange = (value: string | number | null) => {
    const price = value ? Number(value) : null
    emit('min-price-change', price)
}

const handleMaxPriceChange = (value: string | number | null) => {
    const price = value ? Number(value) : null
    emit('max-price-change', price)
}

const handleStockFilterChange = (filter: string | null) => {
    emit('stock-filter-change', filter)
}
</script>

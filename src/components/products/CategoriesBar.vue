<template>
    <div class="categories-bar">
        <div class="flex flex-wrap gap-2 py-2 overflow-x-auto">
            <!-- Clear Filter Button -->
            <BaseButton @click="clearSelection" :variant="selectedCategory === null ? 'primary' : 'outline'" size="sm"
                class="whitespace-nowrap flex items-center">
                <span class="flex items-center">
                    <SparklesIcon class="w-4 h-4 mr-2" />
                    Todos
                </span>
            </BaseButton>

            <!-- Category Buttons -->
            <BaseButton v-for="category in categories" :key="category.id" @click="selectCategory(category.id)"
                :variant="selectedCategory === category.id ? 'primary' : 'outline'" size="sm"
                class="whitespace-nowrap ">
                <span class="flex items-center">
                    <TagIcon class="w-4 h-4 mr-2" />
                    {{ category.name }}

                </span>
            </BaseButton>
        </div>

        <!-- Selected Category Info -->
        <div v-if="selectedCategoryName" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <TagIcon class="w-5 h-5 text-blue-600 mr-2" />
                    <span class="text-sm font-medium text-blue-900">
                        Mostrando: {{ selectedCategoryName }}
                    </span>

                </div>
                <div class="mt-2 text-xs text-blue-700 ">
                    {{ productsCount }} productos en esta categoría
                </div>
                <BaseButton @click="clearSelection" variant="outline" size="sm">
                    <span class="flex items-center">
                        <XMarkIcon class="w-3 h-3 mr-1" />
                        Limpiar
                    </span>
                </BaseButton>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { ProductCategory } from '@/types/product'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    TagIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    categories?: ProductCategory[]
    productsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
    categories: () => [],
    productsCount: 0
})

// Emits
const emit = defineEmits<{
    categorySelected: [categoryId: number | null]
}>()

// Composables
const ordersStore = useOrdersDraftsStore()

// Computed
const selectedCategory = computed(() => ordersStore.selectedCategory)

const selectedCategoryName = computed(() => {
    if (!selectedCategory.value || props.categories.length === 0) return null

    const category = props.categories.find(c => c.id === selectedCategory.value)
    return category?.name || null
})

const categories = computed(() => props.categories.length > 0 ? props.categories : ordersStore.categories)

const productsCount = computed(() => {
    if (!selectedCategory.value) return ordersStore.products.length

    return ordersStore.products.filter(p => p.categoryId === selectedCategory.value).length
})

// Methods
const selectCategory = (categoryId: number) => {
    ordersStore.setSelectedCategory(categoryId)
    emit('categorySelected', categoryId)
}

const clearSelection = () => {
    ordersStore.setSelectedCategory(null)
    emit('categorySelected', null)
}
</script>

<style scoped>
.categories-bar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

.categories-bar::-webkit-scrollbar {
    height: 4px;
}

.categories-bar::-webkit-scrollbar-track {
    background: transparent;
}

.categories-bar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 2px;
}

.categories-bar::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}
</style>

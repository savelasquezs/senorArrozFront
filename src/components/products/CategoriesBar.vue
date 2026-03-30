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
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductCategoriesStore } from '@/store/productCategories'
import type { ProductCategory } from '@/types/product'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    TagIcon,
    SparklesIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    categories?: ProductCategory[]
}

const props = withDefaults(defineProps<Props>(), {
    categories: () => [],
})

// Emits
const emit = defineEmits<{
    categorySelected: [categoryId: number | null]
}>()

// Composables
const ordersStore = useOrdersDraftsStore()
const categoriesStore = useProductCategoriesStore()

// Computed
const selectedCategory = computed(() => ordersStore.selectedCategory)

const categories = computed(() =>
	props.categories.length > 0 ? props.categories : categoriesStore.currentCategories,
)

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

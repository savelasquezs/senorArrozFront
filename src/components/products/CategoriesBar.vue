<template>
    <div class="categories-bar">
        <div class="flex flex-wrap items-center gap-y-2 gap-x-2 py-2">
            <BaseButton @click="clearSelection" :variant="isAllSelected ? 'primary' : 'outline'" size="sm"
                class="whitespace-nowrap flex items-center shrink-0">
                <span class="flex items-center">
                    <SparklesIcon class="w-4 h-4 mr-2" />
                    Todos
                </span>
            </BaseButton>

            <div v-if="riceTabs.length" class="flex flex-wrap gap-2 items-center rice-group">
                <BaseButton v-for="tab in riceTabs" :key="tab.key" @click="selectTab(tab.categoryIds)"
                    :variant="isTabActive(tab.categoryIds) ? 'primary' : 'outline'" size="sm"
                    class="whitespace-nowrap">
                    <span class="flex items-center">
                        <TagIcon class="w-4 h-4 mr-2" />
                        {{ tab.label }}
                    </span>
                </BaseButton>
            </div>

            <div v-if="riceTabs.length && otherTabs.length" class="hidden sm:block w-px h-6 bg-gray-300 shrink-0 mx-1"
                aria-hidden="true" />

            <div v-if="otherTabs.length" class="flex flex-wrap gap-2 items-center other-group">
                <BaseButton v-for="tab in otherTabs" :key="tab.key" @click="selectTab(tab.categoryIds)"
                    :variant="isTabActive(tab.categoryIds) ? 'primary' : 'outline'" size="sm"
                    class="whitespace-nowrap">
                    <span class="flex items-center">
                        <TagIcon class="w-4 h-4 mr-2" />
                        {{ tab.label }}
                    </span>
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { OrderPosCategoryTab } from '@/config/orderPosCategories'
import { sameCategoryIdSelection } from '@/config/orderPosCategories'

import BaseButton from '@/components/ui/BaseButton.vue'
import { TagIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(
    defineProps<{
        riceTabs?: OrderPosCategoryTab[]
        otherTabs?: OrderPosCategoryTab[]
    }>(),
    {
        riceTabs: () => [],
        otherTabs: () => [],
    },
)

const emit = defineEmits<{
    categorySelected: [categoryId: number | null]
}>()

const ordersStore = useOrdersDraftsStore()

const selectedIds = computed(() => ordersStore.selectedCategoryIds)

const isAllSelected = computed(() => selectedIds.value === null)

const isTabActive = (ids: number[]) =>
    selectedIds.value !== null && sameCategoryIdSelection(selectedIds.value, ids)

const selectTab = (categoryIds: number[]) => {
    ordersStore.setSelectedCategoryIds(categoryIds)
    emit('categorySelected', categoryIds.length === 1 ? categoryIds[0] : null)
}

const clearSelection = () => {
    ordersStore.setSelectedCategoryIds(null)
    emit('categorySelected', null)
}
</script>

<style scoped>
.categories-bar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

@media (max-width: 639px) {
    .rice-group,
    .other-group {
        width: 100%;
    }
}
</style>

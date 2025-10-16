<template>
    <div v-if="activeFilters.length > 0" class="flex flex-wrap gap-2 mb-4">
        <span class="text-sm text-gray-500 mr-2">Filtros activos:</span>
        <BaseBadge v-for="filter in activeFilters" :key="`${filter.type}-${filter.value}`" :text="filter.label"
            variant="secondary" size="sm" :removable="true" @remove="handleRemoveFilter(filter)" />
        <BaseButton v-if="activeFilters.length > 1" @click="clearAllFilters" variant="ghost" size="sm"
            class="text-gray-500 hover:text-gray-700">
            Limpiar todos
        </BaseButton>
    </div>
</template>

<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Filter {
    type: string
    label: string
    value: any
}

interface Props {
    activeFilters: Filter[]
}

defineProps<Props>()

const emit = defineEmits<{
    'remove-filter': [filter: Filter]
    'clear-all': []
}>()

const handleRemoveFilter = (filter: Filter) => {
    emit('remove-filter', filter)
}

const clearAllFilters = () => {
    emit('clear-all')
}
</script>

<template>
    <div v-if="searchHistory.length > 0" class="mt-4">
        <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-700">Búsquedas recientes</h4>
            <BaseButton @click="handleClearHistory" variant="ghost" size="sm" class="text-gray-500 hover:text-gray-700">
                Limpiar
            </BaseButton>
        </div>
        <div class="flex flex-wrap gap-2">
            <BaseButton v-for="term in searchHistory.slice(0, 5)" :key="term" @click="handleHistoryClick(term)"
                variant="outline" size="sm" class="text-xs">
                {{ term }}
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    searchHistory: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'history-click': [term: string]
    'clear-history': []
}>()

const handleHistoryClick = (term: string) => {
    emit('history-click', term)
}

const handleClearHistory = () => {
    emit('clear-history')
}
</script>

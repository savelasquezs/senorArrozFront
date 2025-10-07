<template>
    <button @click="$emit('toggle')"
        class="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <FunnelIcon class="h-4 w-4 mr-2" />
        Filtros
        <ChevronDownIcon :class="['h-4 w-4 ml-2 transition-transform', { 'rotate-180': expanded }]" />
    </button>
</template>

<script setup lang="ts">
// Icons
import { FunnelIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    expanded: boolean
}

defineProps<Props>()

// Emits
defineEmits<{
    'toggle': []
}>()
</script>

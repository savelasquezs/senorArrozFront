<template>
    <div class="relative inline-block">
        <span :class="[
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            colorClasses,
            clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
            clickable && 'select-none'
        ]" :title="tooltipText" @click="handleClick">
            <component :is="statusIcon" v-if="statusIcon" class="w-3.5 h-3.5 mr-1" />
            {{ displayName }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus } from '@/types/order'
import {
    CheckCircleIcon,
    ClockIcon,
    TruckIcon,
    FireIcon,
    XCircleIcon,
} from '@heroicons/vue/24/solid'
import { useFormatting } from '@/composables/useFormatting'

interface Props {
    status: OrderStatus
    displayName?: string
    statusTime?: string
    clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    clickable: false
})

const emit = defineEmits<{
    click: []
}>()

const { formatDateTime } = useFormatting()

// Mapeo de colores por estado
const colorClasses = computed(() => {
    const colorMap: Record<OrderStatus, string> = {
        taken: 'bg-blue-100 text-blue-800 border-blue-200',
        in_preparation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        ready: 'bg-green-100 text-green-800 border-green-200',
        on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
        delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
    }
    return colorMap[props.status] || 'bg-gray-100 text-gray-800 border-gray-200'
})

// Mapeo de iconos por estado
const statusIcon = computed(() => {
    const iconMap: Record<OrderStatus, any> = {
        taken: ClockIcon,
        in_preparation: FireIcon,
        ready: CheckCircleIcon,
        on_the_way: TruckIcon,
        delivered: CheckCircleIcon,
        cancelled: XCircleIcon,
    }
    return iconMap[props.status]
})

// Texto del tooltip
const tooltipText = computed(() => {
    if (!props.statusTime) return props.displayName || props.status

    return `${props.displayName || props.status} - ${formatDateTime(props.statusTime)}`
})

const handleClick = () => {
    if (props.clickable) {
        emit('click')
    }
}
</script>

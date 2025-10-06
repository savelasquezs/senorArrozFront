<template>
    <div :class="containerClasses">
        <!-- Badge Variant -->
        <BaseBadge v-if="variant === 'badge'" :type="statusType" :text="statusText" :size="size" />

        <!-- Icon Variant -->
        <div v-else-if="variant === 'icon'" :class="iconClasses" :title="statusText">
            <component :is="statusIcon" class="w-4 h-4" />
        </div>

        <!-- Bar Variant -->
        <div v-else-if="variant === 'bar'" class="w-full bg-gray-200 rounded-full h-2">
            <div :class="barClasses" :style="{ width: `${stockPercentage}%` }"
                class="h-2 rounded-full transition-all duration-300" />
        </div>

        <!-- Text Variant -->
        <span v-else :class="textClasses">
            {{ statusText }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    stock: number
    lowStockThreshold?: number
    variant?: 'badge' | 'bar' | 'icon' | 'text'
    showNumber?: boolean
    size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
    lowStockThreshold: 5,
    variant: 'badge',
    showNumber: true,
    size: 'md'
})

// Computed
const stockStatus = computed(() => {
    if (props.stock <= 0) {
        return {
            type: 'danger' as const,
            text: 'Sin stock',
            icon: XCircleIcon,
            color: 'text-red-600',
            bgColor: 'bg-red-600'
        }
    } else if (props.stock <= props.lowStockThreshold) {
        return {
            type: 'warning' as const,
            text: `Bajo stock${props.showNumber ? ` (${props.stock})` : ''}`,
            icon: ExclamationTriangleIcon,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-500'
        }
    } else {
        return {
            type: 'success' as const,
            text: `Disponible${props.showNumber ? ` (${props.stock})` : ''}`,
            icon: CheckCircleIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-600'
        }
    }
})

const statusType = computed(() => stockStatus.value.type)
const statusText = computed(() => stockStatus.value.text)
const statusIcon = computed(() => stockStatus.value.icon)

const stockPercentage = computed(() => {
    if (props.stock <= 0) return 0
    if (props.stock <= props.lowStockThreshold) return (props.stock / props.lowStockThreshold) * 50
    return Math.min(100, (props.stock / 20) * 100) // Assume 20+ is full
})

const containerClasses = computed(() => {
    const classes = []

    switch (props.size) {
        case 'sm':
            classes.push('text-xs')
            break
        case 'lg':
            classes.push('text-base')
            break
        default:
            classes.push('text-sm')
    }

    return classes.join(' ')
})

const iconClasses = computed(() => {
    return [
        'flex items-center justify-center',
        stockStatus.value.color
    ]
})

const barClasses = computed(() => {
    return [
        stockStatus.value.bgColor,
        'transition-all duration-300'
    ]
})

const textClasses = computed(() => {
    return [
        'font-medium',
        stockStatus.value.color
    ]
})
</script>

<template>
    <BaseCard class="overflow-hidden">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <component :is="iconComponent" class="w-5 h-5 text-white" />
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">{{ title }}</dt>
                        <dd class="text-lg font-medium text-gray-900">{{ formattedValue }}</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div v-if="trend" class="bg-gray-50 px-5 py-3">
            <div class="text-sm">
                <span :class="trendClasses">
                    <component :is="trendIcon" class="w-4 h-4 mr-1" />
                    {{ trend }}
                </span>
                <span class="text-gray-500 ml-2">vs mes anterior</span>
            </div>
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from './BaseCard.vue'
import {
    CurrencyDollarIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    BuildingStorefrontIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/vue/24/outline'

interface Props {
    title: string
    value: number | string
    format?: 'currency' | 'number' | 'percentage'
    icon?: string
    trend?: string
    trendDirection?: 'up' | 'down'
}

const props = withDefaults(defineProps<Props>(), {
    format: 'number',
    trendDirection: 'up'
})

const iconComponents = {
    CurrencyDollarIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    BuildingStorefrontIcon
}

const iconComponent = computed(() => {
    return props.icon && iconComponents[props.icon as keyof typeof iconComponents]
        ? iconComponents[props.icon as keyof typeof iconComponents]
        : ClipboardDocumentListIcon
})

const formattedValue = computed(() => {
    if (typeof props.value === 'string') return props.value

    switch (props.format) {
        case 'currency':
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(props.value)

        case 'percentage':
            return `${props.value}%`

        case 'number':
        default:
            return new Intl.NumberFormat('es-CO').format(props.value)
    }
})

const trendClasses = computed(() => {
    const baseClasses = 'flex items-center text-sm font-medium'

    if (props.trendDirection === 'up') {
        return `${baseClasses} text-green-600`
    } else {
        return `${baseClasses} text-red-600`
    }
})

const trendIcon = computed(() => {
    return props.trendDirection === 'up' ? ArrowUpIcon : ArrowDownIcon
})
</script>
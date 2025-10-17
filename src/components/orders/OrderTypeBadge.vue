<template>
    <span :class="[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClasses
    ]">
        <component :is="typeIcon" class="w-3.5 h-3.5 mr-1" />
        {{ displayName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderType } from '@/types/order'
import { HomeIcon, TruckIcon, CalendarIcon } from '@heroicons/vue/24/outline'

interface Props {
    type: OrderType
    displayName?: string
}

const props = defineProps<Props>()

// Mapeo de colores por tipo
const colorClasses = computed(() => {
    const colorMap: Record<OrderType, string> = {
        onsite: 'bg-gray-100 text-gray-800 border-gray-200',
        delivery: 'bg-blue-100 text-blue-800 border-blue-200',
        reservation: 'bg-purple-100 text-purple-800 border-purple-200',
    }
    return colorMap[props.type] || 'bg-gray-100 text-gray-800 border-gray-200'
})

// Mapeo de iconos por tipo
const typeIcon = computed(() => {
    const iconMap: Record<OrderType, any> = {
        onsite: HomeIcon,
        delivery: TruckIcon,
        reservation: CalendarIcon,
    }
    return iconMap[props.type]
})

// Nombre display por defecto
const displayName = computed(() => {
    if (props.displayName) return props.displayName

    const nameMap: Record<OrderType, string> = {
        onsite: 'En el local',
        delivery: 'Domicilio',
        reservation: 'Reserva',
    }
    return nameMap[props.type] || props.type
})
</script>

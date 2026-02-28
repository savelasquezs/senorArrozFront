

<template>
    <BaseSelect :model-value="modelValue" :options="deliverymanOptions" value-key="value" display-key="label"
        placeholder="Todos los domiciliarios" @update:model-value="$emit('update:modelValue', $event)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderListItem } from '@/types/order'
import BaseSelect from '@/components/ui/BaseSelect.vue'

interface Props {
    modelValue: number | null
    orders: OrderListItem[]
}

const props = defineProps<Props>()

defineEmits<{
    'update:modelValue': [value: number | null]
}>()

// Extraer domiciliarios únicos de los pedidos actuales
const deliverymanOptions = computed(() => {
    const uniqueDeliverymen = new Map<number, string>()

    props.orders.forEach(order => {
        if (order.deliveryManId && order.deliveryManName) {
            uniqueDeliverymen.set(order.deliveryManId, order.deliveryManName)
        }
    })

    const options: Array<{ value: number | null; label: string }> = [
        { value: null, label: 'Todos los domiciliarios' }
    ]

    uniqueDeliverymen.forEach((name, id) => {
        options.push({ value: id, label: name })
    })

    return options
})
</script>

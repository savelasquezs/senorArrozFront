<template>
    <div class="w-full">
        <BaseSelect :model-value="modelValue" :options="neighborhoodOptions" value-key="value" display-key="label"
            placeholder="Todos los barrios" @update:model-value="$emit('update:modelValue', $event)" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

export interface NeighborhoodOptionItem {
    id: number
    name: string
}

interface Props {
    modelValue: number | null
    /** Barrios disponibles (p. ej. solo los que tienen entregas en el periodo). */
    options?: NeighborhoodOptionItem[]
}

const props = withDefaults(defineProps<Props>(), {
    options: () => [],
})

defineEmits<{ 'update:modelValue': [value: number | null] }>()

const neighborhoodOptions = computed(() => {
    const opts: Array<{ value: number | null; label: string }> = [
        { value: null, label: 'Todos los barrios' },
    ]
    for (const n of props.options) {
        opts.push({ value: n.id, label: n.name })
    }
    return opts
})
</script>

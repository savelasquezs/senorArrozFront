<template>
    <div class="w-full">
        <BaseSelect :model-value="modelValue" :options="neighborhoodOptions" value-key="value" display-key="label"
            placeholder="Todos los barrios" @update:model-value="$emit('update:modelValue', $event)" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

interface Props {
    modelValue: number | null
}

defineProps<Props>()
defineEmits<{ 'update:modelValue': [value: number | null] }>()

const neighborhoodOptions = computed(() => {
    const options: Array<{ value: number | null; label: string }> = [
        { value: null, label: 'Todos los barrios' }
    ]

    // TODO: Obtener barrios de la sucursal del usuario
    // Por ahora retornamos solo la opción "Todos"
    // En producción, aquí se debería cargar desde customersStore o neighborhoods store

    return options
})
</script>

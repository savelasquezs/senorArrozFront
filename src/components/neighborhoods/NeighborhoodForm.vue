<!-- src/components/NeighborhoodForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Neighborhood Name -->
        <BaseInput v-model="form.name" label="Nombre del Barrio" placeholder="Ej: El Poblado, Laureles, Centro" required
            :error="errors.name" :maxlength="100">
            <template #icon>
                <MapPinIcon class="w-4 h-4" />
            </template>
        </BaseInput>

        <!-- Delivery Fee -->
        <BaseInput v-model.number="form.deliveryFee" label="Tarifa de Domicilio" type="number" :min="0" :step="100"
            placeholder="5000" required :error="errors.deliveryFee">
            <template #icon>
                <CurrencyDollarIcon class="w-4 h-4" />
            </template>
        </BaseInput>

        <!-- Validation Info -->
        <BaseAlert v-if="showValidationInfo" variant="info">
            <InformationCircleIcon class="w-5 h-5" />
            <div>
                <h4 class="font-medium">Información sobre los barrios</h4>
                <ul class="mt-1 text-sm list-disc list-inside space-y-1">
                    <li>El nombre del barrio debe ser único en la sucursal</li>
                    <li>La tarifa de domicilio se aplica a todas las entregas en este barrio</li>
                    <li>Los barrios se usan para organizar las direcciones de los clientes</li>
                </ul>
            </div>
        </BaseAlert>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ neighborhood && 'id' in neighborhood ? 'Actualizar' : 'Crear' }} Barrio
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Neighborhood, NeighborhoodFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import {
    MapPinIcon,
    CurrencyDollarIcon,
    InformationCircleIcon
} from '@heroicons/vue/24/outline'

interface Props {
    neighborhood?: Neighborhood | NeighborhoodFormData | null
    loading?: boolean
    neigborhoodNameToCreate?: string
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: NeighborhoodFormData]
    cancel: []
}>()

const form = reactive({
    name: '',
    deliveryFee: 0
})

const errors = reactive({
    name: '',
    deliveryFee: ''
})

const showValidationInfo = ref(false)

const isFormValid = computed(() => {
    return form.name.trim() &&
        form.deliveryFee >= 0 &&
        !errors.name &&
        !errors.deliveryFee
})

const validateForm = () => {
    // Validate name
    if (!form.name.trim()) {
        errors.name = 'El nombre del barrio es requerido'
    } else if (form.name.length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (form.name.length > 100) {
        errors.name = 'El nombre no puede tener más de 100 caracteres'
    } else {
        errors.name = ''
    }

    // Validate delivery fee
    if (form.deliveryFee < 0) {
        errors.deliveryFee = 'La tarifa no puede ser negativa'
    } else if (form.deliveryFee > 100000) {
        errors.deliveryFee = 'La tarifa no puede ser mayor a $100,000'
    } else {
        errors.deliveryFee = ''
    }
}

const handleSubmit = () => {
    validateForm()

    if (!isFormValid.value) {
        return
    }

    const formData: NeighborhoodFormData = {
        name: form.name.trim(),
        deliveryFee: form.deliveryFee
    }

    emit('submit', formData)
}

// Watch for neighborhood prop changes to populate form
watch(() => props.neighborhood, (newNeighborhood) => {
    if (newNeighborhood) {
        form.name = newNeighborhood.name
        form.deliveryFee = newNeighborhood.deliveryFee
        showValidationInfo.value = false
    } else {
        // Reset form for new neighborhood
        form.name = ''
        form.deliveryFee = 0
        showValidationInfo.value = true
    }

    // Clear errors
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = ''
    })
}, { immediate: true })

// Show validation info for new neighborhoods after a short delay
watch(() => props.neighborhood, (newNeighborhood) => {
    if (!newNeighborhood) {
        setTimeout(() => {
            showValidationInfo.value = true
        }, 1000)
    }
})

watch(() => props.neigborhoodNameToCreate, (newNeighborhoodNameToCreate) => {
    if (newNeighborhoodNameToCreate) {
        form.name = newNeighborhoodNameToCreate
    }
})
</script>

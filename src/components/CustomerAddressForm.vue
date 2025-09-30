<!-- src/components/CustomerAddressForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Neighborhood Selection -->
        <BaseSelect v-model="form.neighborhoodId" :options="neighborhoodOptions" label="Barrio"
            placeholder="Seleccionar barrio..." required :error="errors.neighborhoodId" @change="validateNeighborhood"
            value-key="value" display-key="label">
            <template #icon>
                <MapPinIcon class="w-4 h-4" />
            </template>
        </BaseSelect>

        <!-- Address -->
        <BaseInput v-model="form.address" label="Dirección" placeholder="Ej: Calle 10 #20-30" required
            :error="errors.address" maxlength="200">
            <template #icon>
                <HomeIcon class="w-4 h-4" />
            </template>
        </BaseInput>

        <!-- Additional Info -->
        <BaseInput v-model="form.additionalInfo" label="Información Adicional"
            placeholder="Ej: Apto 202, Torre A, Frente al parque" :error="errors.additionalInfo" maxlength="100">
            <template #icon>
                <InformationCircleIcon class="w-4 h-4" />
            </template>
        </BaseInput>

        <!-- Coordinates -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model.number="form.latitude" label="Latitud" type="number" step="any" placeholder="6.25184"
                required :error="errors.latitude">
                <template #icon>
                    <MapIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model.number="form.longitude" label="Longitud" type="number" step="any" placeholder="-75.56359"
                required :error="errors.longitude">
                <template #icon>
                    <MapIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Primary Address Checkbox -->
        <div class="flex items-center">
            <input id="isPrimary" v-model="form.isPrimary" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="isPrimary" class="ml-2 block text-sm text-gray-900">
                Marcar como dirección principal
            </label>
        </div>

        <!-- Validation Info -->
        <BaseAlert v-if="showValidationInfo" variant="info">
            <InformationCircleIcon class="w-5 h-5" />
            <div>
                <h4 class="font-medium">Información sobre las coordenadas</h4>
                <ul class="mt-1 text-sm list-disc list-inside space-y-1">
                    <li>Las coordenadas se usan para calcular rutas de entrega</li>
                    <li>Puedes obtenerlas desde Google Maps o cualquier aplicación de mapas</li>
                    <li>La dirección principal se usa por defecto para las entregas</li>
                </ul>
            </div>
        </BaseAlert>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ address ? 'Actualizar' : 'Crear' }} Dirección
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useCustomersStore } from '@/store/customers'
import type { CustomerAddress, CustomerAddressFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import {
    MapPinIcon,
    HomeIcon,
    InformationCircleIcon,
    MapIcon
} from '@heroicons/vue/24/outline'

interface Props {
    address?: CustomerAddress | null
    customerId: number
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: CustomerAddressFormData]
    cancel: []
}>()

const customersStore = useCustomersStore()

const form = reactive({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: 0,
    longitude: 0,
    isPrimary: false,
    deliveryFee: 0
})

const errors = reactive({
    neighborhoodId: '',
    address: '',
    additionalInfo: '',
    latitude: '',
    longitude: ''
})

const showValidationInfo = ref(false)

// Computed properties
const neighborhoodOptions = computed(() => {
    if (!customersStore.availableNeighborhoods) return []
    return customersStore.availableNeighborhoods.map(neighborhood => ({
        value: neighborhood.id,
        label: `${neighborhood.name} - $${neighborhood.deliveryFee.toLocaleString()}`
    }))
})

const isFormValid = computed(() => {
    return form.neighborhoodId > 0 &&
        form.address.trim() &&
        form.latitude !== 0 &&
        form.longitude !== 0 &&
        !errors.neighborhoodId &&
        !errors.address &&
        !errors.latitude &&
        !errors.longitude
})

// Validation methods
const validateNeighborhood = () => {
    if (!form.neighborhoodId) {
        errors.neighborhoodId = 'Selecciona un barrio'
        return
    }
    errors.neighborhoodId = ''
}

const validateForm = () => {
    validateNeighborhood()

    if (!form.address.trim()) {
        errors.address = 'La dirección es requerida'
    } else if (form.address.length < 10) {
        errors.address = 'La dirección debe ser más específica (mínimo 10 caracteres)'
    } else if (form.address.length > 200) {
        errors.address = 'La dirección no puede tener más de 200 caracteres'
    } else {
        errors.address = ''
    }

    if (form.additionalInfo && form.additionalInfo.length > 100) {
        errors.additionalInfo = 'La información adicional no puede tener más de 100 caracteres'
    } else {
        errors.additionalInfo = ''
    }

    if (form.latitude === 0) {
        errors.latitude = 'La latitud es requerida'
    } else if (form.latitude < -90 || form.latitude > 90) {
        errors.latitude = 'La latitud debe estar entre -90 y 90'
    } else {
        errors.latitude = ''
    }

    if (form.longitude === 0) {
        errors.longitude = 'La longitud es requerida'
    } else if (form.longitude < -180 || form.longitude > 180) {
        errors.longitude = 'La longitud debe estar entre -180 y 180'
    } else {
        errors.longitude = ''
    }
}

const handleSubmit = () => {
    validateForm()

    if (!isFormValid.value) {
        return
    }

    const formData: CustomerAddressFormData = {
        neighborhoodId: form.neighborhoodId,
        address: form.address.trim(),
        additionalInfo: form.additionalInfo.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        isPrimary: form.isPrimary,
        deliveryFee: form.deliveryFee
    }

    emit('submit', formData)
}

// Watch for address prop changes to populate form
watch(() => props.address, (newAddress) => {
    if (newAddress) {
        form.neighborhoodId = newAddress.neighborhoodId
        form.address = newAddress.address
        form.additionalInfo = newAddress.additionalInfo || ''
        form.latitude = newAddress.latitude || 0
        form.longitude = newAddress.longitude || 0
        form.isPrimary = newAddress.isPrimary
        form.deliveryFee = newAddress.deliveryFee
        showValidationInfo.value = false
    } else {
        // Reset form for new address
        form.neighborhoodId = 0
        form.address = ''
        form.additionalInfo = ''
        form.latitude = 0
        form.longitude = 0
        form.isPrimary = false
        showValidationInfo.value = true
    }

    // Clear errors
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = ''
    })
}, { immediate: true })

// Load neighborhoods on mount
onMounted(async () => {
    try {
        await customersStore.fetchNeighborhoods()
    } catch (error) {
        console.error('Error loading neighborhoods:', error)
    }
})

// Show validation info for new addresses after a short delay
watch(() => props.address, (newAddress) => {
    if (!newAddress) {
        setTimeout(() => {
            showValidationInfo.value = true
        }, 1000)
    }
})
</script>

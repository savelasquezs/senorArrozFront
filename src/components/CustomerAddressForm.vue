<!-- src/components/CustomerAddressForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Step 1: Neighborhood Selection (always visible) -->
        <NeighborhoodSearch v-model="form.neighborhoodId" label="Barrio" placeholder="Buscar barrio..." :required="true"
            :error="errors.neighborhoodId" @update:model-value="validateNeighborhood" />

        <!-- Step 2: Address Input (visible when neighborhood is selected) -->
        <div v-if="form.neighborhoodId > 0">
            <BaseInput v-model="form.address" label="Dirección" placeholder="Ej: Calle 10 #20-30" required
                :error="errors.address" :maxlength="200" :minlength="10" @blur="handleAddressBlur">
                <template #icon>
                    <HomeIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Step 3: Google Maps Selector (visible when address has value and blur occurred) -->
        <div v-if="form.address.trim() && showMapsSelector">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar ubicación
            </label>
            <GoogleMapsSelector v-model="selectedLocation" :error="errors.latitude || errors.longitude"
                :initial-address="form.address" @location-confirmed="handleLocationConfirmed"
                :key="`maps-${address?.id || 'new'}`" />
        </div>

        <!-- Step 4: Additional Info (visible when location is confirmed) -->
        <div v-if="isLocationConfirmed">
            <BaseInput v-model="form.additionalInfo" label="Información Adicional"
                placeholder="Ej: Apto 202, Torre A, Frente al parque" :error="errors.additionalInfo" :maxlength="100">
                <template #icon>
                    <InformationCircleIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <!-- Delivery Fee -->
            <BaseInput v-model.number="form.deliveryFee" label="Tarifa de Domicilio" type="number" min="0" step="100"
                placeholder="5000" required :error="errors.deliveryFee">
                <template #icon>
                    <CurrencyDollarIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <!-- Primary Address Checkbox -->
            <div class="flex items-center">
                <input id="isPrimary" v-model="form.isPrimary" type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label for="isPrimary" class="ml-2 block text-sm text-gray-900">
                    Marcar como dirección principal
                </label>
            </div>
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
import { useToast } from '@/composables/useToast'
import type { CustomerAddress, CustomerAddressFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import GoogleMapsSelector from '@/components/ui/GoogleMapsSelector.vue'
import NeighborhoodSearch from '@/components/ui/NeighborhoodSearch.vue'
import {
    HomeIcon,
    InformationCircleIcon,
    CurrencyDollarIcon
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
const { success, error: showError } = useToast()

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
    longitude: '',
    deliveryFee: ''
})

const showValidationInfo = ref(false)
const selectedLocation = ref<{ lat: number; lng: number } | null>(null)
const showMapsSelector = ref(false)
const isLocationConfirmed = ref(false)

// Computed properties - removed neighborhoodOptions since we're using NeighborhoodSearch

const isFormValid = computed(() => {
    return form.neighborhoodId > 0 &&
        form.address.trim() &&
        form.latitude !== 0 &&
        form.longitude !== 0 &&
        form.deliveryFee > 0 &&
        !errors.neighborhoodId &&
        !errors.address &&
        !errors.latitude &&
        !errors.longitude &&
        !errors.deliveryFee
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

    if (form.deliveryFee <= 0) {
        errors.deliveryFee = 'La tarifa de domicilio es requerida'
    } else {
        errors.deliveryFee = ''
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
        selectedLocation.value = {
            lat: newAddress.latitude || 0,
            lng: newAddress.longitude || 0
        }
        showMapsSelector.value = true
        isLocationConfirmed.value = true
        showValidationInfo.value = false
    } else {
        // Reset form for new address
        form.neighborhoodId = 0
        form.address = ''
        form.additionalInfo = ''
        form.latitude = 0
        form.longitude = 0
        form.isPrimary = false
        form.deliveryFee = 0
        selectedLocation.value = null
        showMapsSelector.value = false
        isLocationConfirmed.value = false
        showValidationInfo.value = true
    }

    // Clear errors
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = ''
    })
}, { immediate: true })

// Watch for location changes to update coordinates
watch(selectedLocation, (newLocation) => {
    if (newLocation) {
        form.latitude = newLocation.lat
        form.longitude = newLocation.lng
    }
})

// Watch for neighborhood changes to update delivery fee
watch(() => form.neighborhoodId, (newNeighborhoodId) => {
    if (newNeighborhoodId > 0) {
        const neighborhood = customersStore.availableNeighborhoods.find(n => n.id === newNeighborhoodId)
        if (neighborhood) {
            form.deliveryFee = neighborhood.deliveryFee
        }
    }
})

// Handle location confirmation
const handleLocationConfirmed = () => {
    isLocationConfirmed.value = true
    // Clear any coordinate errors when location is confirmed
    errors.latitude = ''
    errors.longitude = ''
}

// Handle address blur - trigger search in GoogleMapsSelector
const handleAddressBlur = () => {
    if (form.address.trim()) {
        showMapsSelector.value = true
    }
}

// Load neighborhoods on mount
onMounted(async () => {
    try {
        await customersStore.fetchNeighborhoods()
        success('Barrios Cargados', 2000, 'Los barrios disponibles han sido cargados correctamente.')
    } catch (error) {
        console.error('Error loading neighborhoods:', error)
        showError('Error de Carga', 'No se pudieron cargar los barrios disponibles.')
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

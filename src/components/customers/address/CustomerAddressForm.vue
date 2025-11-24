<!-- src/components/CustomerAddressForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Step 1: Neighborhood Selection -->
        <NeighborhoodSearch v-model="localForm.neighborhoodId" label="Barrio" placeholder="Buscar barrio..."
            :required="true" :error="errors.neighborhoodId" @update:model-value="validateNeighborhood"
            :branch-id="branchId" />

        <!-- Step 2: Address Input -->
        <div v-if="localForm.neighborhoodId > 0">
            <BaseInput v-model="localForm.address" label="Dirección" placeholder="Ej: Calle 10 #20-30" required
                :error="errors.address" :maxlength="200" :minlength="10" @blur="handleAddressBlur"
                @enter="handleAddressBlur">
                <template #icon>
                    <HomeIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="localForm.additionalInfo" label="Información Adicional"
                placeholder="Ej: Apto 202, Torre A, Frente al parque" :error="errors.additionalInfo" :maxlength="100">
                <template #icon>
                    <InformationCircleIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="localForm.deliveryFee" label="Tarifa de Domicilio" type="number" :min="0" :step="100"
                placeholder="5000" required :error="errors.deliveryFee">
                <template #icon>
                    <CurrencyDollarIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Step 3: Google Maps Selector -->
        <div v-if="localForm.address.trim() && showMapsSelector">
            <GoogleMapsSelector v-model="selectedLocation" :error="errors.latitude || errors.longitude"
                :initial-address="localForm.address" 
                @location-confirmed="handleLocationConfirmed"
                @address-updated="handleAddressUpdated"
                :key="`maps-${address?.id || 'new'}`" />
        </div>

        <!-- Primary Address Checkbox -->
        <div class="flex items-center">
            <input id="isPrimary" v-model="localForm.isPrimary" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label for="isPrimary" class="ml-2 block text-sm text-gray-900">
                Marcar como dirección principal
            </label>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200" v-if="customerId">
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
import { ref, reactive, computed, watch, onMounted } from "vue"
import { useCustomersStore } from "@/store/customers"
import { useBranchesStore } from "@/store/branches"
import { useToast } from "@/composables/useToast"
import type { CustomerAddress, CustomerAddressFormData } from "@/types/customer"
import BaseInput from "@/components/ui/BaseInput.vue"
import BaseButton from "@/components/ui/BaseButton.vue"
import GoogleMapsSelector from "@/components/ui/GoogleMapsSelector.vue"
import NeighborhoodSearch from "@/components/neighborhoods/NeighborhoodSearch.vue"
import {
    HomeIcon,
    InformationCircleIcon,
    CurrencyDollarIcon,
} from "@heroicons/vue/24/outline"

interface Props {
    address?: CustomerAddress | null
    modelValue: CustomerAddressFormData
    customerId: number
    loading?: boolean
    branchId?: number
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
})

const emit = defineEmits<{
    submit: [data: CustomerAddressFormData]
    cancel: []
    "update:modelValue": [data: CustomerAddressFormData]
}>()

const customersStore = useCustomersStore()
const { success, error: showError } = useToast()
const branchesStore = useBranchesStore()

// Proxy local state with v-model
const localForm = reactive({ ...props.modelValue })

watch(
    () => props.modelValue,
    (newVal) => {
        Object.assign(localForm, newVal)
    },
    { deep: true }
)

watch(
    localForm,
    (val) => {
        emit("update:modelValue", { ...val })
    },
    { deep: true }
)

const errors = reactive({
    neighborhoodId: "",
    address: "",
    additionalInfo: "",
    latitude: "",
    longitude: "",
    deliveryFee: "",
})

const selectedLocation = ref<{ lat: number; lng: number } | null>(null)
const showMapsSelector = ref(false)
const isLocationConfirmed = ref(false)

const isFormValid = computed(() => {
    return (
        localForm.neighborhoodId > 0 &&
        localForm.address.trim() &&
        localForm.latitude !== 0 &&
        localForm.longitude !== 0 &&
        Number(localForm.deliveryFee) > 0 &&
        !errors.neighborhoodId &&
        !errors.address &&
        !errors.latitude &&
        !errors.longitude &&
        !errors.deliveryFee
    )
})

// Validation
const validateNeighborhood = () => {
    if (!localForm.neighborhoodId) {
        errors.neighborhoodId = "Selecciona un barrio"
        return
    }
    localForm.deliveryFee =
        branchesStore.currentNeighborhoods?.find(
            (n) => n.id === localForm.neighborhoodId
        )?.deliveryFee || 0
    errors.neighborhoodId = ""
}

const validateForm = () => {
    validateNeighborhood()

    if (!localForm.address.trim()) {
        errors.address = "La dirección es requerida"
    } else if (localForm.address.length < 10) {
        errors.address = "La dirección debe ser más específica (mínimo 10 caracteres)"
    } else if (localForm.address.length > 200) {
        errors.address = "La dirección no puede tener más de 200 caracteres"
    } else {
        errors.address = ""
    }

    if (localForm.additionalInfo && localForm.additionalInfo.length > 100) {
        errors.additionalInfo =
            "La información adicional no puede tener más de 100 caracteres"
    } else {
        errors.additionalInfo = ""
    }

    if (localForm.latitude === 0) {
        errors.latitude = "La latitud es requerida"
    } else if (localForm.latitude && (localForm.latitude < -90 || localForm.latitude > 90)) {
        errors.latitude = "La latitud debe estar entre -90 y 90"
    } else {
        errors.latitude = ""
    }

    if (localForm.longitude === 0) {
        errors.longitude = "La longitud es requerida"
    } else if (localForm.longitude && (localForm.longitude < -180 || localForm.longitude > 180)) {
        errors.longitude = "La longitud debe estar entre -180 y 180"
    } else {
        errors.longitude = ""
    }

    if (Number(localForm.deliveryFee) <= 0) {
        errors.deliveryFee = "La tarifa de domicilio es requerida"
    } else {
        errors.deliveryFee = ""
    }
}

const handleSubmit = () => {
    validateForm()
    if (!isFormValid.value) return
    emit("submit", { ...localForm })
}

// Watch for location changes
watch(selectedLocation, (newLocation) => {
    if (newLocation) {
        localForm.latitude = newLocation.lat
        localForm.longitude = newLocation.lng
    }
})

const handleLocationConfirmed = () => {
    isLocationConfirmed.value = true
    errors.latitude = ""
    errors.longitude = ""
}

const handleAddressUpdated = (newAddress: string) => {
    if (newAddress && newAddress.trim()) {
        localForm.address = newAddress.trim()
        errors.address = ""
    }
}

const handleAddressBlur = () => {
    if (localForm.address.trim()) {
        showMapsSelector.value = true
    }
}

// Load neighborhoods
onMounted(async () => {
    try {
        await customersStore.fetchNeighborhoods()
        success(
            "Barrios Cargados",
            2000,
            "Los barrios disponibles han sido cargados correctamente."
        )
    } catch (error) {
        console.error("Error loading neighborhoods:", error)
        showError("Error de Carga", "No se pudieron cargar los barrios disponibles.")
    }
})
</script>
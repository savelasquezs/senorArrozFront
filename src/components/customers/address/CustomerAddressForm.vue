<!-- src/components/CustomerAddressForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Step 1: Neighborhood Selection -->
        <NeighborhoodSearch v-model="localForm.neighborhoodId" :required="true" :error="errors.neighborhoodId"
            @update:model-value="validateNeighborhood" />

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

            <button
                v-if="showChangeCoordsLink"
                type="button"
                class="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2 text-left"
                @click="openChangeCoordinates"
            >
                Cambiar coordenadas en el mapa
            </button>

            <BaseInput
                v-if="props.canEditDeliveryFee !== false"
                v-model="localForm.deliveryFee"
                label="Tarifa de Domicilio"
                type="number"
                :min="0"
                :step="100"
                placeholder="5000"
                required
                :error="errors.deliveryFee"
            >
                <template #icon>
                    <CurrencyDollarIcon class="w-4 h-4" />
                </template>
            </BaseInput>

        </div>

        <!-- Step 3: Google Maps Selector -->
        <div v-if="localForm.address.trim() && showMapsSelector">
            <GoogleMapsSelector v-model="selectedLocation" :error="errors.latitude || errors.longitude"
                :initial-address="localForm.address" @location-confirmed="handleLocationConfirmed"
                :key="`maps-${props.addressId || 'new'}`" />
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
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton v-if="props.addressId" @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :disabled="!isFormValid">
                {{ props.addressId ? 'Actualizar' : 'Crear' }} Dirección
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue"
import { useCustomersStore } from "@/store/customers"
import { useBranchesStore } from "@/store/branches"
import { useToast } from "@/composables/useToast"
import type { CustomerAddressFormData } from "@/types/customer"
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
    addressId?: number
    modelValue: CustomerAddressFormData
    /** Si false, oculta / deshabilita la tarifa (domiciliario no la edita). */
    canEditDeliveryFee?: boolean
    /** Absorbidos desde padres (p. ej. CustomerAddressesList). */
    loading?: boolean
    customerId?: number
    branchId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
    submit: [data: CustomerAddressFormData]
    cancel: []
    "update:modelValue": [data: CustomerAddressFormData]
}>()

const customersStore = useCustomersStore()
const { error: showError } = useToast()
const branchesStore = useBranchesStore()

// Proxy local state with v-model
const localForm = reactive({
    ...props.modelValue,
    additionalInfo: props.modelValue.additionalInfo ?? ''
})

watch(
    () => props.modelValue,
    (newVal) => {
        Object.assign(localForm, {
            ...newVal,
            additionalInfo: newVal.additionalInfo ?? ''
        })
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

/** Texto de dirección tal como vino del servidor (edición). */
const baselineAddress = ref('')
/** Coordenadas guardadas al cargar (edición). */
const baselineLat = ref(0)
const baselineLng = ref(0)
/** True si al cargar ya había lat/lng válidos (no mostrar mapa hasta que cambie la calle o el usuario pida ajuste). */
const hasSavedCoordinates = ref(false)

const normAddr = (s: string) => s.trim()

const showChangeCoordsLink = computed(
    () =>
        Boolean(props.addressId) &&
        hasSavedCoordinates.value &&
        !showMapsSelector.value &&
        localForm.neighborhoodId > 0
)

function restoreBaselineCoords() {
    localForm.latitude = baselineLat.value
    localForm.longitude = baselineLng.value
    if (baselineLat.value !== 0 && baselineLng.value !== 0) {
        selectedLocation.value = { lat: baselineLat.value, lng: baselineLng.value }
        isLocationConfirmed.value = true
    } else {
        selectedLocation.value = null
        isLocationConfirmed.value = false
    }
}

function clearCoordsForRemap() {
    localForm.latitude = 0
    localForm.longitude = 0
    selectedLocation.value = null
    isLocationConfirmed.value = false
}

function openChangeCoordinates() {
    showMapsSelector.value = true
}

const isFormValid = computed(() => {
    const feeOk = props.canEditDeliveryFee === false ? true : Number(localForm.deliveryFee) >= 0
    return (
        localForm.neighborhoodId > 0 &&
        localForm.address.trim() &&
        localForm.latitude !== 0 &&
        localForm.longitude !== 0 &&
        feeOk &&
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
    // Al CREAR: solo pre-llenar deliveryFee si está en 0 (primera vez). No sobrescribir si el usuario ya lo modificó.
    // Al editar: nunca sobrescribir.
    if (!props.addressId && Number(localForm.deliveryFee) === 0) {
        const id = localForm.neighborhoodId
        const n =
            customersStore.neighborhoods.find((x) => x.id === id) ??
            branchesStore.currentNeighborhoods?.find((x) => x.id === id)
        localForm.deliveryFee = n?.deliveryFee ?? 0
    }
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

    if (props.canEditDeliveryFee === false) {
        errors.deliveryFee = ""
    } else {
        const feeNum = Number(localForm.deliveryFee)
        if (Number.isNaN(feeNum) || feeNum < 0) {
            errors.deliveryFee = "La tarifa de domicilio no es válida"
        } else {
            errors.deliveryFee = ""
        }
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



const handleAddressBlur = () => {
    if (!normAddr(localForm.address)) return

    // Crear dirección nueva: mismo comportamiento que antes (mostrar mapa al salir del campo).
    if (!props.addressId) {
        showMapsSelector.value = true
        return
    }

    // Editar: con coordenadas guardadas solo mapa si la línea de dirección ya no coincide con la original.
    if (hasSavedCoordinates.value) {
        if (normAddr(localForm.address) === normAddr(baselineAddress.value)) {
            showMapsSelector.value = false
            restoreBaselineCoords()
        } else {
            showMapsSelector.value = true
            clearCoordsForRemap()
        }
        return
    }

    // Editar sin coordenadas previas: requiere mapa al completar la dirección.
    showMapsSelector.value = true
}

// Load neighborhoods and address if editing
onMounted(async () => {
    try {
        // Load address data if editing
        if (props.addressId) {
            try {
                const address = await customersStore.fetchAddressById(props.addressId)
                if (address) {
                    localForm.neighborhoodId = address.neighborhoodId
                    localForm.address = address.address
                    localForm.additionalInfo = address.additionalInfo ?? ''
                    localForm.latitude = address.latitude ?? 0
                    localForm.longitude = address.longitude ?? 0
                    localForm.deliveryFee = address.deliveryFee
                    localForm.isPrimary = address.isPrimary

                    baselineAddress.value = normAddr(address.address)
                    baselineLat.value = address.latitude ?? 0
                    baselineLng.value = address.longitude ?? 0
                    const latOk = baselineLat.value !== 0 && !Number.isNaN(baselineLat.value)
                    const lngOk = baselineLng.value !== 0 && !Number.isNaN(baselineLng.value)
                    hasSavedCoordinates.value = latOk && lngOk

                    if (hasSavedCoordinates.value) {
                        selectedLocation.value = {
                            lat: baselineLat.value,
                            lng: baselineLng.value
                        }
                        showMapsSelector.value = false
                        isLocationConfirmed.value = true
                    } else {
                        selectedLocation.value = null
                        showMapsSelector.value = false
                        isLocationConfirmed.value = false
                    }
                }
            } catch (error) {
                console.error("Error loading address:", error)
                showError("Error de Carga", "No se pudo cargar la dirección.")
            }
        }

        // Load neighborhoods
        await customersStore.fetchNeighborhoods()

    } catch (error) {
        console.error("Error loading neighborhoods:", error)
        showError("Error de Carga", "No se pudieron cargar los barrios disponibles.")
    }
})
</script>
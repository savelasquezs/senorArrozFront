<!-- src/components/branches/BranchForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Branch Name -->
        <div>
            <BaseInput v-model="form.name" label="Nombre de la Sucursal" placeholder="Ej: Sucursal Centro" required
                :error="errors.name" :maxlength="100" :disabled="lockBranchName">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseInput>
            <p v-if="lockBranchName" class="mt-1 text-xs text-gray-500">
                Solo un superadmin puede cambiar el nombre de la sucursal.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.businessName" label="Nombre comercial (ticket)" placeholder="Ej: Restaurante Centro"
                :maxlength="150" />
            <BaseInput v-model="form.nit" label="NIT" placeholder="Ej: 900.123.456-7" :maxlength="32"
                @blur="validateNit" :error="errors.nit" />
        </div>
        <p class="text-xs text-gray-500 -mt-2">Opcional. En el ticket térmico se usa el nombre comercial si existe; si no, el nombre de la sucursal.</p>

        <!-- Address -->
        <div>
            <BaseInput v-model="form.address" label="Dirección" placeholder="Ej: Calle 50 # 45-67, Centro" required
                :error="errors.address" :maxlength="200" @blur="handleAddressBlur">
                <template #icon>
                    <MapPinIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Map (mismo flujo que dirección de cliente) -->
        <div v-if="form.address.trim().length >= 10 && showMapsSelector" class="space-y-2">
            <p class="text-sm font-medium text-gray-700">Ubicación en mapa</p>
            <GoogleMapsSelector v-model="selectedLocation"
                :error="errors.latitude || errors.longitude || undefined"
                :initial-address="form.address" :key="`branch-maps-${props.branch?.id ?? 'new'}`"
                @location-confirmed="handleLocationConfirmed" />
        </div>

        <!-- Phone Numbers -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.phone1" label="Teléfono Principal" type="tel" placeholder="3001234567" required
                :error="errors.phone1" :maxlength="10" @input="validatePhone('phone1')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.phone2" label="Teléfono Secundario " type="tel" placeholder="3007654321"
                :error="errors.phone2" :maxlength="10" @input="validatePhone('phone2')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <div>
            <BaseInput :model-value="form.maxFreeDeliveryDiscount"
                @update:model-value="(v) => { form.maxFreeDeliveryDiscount = Math.max(0, Math.round(Number(v) || 0)) }"
                type="number" :min="0" :step="100"
                label="Tope descuento domicilio gratis (COP)" placeholder="3000" />
            <p class="mt-1 text-xs text-gray-500">Máximo a descontar en productos al activar «Domicilio gratis» en el POS (por pedido).</p>
        </div>

        <!-- Validation Info -->
        <BaseAlert v-if="showValidationInfo" variant="info">
            <InformationCircleIcon class="w-5 h-5" />
            <div>
                <h4 class="font-medium">Información sobre los datos</h4>
                <ul class="mt-1 text-sm list-disc list-inside space-y-1">
                    <li>El nombre debe ser único en el sistema</li>
                    <li>Los teléfonos deben ser números válidos de 10 dígitos (celular con 3 o fijo con 6)</li>
                    <li>La dirección debe ser completa y específica</li>
                    <li>Debes buscar o colocar el pin en el mapa y pulsar «Confirmar ubicación»</li>
                </ul>
            </div>
        </BaseAlert>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ branch ? 'Actualizar' : 'Crear' }} Sucursal
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Branch } from '@/types/common'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import GoogleMapsSelector from '@/components/ui/GoogleMapsSelector.vue'
import {
    BuildingOffice2Icon,
    MapPinIcon,
    PhoneIcon,
    InformationCircleIcon
} from '@heroicons/vue/24/outline'

interface Props {
    branch?: Branch | null
    loading?: boolean
    /** Admin de sucursal: no puede renombrar (validado también en API). */
    lockBranchName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    lockBranchName: false,
})

interface BranchFormData {
    name: string
    businessName?: string
    nit?: string
    address: string
    phone1: string
    phone2?: string
    latitude: number
    longitude: number
    maxFreeDeliveryDiscount: number
}

const emit = defineEmits<{
    submit: [data: BranchFormData]
    cancel: []
}>()

const form = reactive({
    name: '',
    businessName: '',
    nit: '',
    address: '',
    phone1: '',
    phone2: '',
    latitude: 0,
    longitude: 0,
    maxFreeDeliveryDiscount: 3000,
})

const errors = reactive({
    name: '',
    nit: '',
    address: '',
    phone1: '',
    phone2: '',
    latitude: '',
    longitude: '',
})

const showValidationInfo = ref(false)
const selectedLocation = ref<{ lat: number; lng: number } | null>(null)
const showMapsSelector = ref(false)
const isLocationConfirmed = ref(false)

const isFormValid = computed(() => {
    return (
        form.name.trim() &&
        form.address.trim() &&
        form.phone1.trim() &&
        form.latitude !== 0 &&
        form.longitude !== 0 &&
        isLocationConfirmed.value &&
        !errors.name &&
        !errors.nit &&
        !errors.address &&
        !errors.phone1 &&
        !errors.phone2 &&
        !errors.latitude &&
        !errors.longitude
    )
})

const validateNit = () => {
    const t = form.nit.trim()
    if (!t) {
        errors.nit = ''
        return
    }
    if (!/^[\d.\-]+$/.test(t)) {
        errors.nit = 'Solo dígitos, puntos y guiones'
        return
    }
    errors.nit = ''
}

const validatePhone = (field: 'phone1' | 'phone2') => {
    const phone = form[field].trim()

    if (field === 'phone1' && !phone) {
        errors[field] = 'El teléfono principal es requerido'
        return
    }

    if (phone && !/^\d{10}$/.test(phone)) {
        errors[field] = 'Debe ser un número válido (10 dígitos)'
        return
    }

    errors[field] = ''
}

const validateForm = () => {
    if (!form.name.trim()) {
        errors.name = 'El nombre de la sucursal es requerido'
    } else if (form.name.length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (form.name.length > 100) {
        errors.name = 'El nombre no puede tener más de 100 caracteres'
    } else {
        errors.name = ''
    }

    if (!form.address.trim()) {
        errors.address = 'La dirección es requerida'
    } else if (form.address.length < 10) {
        errors.address = 'La dirección debe ser más específica (mínimo 10 caracteres)'
    } else if (form.address.length > 200) {
        errors.address = 'La dirección no puede tener más de 200 caracteres'
    } else {
        errors.address = ''
    }

    validatePhone('phone1')
    validateNit()
    if (form.phone2) {
        validatePhone('phone2')
    } else {
        errors.phone2 = ''
    }

    if (form.latitude === 0) {
        errors.latitude = 'La latitud es requerida (confirma la ubicación en el mapa)'
    } else if (form.latitude < -90 || form.latitude > 90) {
        errors.latitude = 'La latitud debe estar entre -90 y 90'
    } else {
        errors.latitude = ''
    }

    if (form.longitude === 0) {
        errors.longitude = 'La longitud es requerida (confirma la ubicación en el mapa)'
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

    const formData: BranchFormData = {
        name: form.name.trim(),
        businessName: form.businessName.trim() || undefined,
        nit: form.nit.trim() || undefined,
        address: form.address.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        maxFreeDeliveryDiscount: Math.max(0, Math.round(Number(form.maxFreeDeliveryDiscount) || 0)),
    }

    emit('submit', formData)
}

const handleLocationConfirmed = () => {
    isLocationConfirmed.value = true
    errors.latitude = ''
    errors.longitude = ''
}

const handleAddressBlur = () => {
    if (form.address.trim().length >= 10) {
        showMapsSelector.value = true
    }
}

watch(selectedLocation, (newLocation) => {
    if (newLocation) {
        form.latitude = newLocation.lat
        form.longitude = newLocation.lng
    }
})

function resetMapState() {
    selectedLocation.value = null
    showMapsSelector.value = false
    isLocationConfirmed.value = false
    form.latitude = 0
    form.longitude = 0
}

watch(
    () => props.branch,
    (newBranch) => {
        if (newBranch) {
            form.name = newBranch.name
            form.businessName = newBranch.businessName ?? ''
            form.nit = newBranch.nit ?? ''
            form.address = newBranch.address
            form.phone1 = newBranch.phone1
            form.phone2 = newBranch.phone2 || ''
            showValidationInfo.value = false

            const lat = newBranch.latitude
            const lng = newBranch.longitude
            form.maxFreeDeliveryDiscount =
                typeof newBranch.maxFreeDeliveryDiscount === 'number' && newBranch.maxFreeDeliveryDiscount >= 0
                    ? Math.round(newBranch.maxFreeDeliveryDiscount)
                    : 3000
            if (lat != null && lng != null && lat !== 0 && lng !== 0) {
                form.latitude = Number(lat)
                form.longitude = Number(lng)
                selectedLocation.value = { lat: form.latitude, lng: form.longitude }
                showMapsSelector.value = true
                isLocationConfirmed.value = true
            } else {
                resetMapState()
                if (newBranch.address?.trim().length >= 10) {
                    showMapsSelector.value = true
                }
            }
        } else {
            form.name = ''
            form.businessName = ''
            form.nit = ''
            form.address = ''
            form.phone1 = ''
            form.phone2 = ''
            form.maxFreeDeliveryDiscount = 3000
            showValidationInfo.value = true
            resetMapState()
            setTimeout(() => {
                showValidationInfo.value = true
            }, 1000)
        }

        errors.name = ''
        errors.nit = ''
        errors.address = ''
        errors.phone1 = ''
        errors.phone2 = ''
        errors.latitude = ''
        errors.longitude = ''
    },
    { immediate: true }
)
</script>

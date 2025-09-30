<!-- src/components/CustomerForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Customer Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" label="Nombre Completo" placeholder="Ej: Juan Pérez González" required
                :error="errors.name" maxlength="150">
                <template #icon>
                    <UserIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.phone1" label="Teléfono Principal" type="tel" placeholder="3001234567" required
                :error="errors.phone1" maxlength="10" @input="validatePhone('phone1')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Secondary Phone -->
        <div>
            <BaseInput v-model="form.phone2" label="Teléfono Secundario" type="tel" placeholder="3007654321"
                :error="errors.phone2" maxlength="10" @input="validatePhone('phone2')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Branch Selection (only for new customers or superadmin) -->
        <div v-if="!customer || canSelectBranch">
            <BaseSelect v-model="form.branchId" :options="branchOptions" label="Sucursal"
                placeholder="Seleccionar sucursal..." required :error="errors.branchId" @change="validateBranch"
                value-key="value" display-key="label">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <!-- Initial Address Section (only for new customers) -->
        <div v-if="!customer" class="border-t border-gray-200 pt-6">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Dirección Inicial</h4>

            <div class="space-y-4">
                <!-- Neighborhood Selection -->
                <BaseSelect v-model="form.initialAddress.neighborhoodId" :options="neighborhoodOptions" label="Barrio"
                    placeholder="Seleccionar barrio..." required :error="errors.initialAddress?.neighborhoodId"
                    @change="validateNeighborhood" value-key="value" display-key="label">
                    <template #icon>
                        <MapPinIcon class="w-4 h-4" />
                    </template>
                </BaseSelect>

                <!-- Address -->
                <BaseInput v-model="form.initialAddress.address" label="Dirección" placeholder="Ej: Calle 10 #20-30"
                    required :error="errors.initialAddress?.address" maxlength="200">
                    <template #icon>
                        <HomeIcon class="w-4 h-4" />
                    </template>
                </BaseInput>

                <!-- Additional Info -->
                <BaseInput v-model="form.initialAddress.additionalInfo" label="Información Adicional"
                    placeholder="Ej: Apto 202, Torre A" :error="errors.initialAddress?.additionalInfo" maxlength="100">
                    <template #icon>
                        <InformationCircleIcon class="w-4 h-4" />
                    </template>
                </BaseInput>

                <!-- Coordinates -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BaseInput v-model.number="form.initialAddress.latitude" label="Latitud" type="number"
                        placeholder="6.25184" :error="errors.initialAddress?.latitude || ''">
                        <template #icon>
                            <MapIcon class="w-4 h-4" />
                        </template>
                    </BaseInput>

                    <BaseInput v-model.number="form.initialAddress.longitude" label="Longitud" type="number"
                        placeholder="-75.56359" :error="errors.initialAddress?.longitude || ''">
                        <template #icon>
                            <MapIcon class="w-4 h-4" />
                        </template>
                    </BaseInput>
                </div>

                <!-- Primary Address Checkbox -->
                <div class="flex items-center">
                    <input id="isPrimary" v-model="form.initialAddress.isPrimary" type="checkbox"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label for="isPrimary" class="ml-2 block text-sm text-gray-900">
                        Marcar como dirección principal
                    </label>
                </div>
            </div>
        </div>

        <!-- Active Status (only for existing customers) -->
        <div v-if="customer" class="flex items-center">
            <input id="active" v-model="form.active" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="active" class="ml-2 block text-sm text-gray-900">
                Cliente activo
            </label>
        </div>

        <!-- Validation Info -->
        <BaseAlert v-if="showValidationInfo" variant="info">
            <InformationCircleIcon class="w-5 h-5" />
            <div>
                <h4 class="font-medium">Información sobre los datos</h4>
                <ul class="mt-1 text-sm list-disc list-inside space-y-1">
                    <li>El teléfono principal debe ser único en el sistema</li>
                    <li>Los teléfonos deben ser números celulares válidos (10 dígitos, iniciando con 3)</li>
                    <li>Las coordenadas se usan para calcular rutas de entrega</li>
                </ul>
            </div>
        </BaseAlert>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ customer ? 'Actualizar' : 'Crear' }} Cliente
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useBranchesStore } from '@/store/branches'
import { useCustomersStore } from '@/store/customers'
import type { Customer, CustomerFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import {
    UserIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    MapPinIcon,
    HomeIcon,
    InformationCircleIcon,
    MapIcon
} from '@heroicons/vue/24/outline'

interface Props {
    customer?: Customer | null
    loading?: boolean
    canSelectBranch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    canSelectBranch: false
})

const emit = defineEmits<{
    submit: [data: CustomerFormData]
    cancel: []
}>()

const branchesStore = useBranchesStore()
const customersStore = useCustomersStore()

const form = reactive({
    name: '',
    phone1: '',
    phone2: '',
    branchId: 0,
    active: true,
    initialAddress: {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: 0,
        longitude: 0,
        isPrimary: true,
        deliveryFee: 0
    }
})

const errors = reactive({
    name: '',
    phone1: '',
    phone2: '',
    branchId: '',
    initialAddress: {
        neighborhoodId: '',
        address: '',
        additionalInfo: '',
        latitude: '',
        longitude: ''
    }
} as {
    name: string;
    phone1: string;
    phone2: string;
    branchId: string;
    initialAddress: {
        neighborhoodId: string;
        address: string;
        additionalInfo: string;
        latitude: string;
        longitude: string;
    };
})

const showValidationInfo = ref(false)

// Computed properties
const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return branchesStore.list.items.map(branch => ({
        value: branch.id,
        label: branch.name
    }))
})

const neighborhoodOptions = computed(() => {
    if (!customersStore.availableNeighborhoods) return []
    return customersStore.availableNeighborhoods
        .filter(neighborhood => neighborhood.branchId === form.branchId)
        .map(neighborhood => ({
            value: neighborhood.id,
            label: `${neighborhood.name} - $${neighborhood.deliveryFee.toLocaleString()}`
        }))
})

const isFormValid = computed(() => {
    const basicValidation = form.name.trim() &&
        form.phone1.trim() &&
        form.branchId > 0 &&
        !errors.name &&
        !errors.phone1 &&
        !errors.phone2 &&
        !errors.branchId

    if (!props.customer) {
        // For new customers, validate initial address
        return basicValidation &&
            form.initialAddress.neighborhoodId > 0 &&
            form.initialAddress.address.trim() &&
            form.initialAddress.latitude !== 0 &&
            form.initialAddress.longitude !== 0 &&
            !errors.initialAddress.neighborhoodId &&
            !errors.initialAddress.address &&
            !errors.initialAddress.latitude &&
            !errors.initialAddress.longitude
    }

    return basicValidation
})

// Validation methods
const validatePhone = (field: 'phone1' | 'phone2') => {
    const phone = form[field].trim()

    // phone1 is required, phone2 is optional
    if (field === 'phone1' && !phone) {
        errors[field] = 'El teléfono principal es requerido'
        return
    }

    // If phone exists, validate format
    if (phone && !/^3\d{9}$/.test(phone)) {
        errors[field] = 'Debe ser un número celular válido (10 dígitos, iniciando con 3)'
        return
    }

    errors[field] = ''
}

const validateBranch = () => {
    if (!form.branchId) {
        errors.branchId = 'Selecciona una sucursal'
        return
    }
    errors.branchId = ''
}

const validateNeighborhood = () => {
    if (!form.initialAddress.neighborhoodId) {
        errors.initialAddress.neighborhoodId = 'Selecciona un barrio'
        return
    }
    errors.initialAddress.neighborhoodId = ''
}

const validateForm = () => {
    // Validate name
    if (!form.name.trim()) {
        errors.name = 'El nombre es requerido'
    } else if (form.name.length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (form.name.length > 150) {
        errors.name = 'El nombre no puede tener más de 150 caracteres'
    } else {
        errors.name = ''
    }

    // Validate phones
    validatePhone('phone1')
    if (form.phone2) {
        validatePhone('phone2')
    } else {
        errors.phone2 = ''
    }

    // Validate branch
    validateBranch()

    // Validate initial address for new customers
    if (!props.customer) {
        validateNeighborhood()

        if (!form.initialAddress.address.trim()) {
            errors.initialAddress.address = 'La dirección es requerida'
        } else if (form.initialAddress.address.length < 10) {
            errors.initialAddress.address = 'La dirección debe ser más específica (mínimo 10 caracteres)'
        } else {
            errors.initialAddress.address = ''
        }

        if (form.initialAddress.latitude === 0) {
            errors.initialAddress.latitude = 'La latitud es requerida'
        } else {
            errors.initialAddress.latitude = ''
        }

        if (form.initialAddress.longitude === 0) {
            errors.initialAddress.longitude = 'La longitud es requerida'
        } else {
            errors.initialAddress.longitude = ''
        }
    }
}

const handleSubmit = () => {
    validateForm()

    if (!isFormValid.value) {
        return
    }

    const formData: CustomerFormData = {
        name: form.name.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || undefined,
        branchId: form.branchId,
        initialAddress: {
            neighborhoodId: form.initialAddress.neighborhoodId,
            address: form.initialAddress.address.trim(),
            additionalInfo: form.initialAddress.additionalInfo.trim() || undefined,
            latitude: form.initialAddress.latitude,
            longitude: form.initialAddress.longitude,
            isPrimary: form.initialAddress.isPrimary,
            deliveryFee: form.initialAddress.deliveryFee
        }
    }

    emit('submit', formData)
}

// Watch for customer prop changes to populate form
watch(() => props.customer, (newCustomer) => {
    if (newCustomer) {
        form.name = newCustomer.name
        form.phone1 = newCustomer.phone1
        form.phone2 = newCustomer.phone2 || ''
        form.branchId = newCustomer.branchId
        form.active = newCustomer.active
        showValidationInfo.value = false
    } else {
        // Reset form for new customer
        form.name = ''
        form.phone1 = ''
        form.phone2 = ''
        form.branchId = 0
        form.active = true
        form.initialAddress = {
            neighborhoodId: 0,
            address: '',
            additionalInfo: '',
            latitude: 0,
            longitude: 0,
            isPrimary: true,
            deliveryFee: 0
        }
        showValidationInfo.value = true
    }

    // Clear errors
    errors.name = ''
    errors.phone1 = ''
    errors.phone2 = ''
    errors.branchId = ''
    errors.initialAddress.neighborhoodId = ''
    errors.initialAddress.address = ''
    errors.initialAddress.additionalInfo = ''
    errors.initialAddress.latitude = ''
    errors.initialAddress.longitude = ''
}, { immediate: true })

// Watch for branch changes to reset neighborhood
watch(() => form.branchId, () => {
    form.initialAddress.neighborhoodId = 0
})

// Load data on mount
onMounted(async () => {
    try {
        await branchesStore.fetchAll()
        await customersStore.fetchNeighborhoods()
    } catch (error) {
        console.error('Error loading form data:', error)
    }
})

// Show validation info for new customers after a short delay
watch(() => props.customer, (newCustomer) => {
    if (!newCustomer) {
        setTimeout(() => {
            showValidationInfo.value = true
        }, 1000)
    }
})
</script>

<!-- src/components/CustomerForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Customer Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" label="Nombre Completo" placeholder="Ej: Juan Pérez González" required
                :error="errors.name" :maxlength="150" :minlength="5" @input="validateForm">
                <template #icon>
                    <UserIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.phone1" label="Teléfono Principal" type="tel" placeholder="3001234567" required
                :error="errors.phone1" :maxlength="10" @input="validatePhone('phone1'); validateForm()">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Secondary Phone -->
        <div>
            <BaseInput v-model="form.phone2" label="Teléfono Secundario" type="tel" placeholder="3007654321"
                :error="errors.phone2" :maxlength="10" @input="validatePhone('phone2'); validateForm()">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Branch Selection (only for superadmin) -->
        <div v-if="authStore.isSuperadmin">
            <BaseSelect v-model="form.branchId" :options="branchOptions" label="Sucursal"
                placeholder="Seleccionar sucursal..." required :error="errors.branchId"
                @update:model-value="validateBranch(); validateForm()" value-key="value" display-key="label">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <!-- Initial Address Section (only for new customers) -->
        <div v-if="!customer && form.branchId > 0" class="border-t border-gray-200 pt-6">
            <CustomerAddressForm :address="null" :customer-id="0" :loading="loading" @submit="handleAddressSubmit"
                @cancel="handleAddressCancel" :branch-id="form.branchId" v-model="form.initialAddress"
                @update:model-value="handleAddressUpdate" />
        </div>

        <!-- Active Status (only for existing customers) -->
        <div v-if="customer" class="flex items-center">
            <input id="active" v-model="form.active" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="active" class="ml-2 block text-sm text-gray-900">
                Cliente activo
            </label>
        </div>

        <!-- Debug info (remove in production) -->
        <div class="text-xs text-gray-500 bg-gray-100 p-2 rounded" v-if="true">
            <div>Form Valid: {{ isFormValid }}</div>
            <div>Name: "{{ form.name }}" ({{ form.name.trim().length }})</div>
            <div>Phone1: "{{ form.phone1 }}" ({{ form.phone1.trim().length }})</div>
            <div>BranchId: {{ form.branchId }} (Superadmin: {{ authStore.isSuperadmin }})</div>
            <div>Errors: {{ JSON.stringify(errors) }}</div>
            <div v-if="!customer">Address: {{ JSON.stringify(form.initialAddress) }}</div>
        </div>

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
import { useAuthStore } from '@/store/auth'
import type { Customer, CustomerFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CustomerAddressForm from '@/components/CustomerAddressForm.vue'
import {
    UserIcon,
    PhoneIcon,
    BuildingOffice2Icon,
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
const authStore = useAuthStore()

const form = reactive({
    name: '',
    phone1: '',
    phone2: '',
    branchId: authStore.branchId ?? 0,
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

const addressFormData = ref<any>(null)

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
        deliveryFee: string;
    };
})


// Computed properties
const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return branchesStore.list.items.map(branch => ({
        value: branch.id,
        label: branch.name
    }))
})

// Branch ID is handled by CustomerAddressForm


const isFormValid = computed(() => {
    const basicValidation =
        form.name.trim() &&
        form.phone1.trim() &&
        (authStore.isSuperadmin ? form.branchId > 0 : true) &&
        !errors.name &&
        !errors.phone1 &&
        !errors.phone2 &&
        !errors.branchId

    if (!props.customer) {
        // Para nuevos clientes, validar initialAddress completo
        const addr = form.initialAddress
        const addressValid =
            addr.neighborhoodId > 0 &&
            addr.address.trim().length >= 10 &&
            addr.latitude !== 0 &&
            addr.longitude !== 0 &&
            addr.deliveryFee > 0

        return basicValidation && addressValid
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
    // Only validate branch for superadmin users
    if (authStore.isSuperadmin && form.branchId <= 0) {
        errors.branchId = 'Selecciona una sucursal'
        return
    }
    errors.branchId = ''
}

// Address form handlers
const handleAddressSubmit = (data: any) => {
    addressFormData.value = data
    // Update the form with address data
    form.initialAddress = {
        neighborhoodId: data.neighborhoodId,
        address: data.address,
        additionalInfo: data.additionalInfo || '',
        latitude: data.latitude,
        longitude: data.longitude,
        isPrimary: data.isPrimary,
        deliveryFee: data.deliveryFee
    }
}

const handleAddressCancel = () => {
    addressFormData.value = null
}

const handleAddressUpdate = (data: any) => {
    // Update the form with address data from CustomerAddressForm
    form.initialAddress = {
        neighborhoodId: data.neighborhoodId,
        address: data.address,
        additionalInfo: data.additionalInfo || '',
        latitude: data.latitude,
        longitude: data.longitude,
        isPrimary: data.isPrimary,
        deliveryFee: data.deliveryFee
    }
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

    // Address validation is handled by CustomerAddressForm
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
        active: form.active,
        initialAddress: !props.customer ? form.initialAddress : undefined
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
    } else {
        // Reset form for new customer
        form.name = ''
        form.phone1 = ''
        form.phone2 = ''
        form.branchId = 0
        form.active = true
        addressFormData.value = null
    }

    // Clear errors
    errors.name = ''
    errors.phone1 = ''
    errors.phone2 = ''
    errors.branchId = ''
    // Address errors are handled by CustomerAddressForm
}, { immediate: true })

// Address form handles its own state management

// Load data on mount
onMounted(async () => {
    try {
        await branchesStore.fetchAll()
        // Neighborhoods are loaded by CustomerAddressForm

        // Initialize branch ID based on user role
        if (!authStore.isSuperadmin && authStore.branchId) {
            form.branchId = authStore.branchId
        }

        // Validate form after initialization
        validateForm()
    } catch (error) {
        console.error('Error loading form data:', error)
    }
})


</script>

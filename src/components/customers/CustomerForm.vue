c<!-- src/components/CustomerForm.vue -->
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
                :error="errors.phone1" :maxlength="10" @paste="handlePhonePaste('phone1', $event)"
                @input="normalizePhone('phone1'); validatePhone('phone1'); validateForm()">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Secondary Phone -->
        <div>
            <BaseInput v-model="form.phone2" label="Teléfono Secundario" type="tel" placeholder="3007654321"
                :error="errors.phone2" :maxlength="10" @paste="handlePhonePaste('phone2', $event)"
                @input="normalizePhone('phone2'); validatePhone('phone2'); validateForm()">
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
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-medium text-gray-900">Dirección Inicial</h3>
                <BaseButton @click="openAddressModal" variant="secondary" size="sm" type="button">
                    <template #icon>
                        <MapPinIcon class="w-4 h-4" />
                    </template>
                    {{ form.initialAddress?.address ? 'Editar Dirección' : 'Agregar Dirección' }}
                </BaseButton>
            </div>

            <!-- Preview de dirección si existe -->
            <div v-if="form.initialAddress?.address" class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-700">
                    <span class="font-medium">Dirección:</span> {{ form.initialAddress.address }}
                </p>
                <p v-if="form.initialAddress.additionalInfo" class="text-sm text-gray-500 mt-1">
                    {{ form.initialAddress.additionalInfo }}
                </p>
                <p class="text-sm text-gray-500 mt-1">
                    <span class="font-medium">Tarifa:</span> {{ formatCurrency(form.initialAddress.deliveryFee) }}
                </p>
            </div>

            <p v-else class="text-sm text-gray-500 italic">
                No se ha agregado una dirección inicial (requerida para crear cliente)
            </p>
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
        <div class="text-xs text-gray-500 bg-gray-100 p-2 rounded" v-if="false">
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
                {{ submitButtonText || (customer ? 'Actualizar' : 'Crear') + ' Cliente' }}
            </BaseButton>       
        </div>
    </form>

    <!-- Address Modal (Dual: Create or Edit) -->
    <BaseDialog v-model="showAddressModal" title="Dirección Inicial" size="lg">
        <CustomerAddressForm v-model="addressFormData" @submit="handleAddressSubmit" @cancel="closeAddressModal" />
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import type { Customer, CustomerFormData } from '@/types/customer'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'
import type { CustomerAddressFormData } from '@/types/customer'
import {
    UserIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    MapPinIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    customer?: Customer | null
    loading?: boolean
    canSelectBranch?: boolean
    initialPhone?: string
    /** Texto del botón de envío (ej. "Crear Cliente"). Si no se pasa, se usa "Actualizar"/"Crear" según haya customer. */
    submitButtonText?: string
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    canSelectBranch: false,
    initialPhone: '',
    submitButtonText: ''
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

// Address modal state
const showAddressModal = ref(false)
const addressFormData = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: true,
    deliveryFee: 0
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

const normalizePhone = (field: 'phone1' | 'phone2') => {
    form[field] = form[field].replace(/\D/g, '').slice(0, 10)
}

const handlePhonePaste = (field: 'phone1' | 'phone2', event: ClipboardEvent) => {
    event.preventDefault()
    const pasted = event.clipboardData?.getData('text') ?? ''
    const clean = pasted.replace(/\D/g, '').slice(0, 10)

    const input = event.target as HTMLInputElement
    const start = input.selectionStart ?? form[field].length
    const end = input.selectionEnd ?? form[field].length

    const newValue = form[field].slice(0, start) + clean + form[field].slice(end)
    form[field] = newValue.slice(0, 10)
    validatePhone(field)
    validateForm()
}

const validateBranch = () => {
    // Only validate branch for superadmin users
    if (authStore.isSuperadmin && form.branchId <= 0) {
        errors.branchId = 'Selecciona una sucursal'
        return
    }
    errors.branchId = ''
}

// Address modal methods
const openAddressModal = () => {
    // Si ya existe una dirección, prellenar el formulario
    if (form.initialAddress?.address) {
        addressFormData.value = { ...form.initialAddress }
    } else {
        // Reset al abrir para crear nueva
        addressFormData.value = {
            neighborhoodId: 0,
            address: '',
            additionalInfo: '',
            latitude: undefined,
            longitude: undefined,
            isPrimary: true,
            deliveryFee: 0
        }
    }
    showAddressModal.value = true
}

const closeAddressModal = () => {
    showAddressModal.value = false
}

const handleAddressSubmit = (data: CustomerAddressFormData) => {
    // Actualizar la dirección inicial en el formulario
    form.initialAddress = {
        neighborhoodId: data.neighborhoodId,
        address: data.address,
        additionalInfo: data.additionalInfo || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        isPrimary: data.isPrimary,
        deliveryFee: data.deliveryFee
    }
    closeAddressModal()
}

// Helper para formatear moneda
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(value)
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
        form.initialAddress = {
            neighborhoodId: 0,
            address: '',
            additionalInfo: '',
            latitude: 0,
            longitude: 0,
            isPrimary: true,
            deliveryFee: 0
        }
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
        if (authStore.isSuperadmin) {
            await branchesStore.fetchAll()
            // Neighborhoods are loaded by CustomerAddressForm

            // Initialize branch ID based on user role
        }
        else if (authStore.branchId) {
            form.branchId = authStore.branchId
        }

        // Pre-poblar teléfono si se proporciona para nuevo cliente
        if (!props.customer && props.initialPhone) {
            form.phone1 = props.initialPhone
        }
    } catch (error) {
        console.error('Error loading form data:', error)
    }
})


</script>

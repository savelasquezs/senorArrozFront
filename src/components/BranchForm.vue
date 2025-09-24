<!-- src/components/BranchForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Branch Name -->
        <div>
            <BaseInput v-model="form.name" label="Nombre de la Sucursal" placeholder="Ej: Sucursal Centro" required
                :error="errors.name" maxlength="100">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Address -->
        <div>
            <BaseInput v-model="form.address" label="Dirección" placeholder="Ej: Calle 50 # 45-67, Centro" required
                :error="errors.address" maxlength="200">
                <template #icon>
                    <MapPinIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Phone Numbers -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.phone1" label="Teléfono Principal" type="tel" placeholder="3001234567" required
                :error="errors.phone1" maxlength="10" @input="validatePhone('phone1')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.phone2" label="Teléfono Secundario (Opcional)" type="tel" placeholder="3007654321"
                :error="errors.phone2" maxlength="10" @input="validatePhone('phone2')">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Validation Info -->
        <BaseAlert v-if="showValidationInfo" variant="info">
            <InformationCircleIcon class="w-5 h-5" />
            <div>
                <h4 class="font-medium">Información sobre los datos</h4>
                <ul class="mt-1 text-sm list-disc list-inside space-y-1">
                    <li>El nombre debe ser único en el sistema</li>
                    <li>Los teléfonos deben ser números celulares válidos (10 dígitos, iniciando con 3)</li>
                    <li>La dirección debe ser completa y específica</li>
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
import type { Branch } from '@/types/branch'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import {
    BuildingOffice2Icon,
    MapPinIcon,
    PhoneIcon,
    InformationCircleIcon
} from '@heroicons/vue/24/outline'

interface Props {
    branch?: Branch | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: BranchFormData]
    cancel: []
}>()

interface BranchFormData {
    name: string
    address: string
    phone1: string
    phone2?: string
}

const form = reactive({
    name: '',
    address: '',
    phone1: '',
    phone2: ''
})

const errors = reactive({
    name: '',
    address: '',
    phone1: '',
    phone2: ''
})

const showValidationInfo = ref(false)

const isFormValid = computed(() => {
    return form.name.trim() &&
        form.address.trim() &&
        form.phone1.trim() &&
        !errors.name &&
        !errors.address &&
        !errors.phone1 &&
        !errors.phone2
})

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

const validateForm = () => {
    // Validate name
    if (!form.name.trim()) {
        errors.name = 'El nombre de la sucursal es requerido'
    } else if (form.name.length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (form.name.length > 100) {
        errors.name = 'El nombre no puede tener más de 100 caracteres'
    } else {
        errors.name = ''
    }

    // Validate address
    if (!form.address.trim()) {
        errors.address = 'La dirección es requerida'
    } else if (form.address.length < 10) {
        errors.address = 'La dirección debe ser más específica (mínimo 10 caracteres)'
    } else if (form.address.length > 200) {
        errors.address = 'La dirección no puede tener más de 200 caracteres'
    } else {
        errors.address = ''
    }

    // Validate phones
    validatePhone('phone1')
    if (form.phone2) {
        validatePhone('phone2')
    } else {
        errors.phone2 = ''
    }
}

const handleSubmit = () => {
    validateForm()

    if (!isFormValid.value) {
        return
    }

    const formData: BranchFormData = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || undefined
    }

    emit('submit', formData)
}

// Watch for branch prop changes to populate form
watch(() => props.branch, (newBranch) => {
    if (newBranch) {
        form.name = newBranch.name
        form.address = newBranch.address
        form.phone1 = newBranch.phone1
        form.phone2 = newBranch.phone2 || ''
        showValidationInfo.value = false
    } else {
        // Reset form for new branch
        form.name = ''
        form.address = ''
        form.phone1 = ''
        form.phone2 = ''
        showValidationInfo.value = true
    }

    // Clear errors
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = ''
    })
}, { immediate: true })

// Show validation info for new branches after a short delay
watch(() => props.branch, (newBranch) => {
    if (!newBranch) {
        setTimeout(() => {
            showValidationInfo.value = true
        }, 1000)
    }
})
</script>
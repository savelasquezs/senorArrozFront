<!-- src/components/BankForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Branch Selector (Superadmin only for creation) -->
        <BaseSelect v-if="authStore.isSuperadmin && !bank" v-model.number="form.branchId" :options="branchOptions"
            label="Sucursal" placeholder="Selecciona una sucursal" required :error="errors.branchId"
            @update:model-value="validateForm" value-key="value" display-key="label">
            <template #icon>
                <BuildingOffice2Icon class="w-4 h-4" />
            </template>
        </BaseSelect>

        <BaseSelect v-if="!bank" v-model="form.type" :options="bankTypeOptions"
            label="Tipo" required value-key="value" display-key="label"
            @update:model-value="onTypeChanged">
            <template #icon>
                <BuildingLibraryIcon class="w-4 h-4" />
            </template>
        </BaseSelect>

        <p v-if="!bank && form.type === 'cash_vault'" class="text-sm text-gray-600 -mt-3">
            Caja Mayor Efectivo es una cuenta interna del cuadre de caja. Solo puede existir una por sucursal.
        </p>

        <!-- Bank Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" :label="form.type === 'cash_vault' ? 'Nombre' : 'Nombre del Banco'"
                placeholder="Ej: Bancolombia" required :disabled="form.type === 'cash_vault'"
                :error="errors.name" :maxlength="150" :minlength="3" @input="validateForm">
                <template #icon>
                    <BuildingLibraryIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-if="form.type !== 'cash_vault'" v-model="form.imageUrl" label="URL de Imagen" type="url"
                placeholder="https://example.com/logo.png" :error="errors.imageUrl" :maxlength="200"
                @input="validateForm">
                <template #icon>
                    <PhotoIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Active Status -->
        <div class="flex items-center">
            <input id="active" v-model="form.active" type="checkbox" :disabled="form.type === 'cash_vault'"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-60">
            <label for="active" class="ml-2 block text-sm text-gray-900">
                Banco activo
            </label>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ bank ? 'Actualizar' : 'Crear' }} Banco
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useBranchesStore } from '@/store/branches'
import type { Bank, BankFormData, BankType } from '@/types/bank'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    BuildingLibraryIcon,
    PhotoIcon,
    BuildingOffice2Icon,
} from '@heroicons/vue/24/outline'

interface Props {
    bank?: Bank | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: BankFormData]
    cancel: []
}>()

const authStore = useAuthStore()
const branchesStore = useBranchesStore()

const form = reactive({
    branchId: 0,
    name: '',
    imageUrl: '',
    active: true,
    type: 'normal' as Extract<BankType, 'normal' | 'cash_vault'>
})

const errors = reactive({
    branchId: '',
    name: '',
    imageUrl: ''
})

// Computed properties
const bankTypeOptions = [
    { value: 'normal', label: 'Banco normal' },
    { value: 'cash_vault', label: 'Caja Mayor Efectivo' },
]

const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return branchesStore.list.items.map(branch => ({
        value: branch.id,
        label: branch.name
    }))
})

const isFormValid = computed(() => {
    let valid = form.name.trim().length >= 3 &&
        form.name.trim().length <= 150 &&
        (!form.imageUrl || isValidUrl(form.imageUrl)) &&
        !errors.name &&
        !errors.imageUrl

    // Only validate branchId for superadmin creating a new bank
    if (authStore.isSuperadmin && !props.bank) {
        valid = valid && form.branchId > 0 && !errors.branchId
    }

    return valid
})

// Validation
const validateForm = () => {
    // Validate branchId for superadmin creating a new bank
    if (authStore.isSuperadmin && !props.bank) {
        if (form.branchId <= 0) {
            errors.branchId = 'Selecciona una sucursal'
        } else {
            errors.branchId = ''
        }
    }

    // Validate name
    if (!form.name.trim()) {
        errors.name = 'El nombre es requerido'
    } else if (form.name.length < 3) {
        errors.name = 'El nombre debe tener al menos 3 caracteres'
    } else if (form.name.length > 150) {
        errors.name = 'El nombre no puede tener más de 150 caracteres'
    } else {
        errors.name = ''
    }

    // Validate image URL
    if (form.imageUrl && !isValidUrl(form.imageUrl)) {
        errors.imageUrl = 'Ingresa una URL válida'
    } else if (form.imageUrl && form.imageUrl.length > 200) {
        errors.imageUrl = 'La URL no puede tener más de 200 caracteres'
    } else {
        errors.imageUrl = ''
    }
}

const onTypeChanged = () => {
    if (form.type === 'cash_vault') {
        form.name = 'Caja Mayor Efectivo'
        form.imageUrl = ''
        form.active = true
    } else if (!props.bank && form.name === 'Caja Mayor Efectivo') {
        form.name = ''
    }
    validateForm()
}

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

const handleSubmit = () => {
    validateForm()
    if (!isFormValid.value) return

    const formData: BankFormData = {
        name: form.name.trim(),
        imageUrl: form.type === 'cash_vault' ? undefined : (form.imageUrl.trim() || undefined),
        active: form.type === 'cash_vault' ? true : form.active
    }

    if (!props.bank) {
        formData.type = form.type
    }

    // Only include branchId if it's a new bank and superadmin
    if (authStore.isSuperadmin && !props.bank && form.branchId > 0) {
        (formData as any).branchId = form.branchId
    }

    emit('submit', formData)
}

// Watch for bank prop changes to populate form
watch(() => props.bank, (newBank) => {
    if (newBank) {
        form.branchId = newBank.branchId // Keep branchId for display, but not editable
        form.name = newBank.name
        form.imageUrl = newBank.imageUrl || ''
        form.active = newBank.active
        form.type = newBank.type === 'cash_vault' ? 'cash_vault' : 'normal'
    } else {
        // Reset form for new bank
        form.branchId = 0
        form.name = ''
        form.imageUrl = ''
        form.active = true
        form.type = 'normal'
    }

    // Clear errors
    errors.branchId = ''
    errors.name = ''
    errors.imageUrl = ''
}, { immediate: true })

// Load branches on mount
onMounted(async () => {
    if (authStore.isSuperadmin) {
        await branchesStore.fetchAll()
    } else if (authStore.branchId) {
        await branchesStore.fetchById(authStore.branchId)
    }
    validateForm() // Initial validation
})
</script>

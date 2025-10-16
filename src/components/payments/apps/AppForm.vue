<!-- src/components/AppForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- App Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" label="Nombre de la App" placeholder="Ej: Nequi" required
                :error="errors.name" :maxlength="150" :minlength="3" @input="validateForm">
                <template #icon>
                    <DevicePhoneMobileIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.imageUrl" label="URL de Imagen" type="url"
                placeholder="https://example.com/logo.png" :error="errors.imageUrl" :maxlength="200"
                @input="validateForm">
                <template #icon>
                    <PhotoIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Bank Select -->
        <BaseSelect v-model.number="form.bankId" :options="bankOptions" label="Banco" required
            placeholder="Seleccionar banco..." :error="errors.bankId" @update:model-value="validateForm"
            value-key="value" display-key="label">
            <template #icon>
                <BuildingLibraryIcon class="w-4 h-4" />
            </template>
        </BaseSelect>

        <!-- Active Status -->
        <div class="flex items-center">
            <input id="active" v-model="form.active" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="active" class="ml-2 block text-sm text-gray-900">
                App activa
            </label>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ app ? 'Actualizar' : 'Crear' }} App
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted } from 'vue'
import { useBanksStore } from '@/store/banks'
import { useAuthStore } from '@/store/auth'
import type { App, AppFormData } from '@/types/bank'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    DevicePhoneMobileIcon,
    PhotoIcon,
    BuildingLibraryIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    app?: App | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: AppFormData]
    cancel: []
}>()

const banksStore = useBanksStore()
const authStore = useAuthStore()

const form = reactive({
    bankId: 0,
    name: '',
    imageUrl: '',
    active: true
})

const errors = reactive({
    bankId: '',
    name: '',
    imageUrl: ''
})

// Computed properties
const bankOptions = computed(() => {
    if (!banksStore.list?.items) return []
    return banksStore.list.items.map(bank => ({
        value: bank.id,
        label: bank.name
    }))
})

const isFormValid = computed(() => {
    return form.bankId > 0 &&
        form.name.trim().length >= 3 &&
        form.name.trim().length <= 150 &&
        (!form.imageUrl || isValidUrl(form.imageUrl)) &&
        !errors.bankId &&
        !errors.name &&
        !errors.imageUrl
})

// Validation
const validateForm = () => {
    // Validate bank
    if (form.bankId <= 0) {
        errors.bankId = 'Selecciona un banco'
    } else {
        errors.bankId = ''
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

    const formData: AppFormData = {
        bankId: form.bankId,
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        active: form.active
    }
    emit('submit', formData)
}

// Watch for app prop changes to populate form
watch(() => props.app, (newApp) => {
    if (newApp) {
        form.bankId = newApp.bankId
        form.name = newApp.name
        form.imageUrl = newApp.imageUrl || ''
        form.active = newApp.active
    } else {
        // Reset form for new app
        form.bankId = 0
        form.name = ''
        form.imageUrl = ''
        form.active = true
    }

    // Clear errors
    errors.bankId = ''
    errors.name = ''
    errors.imageUrl = ''
}, { immediate: true })

// Load banks on mount
onMounted(async () => {
    try {
        await banksStore.fetch({
            page: 1,
            pageSize: 100, // Load all banks for the dropdown
            branchId: authStore.isSuperadmin ? undefined : (authStore.branchId || undefined)
        })
    } catch (error) {
        console.error('Error loading banks:', error)
    }
})
</script>

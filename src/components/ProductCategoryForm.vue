<!-- src/components/ProductCategoryForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Category Information -->
        <div>
            <BaseInput v-model="form.name" label="Nombre de la Categoría" placeholder="Ej: Bebidas" required
                :error="errors.name" :maxlength="150" :minlength="3" @input="validateForm">
                <template #icon>
                    <TagIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Branch Selection (only for superadmin) -->
        <div v-if="authStore.isSuperadmin">
            <BaseSelect v-model="form.branchId" :options="branchOptions" label="Sucursal"
                placeholder="Seleccionar sucursal..." :error="errors.branchId" @update:model-value="validateForm"
                value-key="value" display-key="label">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ category ? 'Actualizar' : 'Crear' }} Categoría
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import type { ProductCategory, ProductCategoryFormData } from '@/types/product'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    TagIcon,
    BuildingOffice2Icon,
} from '@heroicons/vue/24/outline'

interface Props {
    category?: ProductCategory | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: ProductCategoryFormData & { branchId?: number }]
    cancel: []
}>()

const branchesStore = useBranchesStore()
const authStore = useAuthStore()

const form = reactive({
    name: '',
    branchId: authStore.branchId ?? 0
})

const errors = reactive({
    name: '',
    branchId: ''
})

// Computed properties
const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return branchesStore.list.items.map(branch => ({
        value: branch.id,
        label: branch.name
    }))
})

const isFormValid = computed(() => {
    const basicValidation = form.name.trim().length >= 3 && !errors.name

    if (authStore.isSuperadmin) {
        return basicValidation && form.branchId > 0 && !errors.branchId
    }

    return basicValidation
})

// Validation
const validateForm = () => {
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

    // Validate branch (only for superadmin)
    if (authStore.isSuperadmin && form.branchId <= 0) {
        errors.branchId = 'Selecciona una sucursal'
    } else {
        errors.branchId = ''
    }
}

const handleSubmit = () => {
    validateForm()
    if (!isFormValid.value) return

    const formData: ProductCategoryFormData & { branchId?: number } = {
        name: form.name.trim(),
        ...(authStore.isSuperadmin && { branchId: form.branchId })
    }

    emit('submit', formData)
}

// Watch for category prop changes to populate form
watch(() => props.category, (newCategory) => {
    if (newCategory) {
        form.name = newCategory.name
        form.branchId = newCategory.branchId
    } else {
        // Reset form for new category
        form.name = ''
        form.branchId = authStore.branchId ?? 0
    }

    // Clear errors
    errors.name = ''
    errors.branchId = ''
}, { immediate: true })

// Load branches on mount (only for superadmin)
onMounted(async () => {
    try {
        if (authStore.isSuperadmin) {
            await branchesStore.fetchAll()
        }
    } catch (error) {
        console.error('Error loading branches:', error)
    }
})
</script>


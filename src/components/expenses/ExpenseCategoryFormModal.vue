<!-- src/components/expenses/ExpenseCategoryFormModal.vue -->
<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="editingCategory ? `Editar Categoría` : 'Nueva Categoría'" size="md">
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <BaseInput v-model="formData.name" label="Nombre" placeholder="Nombre de la categoría" required
                :disabled="loading" />

            <div class="flex justify-end space-x-3 pt-4">
                <BaseButton type="button" variant="outline" @click="$emit('close')" :disabled="loading">
                    Cancelar
                </BaseButton>
                <BaseButton type="submit" variant="primary" :loading="loading">
                    {{ editingCategory ? 'Actualizar' : 'Crear' }}
                </BaseButton>
            </div>
        </form>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ExpenseCategory, CreateExpenseCategoryDto } from '@/types/expense'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    isOpen: boolean
    editingCategory?: ExpenseCategory | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    editingCategory: null,
    loading: false
})

const emit = defineEmits<{
    'close': []
    'submit': [data: CreateExpenseCategoryDto]
}>()

const formData = ref<CreateExpenseCategoryDto>({
    name: ''
})

watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        if (props.editingCategory) {
            formData.value = {
                name: props.editingCategory.name
            }
        } else {
            formData.value = {
                name: ''
            }
        }
    }
})

const handleSubmit = () => {
    if (!formData.value.name.trim()) {
        return
    }
    emit('submit', { ...formData.value })
}
</script>

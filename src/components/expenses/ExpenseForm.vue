<!-- src/components/expenses/ExpenseForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput v-model="formData.name" label="Nombre del Gasto" placeholder="Ej: Arroz, Servicio de transporte..."
            required :disabled="loading" />

        <BaseSelect v-model="formData.categoryId" :options="categoryOptions" label="Categoría"
            placeholder="Seleccionar categoría..." value-key="value" display-key="label" required :disabled="loading" />

        <BaseSelect v-model="formData.unit" :options="unitOptions" label="Unidad" placeholder="Seleccionar unidad..."
            value-key="value" display-key="label" required :disabled="loading" />

        <div class="flex justify-end space-x-3 pt-4">
            <BaseButton type="button" variant="outline" @click="$emit('cancel')" :disabled="loading">
                Cancelar
            </BaseButton>
            <BaseButton type="submit" variant="primary" :loading="loading">
                {{ editingExpense ? 'Actualizar' : 'Crear' }}
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Expense, ExpenseCategory, CreateExpenseDto, UpdateExpenseDto } from '@/types/expense'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    expense?: Expense | null
    categories?: ExpenseCategory[]
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    expense: null,
    categories: () => [],
    loading: false
})

const emit = defineEmits<{
    submit: [data: CreateExpenseDto | UpdateExpenseDto]
    cancel: []
}>()

const editingExpense = computed(() => props.expense !== null)

const formData = ref<CreateExpenseDto>({
    name: '',
    categoryId: 0,
    unit: 'Unit'
})

const categoryOptions = computed(() => {
    return (props.categories || []).map(cat => ({
        value: cat.id,
        label: cat.name
    }))
})

const unitOptions = [
    { value: 'Unit', label: 'Unidad' },
    { value: 'Kilo', label: 'Kilo' },
    { value: 'Package', label: 'Paquete' },
    { value: 'Pound', label: 'Libra' },
    { value: 'Gallon', label: 'Galón' }
]

watch(() => props.expense, (expense) => {
    if (expense) {
        formData.value = {
            name: expense.name,
            categoryId: expense.categoryId,
            unit: expense.unit
        }
    } else {
        formData.value = {
            name: '',
            categoryId: (props.categories && props.categories.length > 0) ? props.categories[0].id : 0,
            unit: 'Unit'
        }
    }
}, { immediate: true })

const handleSubmit = () => {
    if (!formData.value.name.trim() || !formData.value.categoryId) {
        return
    }
    emit('submit', { ...formData.value })
}
</script>

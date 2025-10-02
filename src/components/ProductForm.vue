<!-- src/components/ProductForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Product Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" label="Nombre del Producto" placeholder="Ej: Coca Cola 350ml" required
                :error="errors.name" :maxlength="150" :minlength="3" @input="validateForm">
                <template #icon>
                    <CubeIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseSelect v-model="form.categoryId" :options="categoryOptions" label="Categoría" required
                placeholder="Seleccionar categoría..." :error="errors.categoryId" @update:model-value="validateForm"
                value-key="value" display-key="label">
                <template #icon>
                    <TagIcon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model.number="form.price" label="Precio" type="number" min="0" step="100" required
                placeholder="2500" :error="errors.price" @input="validateForm">
                <template #icon>
                    <CurrencyDollarIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-if="!product" v-model.number="form.stock" label="Stock Inicial" type="number" min="0" step="1"
                placeholder="50" :error="errors.stock" @input="validateForm">
                <template #icon>
                    <ArchiveBoxIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <!-- Stock display for existing products -->
            <div v-else class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Stock Actual</label>
                <div class="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <ArchiveBoxIcon class="w-4 h-4 text-gray-400 mr-2" />
                    <span class="text-sm text-gray-900">{{ form.stock }} unidades</span>
                </div>
                <p class="text-xs text-gray-500">El stock se ajusta desde el detalle del producto</p>
            </div>
        </div>

        <!-- Active Status -->
        <div class="flex items-center">
            <input id="active" v-model="form.active" type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <label for="active" class="ml-2 block text-sm text-gray-900">
                Producto activo
            </label>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ product ? 'Actualizar' : 'Crear' }} Producto
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useAuthStore } from '@/store/auth'
import type { Product, ProductFormData } from '@/types/product'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    CubeIcon,
    TagIcon,
    CurrencyDollarIcon,
    ArchiveBoxIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    product?: Product | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: ProductFormData]
    cancel: []
}>()

const productCategoriesStore = useProductCategoriesStore()
const authStore = useAuthStore()

const form = reactive({
    categoryId: 0,
    name: '',
    price: 0,
    stock: 0,
    active: true
})

const errors = reactive({
    categoryId: '',
    name: '',
    price: '',
    stock: ''
})

// Computed properties
const categoryOptions = computed(() => {
    if (!productCategoriesStore.list?.items) return []
    return productCategoriesStore.list.items.map(category => ({
        value: category.id,
        label: category.name
    }))
})

const isFormValid = computed(() => {
    const basicValidation = form.categoryId > 0 &&
        form.name.trim().length >= 3 &&
        form.price > 0 &&
        !errors.categoryId &&
        !errors.name &&
        !errors.price

    // Only validate stock for new products
    if (!props.product) {
        return basicValidation && form.stock >= 0 && !errors.stock
    }

    return basicValidation
})

// Validation
const validateForm = () => {
    // Validate category
    if (form.categoryId <= 0) {
        errors.categoryId = 'Selecciona una categoría'
    } else {
        errors.categoryId = ''
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

    // Validate price
    if (form.price <= 0) {
        errors.price = 'El precio debe ser mayor a 0'
    } else {
        errors.price = ''
    }

    // Validate stock (only for new products)
    if (!props.product) {
        if (form.stock < 0) {
            errors.stock = 'El stock no puede ser negativo'
        } else {
            errors.stock = ''
        }
    }
}

const handleSubmit = () => {
    validateForm()
    if (!isFormValid.value) return

    const formData: ProductFormData = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        price: form.price,
        stock: props.product ? undefined : form.stock, // Only include stock for new products
        active: form.active
    }

    emit('submit', formData)
}

// Watch for product prop changes to populate form
watch(() => props.product, (newProduct) => {
    if (newProduct) {
        form.categoryId = newProduct.categoryId
        form.name = newProduct.name
        form.price = newProduct.price
        form.stock = newProduct.stock
        form.active = newProduct.active
    } else {
        // Reset form for new product
        form.categoryId = 0
        form.name = ''
        form.price = 0
        form.stock = 0
        form.active = true
    }

    // Clear errors
    errors.categoryId = ''
    errors.name = ''
    errors.price = ''
    errors.stock = ''
}, { immediate: true })

// Load categories on mount
onMounted(async () => {
    try {
        await productCategoriesStore.fetch({
            page: 1,
            pageSize: 100, // Load all categories for the dropdown
            branchId: authStore.isSuperadmin ? undefined : authStore.branchId
        })
    } catch (error) {
        console.error('Error loading categories:', error)
    }
})
</script>

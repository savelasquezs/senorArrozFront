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
                @create="handleCreateCategory" value-key="value" display-key="label" :allow-create="true">
                <template #icon>
                    <TagIcon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BaseSelect v-model="form.commercialProfileId" :options="commercialProfileOptions"
                    label="Ficha comercial" placeholder="Sin ficha comercial" @update:model-value="validateForm" />
                <div v-if="selectedCommercialProfile" class="flex items-center gap-3 rounded-lg bg-white p-2 border border-gray-200">
                    <img v-if="selectedCommercialProfile.photoUrl" :src="selectedCommercialProfile.photoUrl"
                        class="h-16 w-16 rounded-md object-cover" alt="Foto actual" />
                    <div class="min-w-0 text-sm">
                        <p class="font-medium text-gray-900">{{ selectedCommercialProfile.name }}</p>
                        <p class="truncate text-gray-500">{{ selectedCommercialProfile.description || 'Sin descripción' }}</p>
                    </div>
                </div>
            </div>
            <button v-if="form.commercialProfileId" type="button" class="text-sm font-medium text-red-600 hover:text-red-700"
                @click="form.commercialProfileId = null">Desvincular ficha</button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BaseInput v-model.number="form.servesPeopleMin" label="Personas (mínimo)" type="number" :min="1" :step="1"
                    placeholder="Opcional" :error="errors.servesPeopleMin" @input="validateForm" />
                <BaseInput v-model.number="form.servesPeopleMax" label="Personas (máximo)" type="number" :min="1" :step="1"
                    placeholder="Opcional" :error="errors.servesPeopleMax" @input="validateForm" />
            </div>
            <p class="text-xs text-gray-500">Ejemplo: 7 y 9 se mostrará como “7-9 personas”.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model.number="form.price" label="Precio" type="number" :min="0" :step="100" required
                placeholder="2500" :error="errors.price" @input="validateForm">
                <template #icon>
                    <CurrencyDollarIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput
                v-model.number="formWeightGramsModel"
                label="Peso unitario (g)"
                type="number"
                :min="0"
                :step="1"
                placeholder="Opcional — ej. 500"
                :error="errors.weightGrams"
                @input="validateForm"
            >
                <template #icon>
                    <ScaleIcon class="w-4 h-4" />
                </template>
            </BaseInput>
            <p class="text-xs text-gray-500 md:col-span-2 -mt-2">
                Opcional. Se usa en el dashboard de ventas para sumar kilos vendidos por categoría (unidades × peso).
            </p>

            <!-- Stock para nuevo producto -->
            <div v-if="!product" class="space-y-2">
                <div class="flex items-center gap-2 mb-1">
                    <label class="block text-sm font-medium text-gray-700">Stock Inicial</label>
                    <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer ml-auto">
                        <input type="checkbox" v-model="form.infiniteStock"
                            class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded">
                        <span class="text-emerald-600 font-bold text-base leading-none">∞</span>
                        Ilimitado
                    </label>
                </div>
                <BaseInput v-if="!form.infiniteStock" v-model.number="form.stock" type="number" :min="0" :step="1"
                    placeholder="50" :error="errors.stock" @input="validateForm">
                    <template #icon>
                        <ArchiveBoxIcon class="w-4 h-4" />
                    </template>
                </BaseInput>
                <div v-else class="flex items-center px-3 py-2 border border-emerald-300 rounded-md bg-emerald-50">
                    <span class="text-emerald-500 font-bold text-lg mr-2 leading-none">∞</span>
                    <span class="text-sm text-emerald-700 font-medium">Sin límite de stock</span>
                </div>
            </div>

            <!-- Stock display para productos existentes -->
            <div v-else class="space-y-1">
                <label class="block text-sm font-medium text-gray-700">Stock Actual</label>
                <div class="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <ArchiveBoxIcon class="w-4 h-4 text-gray-400 mr-2" />
                    <span v-if="form.stock === null" class="text-sm font-medium text-emerald-700">
                        ∞ Ilimitado
                    </span>
                    <span v-else class="text-sm text-gray-900">{{ form.stock }} unidades</span>
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

    <!-- Modal confirmación precio $0 -->
    <BaseDialog :model-value="showPriceZeroConfirm" @update:model-value="showPriceZeroConfirm = false"
        title="Precio en $0">
        <div class="space-y-3">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <ExclamationTriangleIcon class="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                    <p class="text-sm text-gray-700">
                        Estás guardando el producto
                        <span class="font-semibold text-gray-900">{{ form.name }}</span>
                        con un precio de <span class="font-semibold text-red-600">$0</span>.
                    </p>
                    <p class="text-sm text-gray-500 mt-1">
                        Este producto podrá agregarse a pedidos sin cobrar nada. ¿Deseas continuar?
                    </p>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end">
                <BaseButton @click="showPriceZeroConfirm = false" variant="secondary">
                    Volver a revisar
                </BaseButton>
                <BaseButton @click="confirmPriceZero" variant="primary">
                    Sí, guardar con precio $0
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted, ref } from 'vue'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import type { Product, ProductFormData } from '@/types/product'
import type { CommercialProfile } from '@/types/product'
import { commercialProfileApi } from '@/services/MainAPI/commercialProfileApi'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import {
    CubeIcon,
    TagIcon,
    CurrencyDollarIcon,
    ArchiveBoxIcon,
    ExclamationTriangleIcon,
    ScaleIcon,
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
const { success, error: showError } = useToast()

const form = reactive({
    categoryId: 0,
    name: '',
    price: 0,
    stock: 0 as number | null,
    /** null = sin peso; número = gramos */
    weightGrams: null as number | null,
    infiniteStock: false,
    active: true
    ,commercialProfileId: null as number | null,
    servesPeopleMin: null as number | null,
    servesPeopleMax: null as number | null,
})

const errors = reactive({
    categoryId: '',
    name: '',
    price: '',
    stock: '',
    weightGrams: '',
    servesPeopleMin: '',
    servesPeopleMax: '',
})

const commercialProfiles = ref<CommercialProfile[]>([])
const commercialProfileOptions = computed(() => commercialProfiles.value.map(x => ({ value: x.id, label: x.name })))
const selectedCommercialProfile = computed(() => commercialProfiles.value.find(x => x.id === form.commercialProfileId))

/** BaseInput no acepta bien `null` en v-model.number; usamos '' como vacío. */
const formWeightGramsModel = computed({
    get: () => (form.weightGrams === null || form.weightGrams === undefined ? '' : form.weightGrams),
    set: (v: number | string) => {
        if (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v))) {
            form.weightGrams = null
        } else {
            const n = typeof v === 'number' ? v : Number(v)
            form.weightGrams = Number.isNaN(n) ? null : n
        }
    },
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
        form.price >= 0 &&
        !errors.categoryId &&
        !errors.name &&
        !errors.price &&
        !errors.weightGrams
        && !errors.servesPeopleMin && !errors.servesPeopleMax

    // Only validate stock for new products
    if (!props.product) {
        return basicValidation && (form.infiniteStock || (form.stock !== null && form.stock >= 0 && !errors.stock))
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

    // Validate price (0 es válido pero requiere confirmación al guardar)
    if (form.price < 0) {
        errors.price = 'El precio no puede ser negativo'
    } else {
        errors.price = ''
    }

    if (form.weightGrams != null && form.weightGrams < 0) {
        errors.weightGrams = 'El peso no puede ser negativo'
    } else {
        errors.weightGrams = ''
    }

    const hasMin = form.servesPeopleMin != null && String(form.servesPeopleMin) !== ''
    const hasMax = form.servesPeopleMax != null && String(form.servesPeopleMax) !== ''
    errors.servesPeopleMin = hasMin && Number(form.servesPeopleMin) <= 0 ? 'Debe ser mayor que cero' : (hasMin !== hasMax ? 'Completa ambos valores' : '')
    errors.servesPeopleMax = hasMax && Number(form.servesPeopleMax) < Number(form.servesPeopleMin) ? 'Debe ser igual o mayor que el mínimo' : (hasMin !== hasMax ? 'Completa ambos valores' : '')

    // Validate stock (only for new products)
    if (!props.product) {
        if (form.stock != null && form.stock < 0) {
            errors.stock = 'El stock no puede ser negativo'
        } else {
            errors.stock = ''
        }
    }
}

const showPriceZeroConfirm = ref(false)

const buildFormData = (): ProductFormData => ({
    categoryId: form.categoryId,
    name: form.name.trim(),
    price: form.price,
    stock: props.product ? undefined : (form.infiniteStock ? null : form.stock),
    weightGrams: form.weightGrams,
    active: form.active,
    commercialProfileId: form.commercialProfileId,
    servesPeopleMin: form.servesPeopleMin === null || String(form.servesPeopleMin) === '' ? null : Number(form.servesPeopleMin),
    servesPeopleMax: form.servesPeopleMax === null || String(form.servesPeopleMax) === '' ? null : Number(form.servesPeopleMax),
})

const handleSubmit = () => {
    validateForm()
    if (!isFormValid.value) return

    if (form.price === 0) {
        showPriceZeroConfirm.value = true
        return
    }

    emit('submit', buildFormData())
}

const confirmPriceZero = () => {
    showPriceZeroConfirm.value = false
    emit('submit', buildFormData())
}

// Handle category creation
const handleCreateCategory = async (categoryName: string) => {
    try {
        const newCategory = await productCategoriesStore.create({
            name: categoryName.trim(),
            branchId: authStore.isSuperadmin ? undefined : (authStore.branchId || undefined)
        })

        if (newCategory) {
            // Set the newly created category as selected
            form.categoryId = newCategory.id
            validateForm()
            success('Categoría creada', 3000, `La categoría "${categoryName}" se ha creado correctamente`)
        }
    } catch (error: any) {
        showError('Error al crear categoría', error.message || 'No se pudo crear la categoría')
    }
}

// Watch for product prop changes to populate form
watch(() => props.product, (newProduct) => {
    if (newProduct) {
        form.categoryId = newProduct.categoryId
        form.name = newProduct.name
        form.price = newProduct.price
        form.stock = newProduct.stock
        form.weightGrams = newProduct.weightGrams ?? null
        form.infiniteStock = newProduct.stock === null
        form.active = newProduct.active
        form.commercialProfileId = newProduct.commercialProfileId ?? null
        form.servesPeopleMin = newProduct.servesPeopleMin ?? null
        form.servesPeopleMax = newProduct.servesPeopleMax ?? null
    } else {
        form.categoryId = 0
        form.name = ''
        form.price = 0
        form.stock = 0
        form.weightGrams = null
        form.infiniteStock = false
        form.active = true
        form.commercialProfileId = null
        form.servesPeopleMin = null
        form.servesPeopleMax = null
    }

    errors.categoryId = ''
    errors.name = ''
    errors.price = ''
    errors.stock = ''
    errors.weightGrams = ''
    errors.servesPeopleMin = ''
    errors.servesPeopleMax = ''
}, { immediate: true })

// Load categories on mount
onMounted(async () => {
    try {
        await productCategoriesStore.fetch({
            page: 1,
            pageSize: 100, // Load all categories for the dropdown
            branchId: authStore.isSuperadmin ? undefined : (authStore.branchId || undefined)
        })
        const branchId = props.product?.branchId || authStore.branchId
        if (branchId) commercialProfiles.value = (await commercialProfileApi.getAll(branchId)).data
    } catch (error) {
        console.error('Error loading categories:', error)
    }
})
</script>

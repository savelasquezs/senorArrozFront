<!-- src/components/expenses/ExpenseForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput v-model="formData.name" label="Nombre del Gasto" placeholder="Ej: Arroz, Servicio de transporte..."
            required :disabled="loading" />

        <BaseSelect v-model="formData.categoryId" :options="categoryOptions" label="Categoría"
            placeholder="Seleccionar categoría..." value-key="value" display-key="label" required :disabled="loading" />

        <BaseSelect v-model="formData.unit" :options="unitOptions" label="Unidad" placeholder="Seleccionar unidad..."
            value-key="value" display-key="label" required :disabled="loading" />

        <div v-if="branchId" class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-3">
            <p class="text-sm font-medium text-gray-800">Imputación a menú (por gramos vendidos)</p>
            <p class="text-xs text-gray-600">
                Opcional. Enlaza este gasto a categorías o productos para el reporte de costo estimado por gramo.
                Solo cuentan productos con peso definido en catálogo.
            </p>
            <div v-if="catalogLoading" class="text-xs text-gray-500">Cargando menú…</div>
            <template v-else>
                <div>
                    <p class="text-xs font-medium text-gray-700 mb-1">Categorías de producto</p>
                    <div class="max-h-36 overflow-y-auto space-y-1 border border-gray-200 rounded-md bg-white p-2">
                        <label v-for="c in productCategories" :key="'pc-' + c.id"
                            class="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="checkbox" class="mt-0.5 rounded border-gray-300"
                                :checked="hasTarget(0, c.id)" :disabled="loading"
                                @change="toggleTarget(0, c.id, ($event.target as HTMLInputElement).checked)" />
                            <span>{{ c.name }}</span>
                        </label>
                        <p v-if="!productCategories.length" class="text-xs text-gray-400">Sin categorías en el catálogo.</p>
                    </div>
                </div>
                <div>
                    <p class="text-xs font-medium text-gray-700 mb-1">Productos</p>
                    <div class="max-h-36 overflow-y-auto space-y-1 border border-gray-200 rounded-md bg-white p-2">
                        <label v-for="p in products" :key="'p-' + p.id"
                            class="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="checkbox" class="mt-0.5 rounded border-gray-300"
                                :checked="hasTarget(1, p.id)" :disabled="loading"
                                @change="toggleTarget(1, p.id, ($event.target as HTMLInputElement).checked)" />
                            <span>
                                {{ p.name }}
                                <span v-if="p.weightGrams == null || p.weightGrams <= 0"
                                    class="text-amber-600 text-xs"> (sin peso)</span>
                            </span>
                        </label>
                        <p v-if="!products.length" class="text-xs text-gray-400">Sin productos en el catálogo.</p>
                    </div>
                </div>
            </template>
        </div>
        <p v-else class="text-xs text-gray-500">
            Definí la sucursal en el contexto (p. ej. detalle de sucursal) para configurar imputación al menú.
        </p>

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
import { ref, watch, computed, onMounted } from 'vue'
import type { Expense, ExpenseCategory, CreateExpenseDto, UpdateExpenseDto, ExpenseMenuTargetInput, ExpenseMenuTargetType } from '@/types/expense'
import type { ProductCategory, Product } from '@/types/product'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { productCategoryApi } from '@/services/MainAPI/productCategoryApi'
import { productApi } from '@/services/MainAPI/productApi'
import { ORDER_CATALOG_PRODUCT_PAGE_SIZE } from '@/store/products'
import { ORDER_CATALOG_CATEGORY_PAGE_SIZE } from '@/store/productCategories'

interface Props {
    expense?: Expense | null
    categories?: ExpenseCategory[]
    loading?: boolean
    /** Sucursal para cargar categorías/productos de menú (imputación). */
    branchId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
    expense: null,
    categories: () => [],
    loading: false,
    branchId: null,
})

const emit = defineEmits<{
    submit: [data: CreateExpenseDto | UpdateExpenseDto]
    cancel: []
}>()

const editingExpense = computed(() => props.expense !== null)

const formData = ref<CreateExpenseDto>({
    name: '',
    categoryId: 0,
    unit: 'Unit',
    menuTargets: [],
})

const productCategories = ref<ProductCategory[]>([])
const products = ref<Product[]>([])
const catalogLoading = ref(false)

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

function hasTarget(targetType: ExpenseMenuTargetType, targetId: number): boolean {
    return formData.value.menuTargets.some(
        t => t.targetType === targetType && t.targetId === targetId
    )
}

function toggleTarget(targetType: ExpenseMenuTargetType, targetId: number, on: boolean) {
    const list = formData.value.menuTargets.filter(
        t => !(t.targetType === targetType && t.targetId === targetId)
    )
    if (on) {
        list.push({ targetType, targetId })
    }
    formData.value = { ...formData.value, menuTargets: list }
}

async function loadMenuCatalog() {
    const bid = props.branchId
    if (!bid) {
        productCategories.value = []
        products.value = []
        return
    }
    catalogLoading.value = true
    try {
        const [catRes, prodRes] = await Promise.all([
            productCategoryApi.getProductCategories({
                page: 1,
                pageSize: ORDER_CATALOG_CATEGORY_PAGE_SIZE,
                sortBy: 'name',
                sortOrder: 'asc',
            }),
            productApi.getProducts({
                page: 1,
                pageSize: ORDER_CATALOG_PRODUCT_PAGE_SIZE,
                active: true,
                sortBy: 'name',
                sortOrder: 'asc',
            }),
        ])
        if (catRes.isSuccess && catRes.data) {
            productCategories.value = catRes.data.items || []
        }
        if (prodRes.isSuccess && prodRes.data) {
            products.value = prodRes.data.items || []
        }
    } catch {
        productCategories.value = []
        products.value = []
    } finally {
        catalogLoading.value = false
    }
}

function normalizeMenuTargetType(t: unknown): ExpenseMenuTargetType {
    if (t === 1 || t === 'product' || t === 'Product') return 1
    return 0
}

watch(() => props.expense, (expense) => {
    if (expense) {
        const mt = (expense.menuTargets || []).map(
            (x): ExpenseMenuTargetInput => ({
                targetType: normalizeMenuTargetType(x.targetType),
                targetId: x.targetId,
            })
        )
        formData.value = {
            name: expense.name,
            categoryId: expense.categoryId,
            unit: expense.unit,
            menuTargets: mt,
        }
    } else {
        formData.value = {
            name: '',
            categoryId: (props.categories && props.categories.length > 0) ? props.categories[0].id : 0,
            unit: 'Unit',
            menuTargets: [],
        }
    }
}, { immediate: true })

watch(() => props.branchId, () => {
    loadMenuCatalog()
}, { immediate: true })

onMounted(() => {
    if (props.branchId) loadMenuCatalog()
})

const handleSubmit = () => {
    if (!formData.value.name.trim() || !formData.value.categoryId) {
        return
    }
    emit('submit', { ...formData.value })
}
</script>

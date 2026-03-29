<!-- src/views/ProductsList.vue -->
<template>
    <MainLayout page-title="Productos">
        <BaseLoading v-if="store.isLoading" text="Cargando productos..." />

        <div v-else class="flex flex-col gap-2 min-h-0 -mx-2 sm:mx-0">
            <!-- Filtros compactos -->
            <div
                class="flex flex-wrap items-end gap-x-3 gap-y-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-xs">
                <BaseInput v-model="filters.name" placeholder="Nombre…"
                    class="min-w-[8rem] flex-1 sm:max-w-[11rem] [&_input]:py-1.5 [&_input]:text-xs">
                    <template #icon>
                        <MagnifyingGlassIcon class="w-4 h-4" />
                    </template>
                </BaseInput>
                <BaseSelect v-model="filters.categoryId" :options="categoryOptions" placeholder="Categoría"
                    value-key="value" display-key="label" class="min-w-[9rem] max-w-[13rem] [&_button]:py-1.5 [&_button]:text-xs" />
                <BaseSelect v-model="filters.active" :options="statusOptions" placeholder="Estado" value-key="value"
                    display-key="label" class="min-w-[7rem] max-w-[10rem] [&_button]:py-1.5 [&_button]:text-xs" />
                <BaseInput :model-value="filters.minPrice?.toString() || ''" placeholder="Precio min" type="number"
                    :min="0" class="w-24 [&_input]:py-1.5 [&_input]:text-xs"
                    @update:model-value="filters.minPrice = $event ? Number($event) : undefined" />
                <BaseInput :model-value="filters.maxPrice?.toString() || ''" placeholder="Precio max" type="number"
                    :min="0" class="w-24 [&_input]:py-1.5 [&_input]:text-xs"
                    @update:model-value="filters.maxPrice = $event ? Number($event) : undefined" />
                <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                    Limpiar
                </BaseButton>
                <div class="flex-1 min-w-[8rem]" />
                <BaseButton @click="goToCategories" variant="outline" size="sm" :icon="TagIcon">
                    Categorías
                </BaseButton>
                <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                    Nuevo
                </BaseButton>
            </div>

            <!-- KPIs compactos -->
            <div
                class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-50/90 border border-gray-100 rounded-md">
                <span>Mostrando <strong class="text-gray-900">{{ filteredProducts.length }}</strong> de <strong
                        class="text-gray-900">{{ loadedCount }}</strong></span>
                <span class="hidden sm:inline text-gray-300">|</span>
                <span>Activos <strong class="text-gray-900">{{ activeProducts }}</strong></span>
                <span>Inactivos <strong class="text-gray-900">{{ inactiveProducts }}</strong></span>
                <span>Stock bajo <strong class="text-amber-700">{{ lowStockProducts }}</strong></span>
            </div>

            <!-- Tabla con scroll -->
            <BaseCard class="p-0 overflow-hidden flex flex-col flex-1 min-h-0 border border-gray-200">
                <div class="overflow-auto max-h-[min(calc(100vh-13rem),72vh)]">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Producto
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Categoría
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Precio
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Stock
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Estado
                                </th>
                                <th class="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-100">
                            <tr v-if="filteredProducts.length === 0">
                                <td colspan="6" class="px-3 py-10 text-center text-gray-500 text-sm">
                                    <CubeIcon class="mx-auto h-8 w-8 text-gray-400" />
                                    <p class="mt-2 font-medium">Sin resultados</p>
                                    <p class="text-xs">Ajusta los filtros o carga productos</p>
                                </td>
                            </tr>

                            <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50/80">
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CubeIcon class="h-4 w-4 text-green-600" />
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-medium text-gray-900 truncate max-w-[14rem]">{{
                                                product.name }}</div>
                                            <div class="text-[11px] text-gray-500">#{{ product.id }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-800">
                                    <span class="inline-flex items-center gap-0.5">
                                        <TagIcon class="h-3.5 w-3.5 text-gray-400" />
                                        {{ product.categoryName }}
                                    </span>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-800">
                                    <span class="inline-flex items-center gap-0.5">
                                        <CurrencyDollarIcon class="h-3.5 w-3.5 text-gray-400" />
                                        {{ product.price.toLocaleString() }}
                                    </span>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <span v-if="product.stock === null" class="text-emerald-600 font-medium">∞</span>
                                    <span v-else :class="{
                                        'text-red-600 font-semibold': product.stock <= 5,
                                        'text-yellow-600': product.stock <= 10 && product.stock > 5,
                                        'text-green-600': product.stock > 10
                                    }">{{ product.stock }}</span>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <BaseBadge :variant="product.active ? 'success' : 'danger'" class="text-[10px]">
                                        {{ product.active ? 'Activo' : 'Inactivo' }}
                                    </BaseBadge>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-right">
                                    <div class="flex justify-end gap-1">
                                        <BaseButton @click="goDetail(product.id)" variant="outline" size="sm"
                                            :icon="EyeIcon" title="Ver" />
                                        <BaseButton @click="openEdit(product)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar" />
                                        <BaseButton v-if="auth.isSuperadmin || auth.isAdmin"
                                            @click="deleteProduct(product)" variant="outline" size="sm"
                                            :icon="TrashIcon" title="Eliminar"
                                            class="text-red-600 hover:text-red-700 border-red-200" />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </BaseCard>
        </div>

        <BaseDialog v-model="showForm" :title="editingProduct ? 'Editar Producto' : 'Nuevo Producto'" :icon="PlusIcon"
            size="lg">
            <ProductForm :product="editingProduct" :loading="formLoading" @submit="handleFormSubmit"
                @cancel="showForm = false" />
        </BaseDialog>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import ProductForm from '@/components/products/ProductForm.vue'

import {
    CubeIcon,
    TagIcon,
    CurrencyDollarIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { Product, ProductFormData } from '@/types/product'

const PRODUCTS_PAGE_SIZE = 150
const CATEGORIES_PAGE_SIZE = 50

const store = useProductsStore()
const productCategoriesStore = useProductCategoriesStore()
const auth = useAuthStore()
const router = useRouter()
const { success, error: showError } = useToast()

const filters = ref({
    name: '',
    categoryId: undefined as number | undefined,
    active: undefined as boolean | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
})

const showForm = ref(false)
const editingProduct = ref<Product | null>(null)
const formLoading = ref(false)

const statusOptions = [
    { value: undefined, label: 'Todos' },
    { value: true, label: 'Activos' },
    { value: false, label: 'Inactivos' }
]

const categoryOptions = computed(() => {
    if (!productCategoriesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas' },
        ...productCategoriesStore.list.items.map(category => ({
            value: category.id,
            label: category.name
        }))
    ]
})

const loadedItems = computed(() => store.list?.items || [])

const loadedCount = computed(() => loadedItems.value.length)

const filteredProducts = computed(() => {
    let items = [...loadedItems.value]
    const q = filters.value.name?.trim().toLowerCase()
    if (q) {
        items = items.filter(p => p.name.toLowerCase().includes(q))
    }
    if (filters.value.categoryId != null) {
        items = items.filter(p => p.categoryId === filters.value.categoryId)
    }
    if (filters.value.active !== undefined) {
        items = items.filter(p => p.active === filters.value.active)
    }
    if (filters.value.minPrice != null && !Number.isNaN(filters.value.minPrice)) {
        items = items.filter(p => p.price >= filters.value.minPrice!)
    }
    if (filters.value.maxPrice != null && !Number.isNaN(filters.value.maxPrice)) {
        items = items.filter(p => p.price <= filters.value.maxPrice!)
    }
    return items
})

const activeProducts = computed(() => loadedItems.value.filter(p => p.active).length)

const inactiveProducts = computed(() => loadedItems.value.filter(p => !p.active).length)

const lowStockProducts = computed(() =>
    loadedItems.value.filter(p => p.stock !== null && p.stock <= 5).length
)

const loadAll = async () => {
    try {
        await store.fetch({
            page: 1,
            pageSize: PRODUCTS_PAGE_SIZE,
        })
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los productos')
    }
}

const clearFilters = () => {
    filters.value = {
        name: '',
        categoryId: undefined,
        active: undefined,
        minPrice: undefined,
        maxPrice: undefined,
    }
}

const goToCategories = () => {
    router.push({ name: 'ProductCategoriesList' })
}

const goDetail = (id: number) => router.push({ name: 'ProductDetail', params: { id } })

const openCreate = () => {
    editingProduct.value = null
    showForm.value = true
}

const openEdit = (product: Product) => {
    editingProduct.value = product
    showForm.value = true
}

const handleFormSubmit = async (data: ProductFormData) => {
    try {
        formLoading.value = true

        if (editingProduct.value) {
            await store.update(editingProduct.value.id, data)
            success('Producto actualizado', 3000, `El producto "${data.name}" se ha actualizado correctamente`)
        } else {
            await store.create(data)
            success('Producto creado', 3000, `El producto "${data.name}" se ha creado correctamente`)
        }

        showForm.value = false
        await loadAll()
    } catch (e) {
        showError('Error al guardar', store.error || 'No se pudo guardar el producto')
    } finally {
        formLoading.value = false
    }
}

const deleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"?`)) {
        return
    }

    try {
        await store.remove(product.id)
        success('Producto eliminado', 3000, `El producto "${product.name}" se ha eliminado correctamente`)
        await loadAll()
    } catch (e) {
        showError('Error al eliminar', store.error || 'No se pudo eliminar el producto')
    }
}

onMounted(async () => {
    try {
        await productCategoriesStore.fetch({
            page: 1,
            pageSize: CATEGORIES_PAGE_SIZE,
        })
        await loadAll()
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>

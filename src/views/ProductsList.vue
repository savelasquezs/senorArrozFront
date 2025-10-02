<!-- src/views/ProductsList.vue -->
<template>
    <MainLayout page-title="Productos">
        <!-- Loading State -->
        <BaseLoading v-if="store.isLoading" text="Cargando productos..." />

        <!-- Content -->
        <div v-else class="space-y-6">
            <!-- Filters Card -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Filtros de búsqueda</h3>
                    <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar filtros
                    </BaseButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <BaseInput v-model="filters.name" label="Nombre" placeholder="Buscar por nombre"
                        :icon="MagnifyingGlassIcon" />
                    <BaseSelect v-model="filters.categoryId" :options="categoryOptions" label="Categoría"
                        placeholder="Todas las categorías" value-key="value" display-key="label" />
                    <BaseSelect v-model="filters.active" :options="statusOptions" label="Estado"
                        placeholder="Todos los estados" value-key="value" display-key="label" />
                    <BaseInput :model-value="filters.minPrice?.toString() || ''" label="Precio Mín" type="number"
                        min="0" placeholder="0"
                        @update:model-value="filters.minPrice = $event ? Number($event) : undefined" />
                    <BaseInput :model-value="filters.maxPrice?.toString() || ''" label="Precio Máx" type="number"
                        min="0" placeholder="999999"
                        @update:model-value="filters.maxPrice = $event ? Number($event) : undefined" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Productos" :value="store.list?.totalCount || 0" icon="store" />
                <StatsCard title="Productos Activos" :value="activeProducts" icon="store" />
                <StatsCard title="Productos Inactivos" :value="inactiveProducts" icon="store" />
                <StatsCard title="Stock Bajo" :value="lowStockProducts" icon="clipboard" />
            </div>

            <!-- Products Table -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            Lista de Productos
                            <span class="text-sm font-normal text-gray-500">
                                ({{ store.list?.items?.length || 0 }} de {{ store.list?.totalCount || 0 }})
                            </span>
                        </h3>

                        <!-- Link to Categories -->
                        <BaseButton @click="goToCategories" variant="outline" size="sm" :icon="TagIcon">
                            Ver Categorías
                        </BaseButton>
                    </div>

                    <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                        Nuevo Producto
                    </BaseButton>
                </div>

                <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Producto
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stock
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th
                                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-if="(store.list?.items?.length || 0) === 0">
                                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                    <CubeIcon class="mx-auto h-12 w-12 text-gray-400" />
                                    <p class="mt-2 text-lg font-medium">No hay productos</p>
                                    <p class="text-sm">No se encontraron productos con los filtros aplicados</p>
                                </td>
                            </tr>

                            <tr v-for="product in store.list?.items || []" :key="product.id" class="hover:bg-gray-50">
                                <!-- Product Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <CubeIcon class="h-5 w-5 text-green-600" />
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">
                                                {{ product.name }}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                ID: {{ product.id }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Category Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <TagIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ product.categoryName }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Price -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <CurrencyDollarIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            ${{ product.price.toLocaleString() }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Stock -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <ArchiveBoxIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            <span :class="{
                                                'text-red-600 font-semibold': product.stock <= 5,
                                                'text-yellow-600 font-medium': product.stock <= 10 && product.stock > 5,
                                                'text-green-600': product.stock > 10
                                            }">
                                                {{ product.stock }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <!-- Status -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <BaseBadge :variant="product.active ? 'success' : 'danger'">
                                        {{ product.active ? 'Activo' : 'Inactivo' }}
                                    </BaseBadge>
                                </td>

                                <!-- Actions -->
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex justify-end space-x-2">
                                        <BaseButton @click="goDetail(product.id)" variant="outline" size="sm"
                                            :icon="EyeIcon" title="Ver detalles">
                                            Ver
                                        </BaseButton>
                                        <BaseButton @click="openEdit(product)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar producto">
                                            Editar
                                        </BaseButton>
                                        <BaseButton v-if="auth.isSuperadmin || auth.isAdmin"
                                            @click="deleteProduct(product)" variant="outline" size="sm"
                                            :icon="TrashIcon" title="Eliminar producto"
                                            class="text-red-600 hover:text-red-700">
                                            Eliminar
                                        </BaseButton>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="store.list && store.list.totalPages > 1" class="flex items-center justify-between mt-6">
                    <div class="text-sm text-gray-700">
                        Mostrando {{ ((store.list.page - 1) * store.list.pageSize) + 1 }} a
                        {{ Math.min(store.list.page * store.list.pageSize, store.list.totalCount) }} de
                        {{ store.list.totalCount }} resultados
                    </div>
                    <div class="flex space-x-2">
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasPreviousPage"
                            @click="previousPage" :icon="ChevronLeftIcon">
                            Anterior
                        </BaseButton>
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasNextPage" @click="nextPage"
                            :right-icon="ChevronRightIcon">
                            Siguiente
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>

        <!-- Create/Edit Product Dialog -->
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
import StatsCard from '@/components/ui/StatsCard.vue'
import ProductForm from '@/components/ProductForm.vue'

import {
    CubeIcon,
    TagIcon,
    CurrencyDollarIcon,
    ArchiveBoxIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { Product, ProductFilters, ProductFormData } from '@/types/product'

const store = useProductsStore()
const productCategoriesStore = useProductCategoriesStore()
const auth = useAuthStore()
const router = useRouter()
const { success, error: showError } = useToast()

// Filters
const filters = ref({
    name: '',
    categoryId: undefined as number | undefined,
    active: undefined as boolean | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    page: 1,
    pageSize: 10
})

// Form dialog
const showForm = ref(false)
const editingProduct = ref<Product | null>(null)
const formLoading = ref(false)

// Status options
const statusOptions = [
    { value: undefined, label: 'Todos los estados' },
    { value: true, label: 'Activos' },
    { value: false, label: 'Inactivos' }
]

// Category options
const categoryOptions = computed(() => {
    if (!productCategoriesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas las categorías' },
        ...productCategoriesStore.list.items.map(category => ({
            value: category.id,
            label: category.name
        }))
    ]
})

// Computed stats
const activeProducts = computed(() => {
    return store.list?.items?.filter(p => p.active).length || 0
})

const inactiveProducts = computed(() => {
    return store.list?.items?.filter(p => !p.active).length || 0
})

const lowStockProducts = computed(() => {
    return store.list?.items?.filter(p => p.stock <= 5).length || 0
})

// Methods
const goToCategories = () => {
    router.push({ name: 'ProductCategoriesList' })
}

const load = async () => {
    try {
        const filtersToSend: ProductFilters = {
            name: filters.value.name || undefined,
            categoryId: filters.value.categoryId,
            active: filters.value.active,
            minPrice: filters.value.minPrice,
            maxPrice: filters.value.maxPrice,
            branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined),
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10
        }

        await store.fetch(filtersToSend)
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los productos')
    }
}

const clearFilters = async () => {
    filters.value = {
        name: '',
        categoryId: undefined,
        active: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        page: 1,
        pageSize: 10
    }
    await load()
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
        await load()
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
        await load()
    } catch (e) {
        showError('Error al eliminar', store.error || 'No se pudo eliminar el producto')
    }
}

const previousPage = async () => {
    if (store.list?.hasPreviousPage) {
        filters.value.page = (filters.value.page || 1) - 1
        await load()
    }
}

const nextPage = async () => {
    if (store.list?.hasNextPage) {
        filters.value.page = (filters.value.page || 1) + 1
        await load()
    }
}

onMounted(async () => {
    try {
        // Load categories for the filter
        await productCategoriesStore.fetch({
            page: 1,
            pageSize: 100,
            branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined)
        })

        await load()
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>

<!-- src/views/ProductCategoriesList.vue -->
<template>
    <MainLayout page-title="Categorías de Productos">
        <!-- Loading State -->
        <BaseLoading v-if="store.isLoading" text="Cargando categorías..." />

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

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <BaseInput v-model="filters.name" label="Nombre" placeholder="Buscar por nombre"
                        :icon="MagnifyingGlassIcon" />
                    <BaseSelect v-if="auth.isSuperadmin" v-model="filters.branchId" :options="branchOptions"
                        label="Sucursal" placeholder="Todas las sucursales" value-key="value" display-key="label" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard title="Total Categorías" :value="store.list?.totalCount || 0" icon="clipboard" />
                <StatsCard title="Con Productos" :value="categoriesWithProducts" icon="store" />
                <StatsCard title="Sin Productos" :value="categoriesWithoutProducts" icon="clipboard" />
            </div>

            <!-- Categories Table -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            Lista de Categorías
                            <span class="text-sm font-normal text-gray-500">
                                ({{ store.list?.items?.length || 0 }} de {{ store.list?.totalCount || 0 }})
                            </span>
                        </h3>

                        <!-- Link to Products -->
                        <BaseButton @click="goToProducts" variant="outline" size="sm" :icon="CubeIcon">
                            Ver Productos
                        </BaseButton>
                    </div>

                    <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                        Nueva Categoría
                    </BaseButton>
                </div>

                <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sucursal
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Productos
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha Creación
                                </th>
                                <th
                                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-if="(store.list?.items?.length || 0) === 0">
                                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                                    <TagIcon class="mx-auto h-12 w-12 text-gray-400" />
                                    <p class="mt-2 text-lg font-medium">No hay categorías</p>
                                    <p class="text-sm">No se encontraron categorías con los filtros aplicados</p>
                                </td>
                            </tr>

                            <tr v-for="category in store.list?.items || []" :key="category.id" class="hover:bg-gray-50">
                                <!-- Category Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <TagIcon class="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">
                                                {{ category.name }}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                ID: {{ category.id }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Branch Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <BuildingOffice2Icon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ category.branchName }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Products Count -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <CubeIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ category.totalProducts }} total
                                        </div>
                                        <div class="text-xs text-gray-500">
                                            {{ category.activeProducts }} activos
                                        </div>
                                    </div>
                                </td>

                                <!-- Created Date -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        {{ formatDate(category.createdAt) }}
                                    </div>
                                </td>

                                <!-- Actions -->
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex justify-end space-x-2">
                                        <BaseButton @click="openEdit(category)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar categoría">
                                            Editar
                                        </BaseButton>
                                        <BaseButton v-if="auth.isSuperadmin || auth.isAdmin"
                                            @click="deleteCategory(category)" variant="outline" size="sm"
                                            :icon="TrashIcon" title="Eliminar categoría"
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

        <!-- Create/Edit Category Dialog -->
        <BaseDialog v-model="showForm" :title="editingCategory ? 'Editar Categoría' : 'Nueva Categoría'"
            :icon="PlusIcon" size="md">
            <ProductCategoryForm :category="editingCategory" :loading="formLoading" @submit="handleFormSubmit"
                @cancel="showForm = false" />
        </BaseDialog>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import ProductCategoryForm from '@/components/products/categories/ProductCategoryForm.vue'

import {
    TagIcon,
    CubeIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { ProductCategory, ProductCategoryFilters, ProductCategoryFormData } from '@/types/product'

const router = useRouter()
const store = useProductCategoriesStore()
const branchesStore = useBranchesStore()
const auth = useAuthStore()
const { success, error: showError } = useToast()

// Filters
const filters = ref({
    name: '',
    branchId: undefined as number | undefined,
    page: 1,
    pageSize: 10
})

// Form dialog
const showForm = ref(false)
const editingCategory = ref<ProductCategory | null>(null)
const formLoading = ref(false)

// Branch options
const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas las sucursales' },
        ...branchesStore.list.items.map(branch => ({
            value: branch.id,
            label: branch.name
        }))
    ]
})

// Computed stats
const categoriesWithProducts = computed(() => {
    return store.list?.items?.filter(c => c.totalProducts > 0).length || 0
})

const categoriesWithoutProducts = computed(() => {
    return store.list?.items?.filter(c => c.totalProducts === 0).length || 0
})

// Methods
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const load = async () => {
    try {
        const filtersToSend: ProductCategoryFilters = {
            name: filters.value.name || undefined,
            branchId: auth.isSuperadmin ? filters.value.branchId : (auth.branchId || undefined),
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10
        }

        await store.fetch(filtersToSend)
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar las categorías')
    }
}

const clearFilters = async () => {
    filters.value = {
        name: '',
        branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined),
        page: 1,
        pageSize: 10
    }
    await load()
}

const goToProducts = () => {
    router.push({ name: 'ProductsList' })
}

const openCreate = () => {
    editingCategory.value = null
    showForm.value = true
}

const openEdit = (category: ProductCategory) => {
    editingCategory.value = category
    showForm.value = true
}

const handleFormSubmit = async (data: ProductCategoryFormData & { branchId?: number }) => {
    try {
        formLoading.value = true

        if (editingCategory.value) {
            await store.update(editingCategory.value.id, data)
            success('Categoría actualizada', 3000, `La categoría "${data.name}" se ha actualizado correctamente`)
        } else {
            await store.create(data)
            success('Categoría creada', 3000, `La categoría "${data.name}" se ha creado correctamente`)
        }

        showForm.value = false
        await load()
    } catch (e) {
        showError('Error al guardar', store.error || 'No se pudo guardar la categoría')
    } finally {
        formLoading.value = false
    }
}

const deleteCategory = async (category: ProductCategory) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
        return
    }

    try {
        await store.remove(category.id)
        success('Categoría eliminada', 3000, `La categoría "${category.name}" se ha eliminado correctamente`)
        await load()
    } catch (e) {
        showError('Error al eliminar', store.error || 'No se pudo eliminar la categoría')
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
        // Load branches for superadmin filter
        if (auth.isSuperadmin) {
            await branchesStore.fetchAll()
        }

        await load()
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>

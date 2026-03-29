<!-- src/views/ProductCategoriesList.vue -->
<template>
    <MainLayout page-title="Categorías de Productos">
        <BaseLoading v-if="store.isLoading" text="Cargando categorías..." />

        <div v-else class="flex flex-col gap-2 min-h-0 -mx-2 sm:mx-0">
            <!-- Filtros compactos -->
            <div
                class="flex flex-wrap items-end gap-x-3 gap-y-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-xs">
                <BaseInput v-model="filters.name" placeholder="Nombre…"
                    class="min-w-[8rem] flex-1 sm:max-w-[14rem] [&_input]:py-1.5 [&_input]:text-xs">
                    <template #icon>
                        <MagnifyingGlassIcon class="w-4 h-4" />
                    </template>
                </BaseInput>
                <BaseSelect v-if="auth.isSuperadmin || auth.isAdmin" v-model="filters.branchId" :options="branchOptions"
                    placeholder="Sucursal" value-key="value" display-key="label"
                    class="min-w-[9rem] max-w-[14rem] [&_button]:py-1.5 [&_button]:text-xs" />
                <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                    Limpiar
                </BaseButton>
                <div class="flex-1 min-w-[6rem]" />
                <BaseButton @click="goToProducts" variant="outline" size="sm" :icon="CubeIcon">
                    Productos
                </BaseButton>
                <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                    Nueva
                </BaseButton>
            </div>

            <!-- KPIs compactos -->
            <div
                class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-50/90 border border-gray-100 rounded-md">
                <span>Mostrando <strong class="text-gray-900">{{ filteredCategories.length }}</strong> de <strong
                        class="text-gray-900">{{ loadedCount }}</strong></span>
                <span class="hidden sm:inline text-gray-300">|</span>
                <span>Con productos <strong class="text-gray-900">{{ categoriesWithProducts }}</strong></span>
                <span>Sin productos <strong class="text-gray-900">{{ categoriesWithoutProducts }}</strong></span>
            </div>

            <!-- Tabla con scroll -->
            <BaseCard class="p-0 overflow-hidden flex flex-col flex-1 min-h-0 border border-gray-200">
                <div class="overflow-auto max-h-[min(calc(100vh-13rem),72vh)]">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Categoría
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Sucursal
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Productos
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Creada
                                </th>
                                <th class="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-100">
                            <tr v-if="filteredCategories.length === 0">
                                <td colspan="5" class="px-3 py-10 text-center text-gray-500 text-sm">
                                    <TagIcon class="mx-auto h-8 w-8 text-gray-400" />
                                    <p class="mt-2 font-medium">Sin resultados</p>
                                    <p class="text-xs">Ajusta los filtros</p>
                                </td>
                            </tr>

                            <tr v-for="category in filteredCategories" :key="category.id" class="hover:bg-gray-50/80">
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <TagIcon class="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-medium text-gray-900 truncate max-w-[14rem]">{{
                                                category.name }}</div>
                                            <div class="text-[11px] text-gray-500">#{{ category.id }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-800">
                                    <span class="inline-flex items-center gap-0.5">
                                        <BuildingOffice2Icon class="h-3.5 w-3.5 text-gray-400" />
                                        {{ category.branchName }}
                                    </span>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-gray-800">
                                    <span class="inline-flex items-center gap-0.5">
                                        <CubeIcon class="h-3.5 w-3.5 text-gray-400" />
                                        {{ category.totalProducts }} total
                                    </span>
                                    <div class="text-[11px] text-gray-500">{{ category.activeProducts }} activos</div>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                    {{ formatDate(category.createdAt) }}
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-right">
                                    <div class="flex justify-end gap-1">
                                        <BaseButton @click="openEdit(category)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar" />
                                        <BaseButton v-if="auth.isSuperadmin || auth.isAdmin"
                                            @click="deleteCategory(category)" variant="outline" size="sm"
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
import ProductCategoryForm from '@/components/products/categories/ProductCategoryForm.vue'

import {
    TagIcon,
    CubeIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { ProductCategory, ProductCategoryFormData } from '@/types/product'

const CATEGORIES_PAGE_SIZE = 50

const router = useRouter()
const store = useProductCategoriesStore()
const branchesStore = useBranchesStore()
const auth = useAuthStore()
const { success, error: showError } = useToast()

const filters = ref({
    name: '',
    branchId: undefined as number | undefined,
})

const showForm = ref(false)
const editingCategory = ref<ProductCategory | null>(null)
const formLoading = ref(false)

const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas' },
        ...branchesStore.list.items.map(branch => ({
            value: branch.id,
            label: branch.name
        }))
    ]
})

const loadedItems = computed(() => store.list?.items || [])

const loadedCount = computed(() => loadedItems.value.length)

const filteredCategories = computed(() => {
    let items = [...loadedItems.value]
    const q = filters.value.name?.trim().toLowerCase()
    if (q) {
        items = items.filter(c => c.name.toLowerCase().includes(q))
    }
    if (filters.value.branchId != null) {
        items = items.filter(c => c.branchId === filters.value.branchId)
    }
    return items
})

const categoriesWithProducts = computed(() =>
    loadedItems.value.filter(c => c.totalProducts > 0).length
)

const categoriesWithoutProducts = computed(() =>
    loadedItems.value.filter(c => c.totalProducts === 0).length
)

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const loadAll = async () => {
    try {
        await store.fetch({
            page: 1,
            pageSize: CATEGORIES_PAGE_SIZE,
        })
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar las categorías')
    }
}

const clearFilters = () => {
    filters.value = {
        name: '',
        branchId: undefined,
    }
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
        await loadAll()
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
        await loadAll()
    } catch (e) {
        showError('Error al eliminar', store.error || 'No se pudo eliminar la categoría')
    }
}

onMounted(async () => {
    try {
        if (auth.isSuperadmin || auth.isAdmin) {
            await branchesStore.fetchAll()
        }

        await loadAll()
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>

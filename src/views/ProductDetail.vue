<!-- src/views/ProductDetail.vue -->
<template>
    <MainLayout>
        <div class="p-6">
            <!-- Loading State -->
            <BaseLoading v-if="store.isLoading" text="Cargando producto..." />

            <!-- Access Denied -->
            <BaseAlert v-else-if="!canAccessProduct" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Acceso Denegado</h3>
                    <p class="mt-1">No tienes permisos para ver este producto.</p>
                </div>
            </BaseAlert>

            <!-- Product Content -->
            <div v-else-if="product" class="space-y-4">
                <!-- Product Header -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-3 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CubeIcon class="w-4 h-4 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h1 class="text-lg font-semibold text-gray-900">{{ product.name }}</h1>
                                    <p class="text-xs text-gray-500">ID: {{ product.id }}</p>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex space-x-1">
                                <BaseButton @click="openEditDialog" variant="secondary" size="sm" :icon="PencilIcon">
                                    Editar
                                </BaseButton>
                                <BaseButton
                                    v-if="authStore.user?.role === 'Superadmin' || authStore.user?.role === 'Admin'"
                                    @click="confirmDelete" variant="danger" size="sm" :icon="TrashIcon">
                                    Eliminar
                                </BaseButton>
                            </div>
                        </div>
                    </div>

                    <!-- Product Info -->
                    <div class="px-4 py-3">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="flex items-center">
                                <TagIcon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Categoría</p>
                                    <p class="text-xs text-gray-600">{{ product.categoryName }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <CurrencyDollarIcon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Precio</p>
                                    <p class="text-xs text-gray-600">${{ product.price.toLocaleString() }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <ArchiveBoxIcon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Stock</p>
                                    <p class="text-xs text-gray-600" :class="{
                                        'text-red-600 font-semibold': product.stock <= 5,
                                        'text-yellow-600 font-medium': product.stock <= 10 && product.stock > 5,
                                        'text-green-600': product.stock > 10
                                    }">{{ product.stock }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <BuildingOffice2Icon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Sucursal</p>
                                    <p class="text-xs text-gray-600">{{ product.branchName }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <ChartBarIcon class="w-5 h-5 text-blue-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Total Ventas</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalSales || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CurrencyDollarIcon class="w-5 h-5 text-green-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Ingresos</p>
                                <p class="text-lg font-semibold text-gray-900">${{ (productDetail?.totalRevenue ||
                                    0).toLocaleString() }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <ShoppingBagIcon class="w-5 h-5 text-purple-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Pedidos</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalOrders || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <UserGroupIcon class="w-5 h-5 text-orange-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Clientes</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalCustomers || 0 }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <!-- Additional Info Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CalendarIcon class="w-5 h-5 text-indigo-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Fecha de Creación</p>
                                <p class="text-xs font-semibold text-gray-900">{{ formatDate(product.createdAt) }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <ClockIcon class="w-5 h-5 text-teal-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Última Venta</p>
                                <p class="text-xs font-semibold text-gray-900">
                                    {{ productDetail?.lastSoldAt ? formatDate(productDetail.lastSoldAt) : 'Nunca' }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <!-- Stock Adjustment Section -->
                <BaseCard v-if="authStore.user?.role === 'Superadmin'">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-semibold text-gray-900">Ajuste de Stock</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <BaseInput v-model.number="stockAdjustment" label="Cantidad a ajustar" type="number"
                                placeholder="Ej: +10 o -5" :error="stockError" />
                            <div class="flex items-end">
                                <BaseButton @click="adjustStock" variant="primary" :loading="adjustingStock"
                                    :disabled="!stockAdjustment || stockAdjustment === 0">
                                    Ajustar Stock
                                </BaseButton>
                            </div>
                            <div class="flex items-end">
                                <BaseButton @click="showStockHistory = true" variant="outline">
                                    Ver Historial
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <!-- Edit Product Dialog -->
            <BaseDialog v-model="showEditDialog" title="Editar Producto" :icon="PencilIcon" size="lg">
                <ProductForm :product="product" :loading="store.isLoading" @submit="handleEditSubmit"
                    @cancel="showEditDialog = false" />
            </BaseDialog>

            <!-- Delete Confirmation Dialog -->
            <BaseDialog v-model="showDeleteDialog" title="Confirmar Eliminación" :icon="ExclamationTriangleIcon"
                icon-variant="danger" size="md">
                <div class="text-center">
                    <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-600" />
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900">Eliminar Producto</h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-500">
                                ¿Estás seguro de que deseas eliminar el producto
                                <strong>{{ product?.name }}</strong>?
                            </p>
                            <p class="text-sm text-red-600 mt-2">
                                Esta acción no se puede deshacer y eliminará todos los datos asociados.
                            </p>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <BaseButton @click="showDeleteDialog = false" variant="secondary">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="handleDelete" variant="danger" :loading="store.isLoading">
                        Eliminar Producto
                    </BaseButton>
                </template>
            </BaseDialog>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '@/store/products'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ProductForm from '@/components/products/ProductForm.vue'
import {
    CubeIcon,
    TagIcon,
    CurrencyDollarIcon,
    ArchiveBoxIcon,
    BuildingOffice2Icon,
    PencilIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    ShoppingBagIcon,
    UserGroupIcon,
    CalendarIcon,
    ClockIcon
} from '@heroicons/vue/24/outline'
import type { ProductFormData } from '@/types/product'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// Reactive state
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showStockHistory = ref(false)
const stockAdjustment = ref<number>(0)
const stockError = ref('')
const adjustingStock = ref(false)

const productId = computed(() => Number(route.params.id))
const product = computed(() => store.current)
const productDetail = computed(() => store.currentDetail)

const canAccessProduct = computed(() => {
    if (!product.value) return false

    const userRole = authStore.user?.role
    const userBranchId = authStore.user?.branchId

    // Superadmin can access all products
    if (userRole === 'Superadmin') return true

    // Admin can only access products from their own branch
    if (userRole === 'Admin') return userBranchId === product.value.branchId

    return false
})

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// Actions
const openEditDialog = () => {
    showEditDialog.value = true
}

const confirmDelete = () => {
    showDeleteDialog.value = true
}

const handleEditSubmit = async (formData: ProductFormData) => {
    try {
        await store.update(productId.value, formData)
        showEditDialog.value = false
        success('Producto actualizado', 5000, 'El producto se ha actualizado correctamente')
    } catch (error: any) {
        console.error('Error updating product:', error)
        showError('Error al actualizar', error.message || 'No se pudo actualizar el producto')
    }
}

const handleDelete = async () => {
    try {
        await store.remove(productId.value)
        showDeleteDialog.value = false
        success('Producto eliminado', 5000, 'El producto se ha eliminado correctamente')
        router.push('/products')
    } catch (error: any) {
        console.error('Error deleting product:', error)
        showError('Error al eliminar', error.message || 'No se pudo eliminar el producto')
    }
}

const adjustStock = async () => {
    if (!stockAdjustment.value || stockAdjustment.value === 0) {
        stockError.value = 'Ingresa una cantidad válida'
        return
    }

    try {
        adjustingStock.value = true
        stockError.value = ''

        await store.adjustStock(productId.value, { quantity: stockAdjustment.value })

        success('Stock ajustado', 3000, `Stock ajustado en ${stockAdjustment.value} unidades`)
        stockAdjustment.value = 0
    } catch (error: any) {
        console.error('Error adjusting stock:', error)
        stockError.value = error.message || 'Error al ajustar el stock'
    } finally {
        adjustingStock.value = false
    }
}

// Lifecycle
onMounted(async () => {
    try {
        // Fetch product details first to check access
        await store.fetchById(productId.value)

        if (!canAccessProduct.value) {
            return
        }

        // Load product detail with statistics
        await store.fetchDetail(productId.value)

    } catch (error: any) {
        console.error('Error loading product data:', error)
        showError("Error al cargar datos", error.message || "Error al cargar el producto")
    }
})
</script>

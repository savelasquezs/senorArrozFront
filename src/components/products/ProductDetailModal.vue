<!-- Modal informativo de producto (estadísticas, stock, edición) -->
<template>
    <BaseDialog :model-value="open" size="5xl" @update:model-value="onDialogOpenChange">
        <template #header>
            <div class="flex items-start justify-between gap-3 w-full pr-2">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="flex-shrink-0 w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                        <CubeIcon class="w-5 h-5 text-green-600" />
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-lg font-semibold text-gray-900 truncate">
                            {{ product?.name || 'Producto' }}
                        </h3>
                        <p v-if="product" class="text-xs text-gray-500">ID: {{ product.id }}</p>
                    </div>
                </div>
                <div v-if="product && canAccessProduct" class="flex flex-shrink-0 gap-1">
                    <BaseButton variant="secondary" size="sm" :icon="PencilIcon" @click="openEditDialog">
                        Editar
                    </BaseButton>
                    <BaseButton
                        v-if="authStore.user?.role === 'Superadmin' || authStore.user?.role === 'Admin'"
                        variant="danger" size="sm" :icon="TrashIcon" @click="confirmDelete">
                        Eliminar
                    </BaseButton>
                </div>
            </div>
        </template>

        <div class="space-y-4 -mt-2">
            <BaseLoading v-if="detailLoading" text="Cargando producto…" />

            <BaseAlert v-else-if="!canAccessProduct && !loadError" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Acceso denegado</h3>
                    <p class="mt-1">No tienes permisos para ver este producto.</p>
                </div>
            </BaseAlert>

            <BaseAlert v-else-if="loadError" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Error</h3>
                    <p class="mt-1">{{ loadError }}</p>
                </div>
            </BaseAlert>

            <template v-else-if="product">
                <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                            <div class="flex items-center gap-2">
                                <TagIcon class="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Categoría</p>
                                    <p class="text-xs text-gray-600">{{ product.categoryName }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <CurrencyDollarIcon class="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Precio</p>
                                    <p class="text-xs text-gray-600">${{ product.price.toLocaleString() }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <ArchiveBoxIcon class="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Stock</p>
                                    <p v-if="product.stock === null" class="text-xs text-emerald-600 font-medium">∞ Ilimitado</p>
                                    <p
                                        v-else
                                        class="text-xs"
                                        :class="{
                                            'text-red-600 font-semibold': product.stock <= 5,
                                            'text-yellow-600 font-medium': product.stock <= 10 && product.stock > 5,
                                            'text-green-600': product.stock > 10,
                                        }">
                                        {{ product.stock }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <ScaleIcon class="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Peso unitario</p>
                                    <p class="text-xs text-gray-600">{{ formatWeightGrams(product.weightGrams) }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <BuildingOffice2Icon class="w-4 h-4 text-gray-400 shrink-0" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Sucursal</p>
                                    <p class="text-xs text-gray-600">{{ product.branchName }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BaseCard>
                        <div class="flex items-center">
                            <ChartBarIcon class="w-5 h-5 text-blue-600 shrink-0" />
                            <div class="ml-2 min-w-0">
                                <p class="text-xs font-medium text-gray-500">Total ventas</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalSales || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>
                    <BaseCard>
                        <div class="flex items-center">
                            <CurrencyDollarIcon class="w-5 h-5 text-green-600 shrink-0" />
                            <div class="ml-2 min-w-0">
                                <p class="text-xs font-medium text-gray-500">Ingresos</p>
                                <p class="text-lg font-semibold text-gray-900">
                                    ${{ (productDetail?.totalRevenue || 0).toLocaleString() }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>
                    <BaseCard>
                        <div class="flex items-center">
                            <ShoppingBagIcon class="w-5 h-5 text-purple-600 shrink-0" />
                            <div class="ml-2 min-w-0">
                                <p class="text-xs font-medium text-gray-500">Pedidos</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalOrders || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>
                    <BaseCard>
                        <div class="flex items-center">
                            <UserGroupIcon class="w-5 h-5 text-orange-600 shrink-0" />
                            <div class="ml-2 min-w-0">
                                <p class="text-xs font-medium text-gray-500">Clientes</p>
                                <p class="text-lg font-semibold text-gray-900">{{ productDetail?.totalCustomers || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <BaseCard>
                        <div class="flex items-center">
                            <CalendarIcon class="w-5 h-5 text-indigo-600 shrink-0" />
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Fecha de creación</p>
                                <p class="text-xs font-semibold text-gray-900">{{ formatDate(product.createdAt) }}</p>
                            </div>
                        </div>
                    </BaseCard>
                    <BaseCard>
                        <div class="flex items-center">
                            <ClockIcon class="w-5 h-5 text-teal-600 shrink-0" />
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Última venta</p>
                                <p class="text-xs font-semibold text-gray-900">
                                    {{ productDetail?.lastSoldAt ? formatDate(productDetail.lastSoldAt) : 'Nunca' }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <BaseCard>
                    <div class="space-y-2">
                        <h3 class="text-sm font-semibold text-gray-900">Historial de ventas (unidades)</h3>
                        <p class="text-xs text-gray-500">
                            Últimos 90 días, suma de cantidades por día. Pedidos cancelados no cuentan. Día según fecha de
                            reserva si aplica; si no, fecha del pedido.
                        </p>
                        <div
                            v-if="!salesUnitsEvolutionSeries.length"
                            class="h-48 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
                            Sin datos de historial.
                        </div>
                        <div v-else class="relative min-h-[12rem]">
                            <DashboardLineChart
                                :labels="salesUnitsChartLabels"
                                :datasets="salesUnitsChartDatasets"
                                y-format="number"
                                variant="area"
                                :curve-tension="0.35" />
                        </div>
                    </div>
                </BaseCard>

                <BaseCard v-if="authStore.user?.role === 'Superadmin'">
                    <div class="space-y-4">
                        <h3 class="text-base font-semibold text-gray-900">Ajuste de stock</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BaseInput
                                v-model.number="stockAdjustment"
                                label="Cantidad a ajustar"
                                type="number"
                                placeholder="Ej: +10 o -5"
                                :error="stockError" />
                            <div class="flex items-end">
                                <BaseButton
                                    variant="primary"
                                    :loading="adjustingStock"
                                    :disabled="!stockAdjustment || stockAdjustment === 0"
                                    @click="adjustStock">
                                    Ajustar stock
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </BaseCard>
            </template>
        </div>

        <BaseDialog v-model="showEditDialog" title="Editar producto" :icon="PencilIcon" size="lg">
            <ProductForm :product="product" :loading="formBusy" @submit="handleEditSubmit" @cancel="showEditDialog = false" />
        </BaseDialog>

        <BaseDialog
            v-model="showDeleteDialog"
            title="Confirmar eliminación"
            :icon="ExclamationTriangleIcon"
            icon-variant="danger"
            size="md">
            <div class="text-center">
                <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-600" />
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900">Eliminar producto</h3>
                    <div class="mt-2 text-sm text-gray-500">
                        ¿Eliminar <strong>{{ product?.name }}</strong>? Esta acción no se puede deshacer.
                    </div>
                </div>
            </div>
            <template #footer>
                <BaseButton variant="secondary" @click="showDeleteDialog = false">Cancelar</BaseButton>
                <BaseButton variant="danger" :loading="deleteBusy" @click="handleDelete">Eliminar</BaseButton>
            </template>
        </BaseDialog>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DashboardLineChart from '@/components/dashboard/DashboardLineChart.vue'
import type { LineChartDataset } from '@/components/dashboard/lineChart.types'
import { useProductsStore } from '@/store/products'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
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
    ClockIcon,
    ScaleIcon,
} from '@heroicons/vue/24/outline'
import type { ProductFormData } from '@/types/product'

const props = defineProps<{
    open: boolean
    productId: number | null
}>()

const emit = defineEmits<{
    close: []
    refresh: []
}>()

const store = useProductsStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const detailLoading = ref(false)
const loadError = ref('')
const formBusy = ref(false)
const deleteBusy = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const stockAdjustment = ref(0)
const stockError = ref('')
const adjustingStock = ref(false)

const product = computed(() => store.current)
const productDetail = computed(() => store.currentDetail)

const salesUnitsEvolutionSeries = computed(() => productDetail.value?.salesUnitsEvolution ?? [])

const salesUnitsChartLabels = computed(() =>
    salesUnitsEvolutionSeries.value.map(p =>
        new Date(p.bucketStart).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
    ),
)

const salesUnitsChartDatasets = computed<LineChartDataset[]>(() => [
    {
        label: 'Unidades vendidas',
        data: salesUnitsEvolutionSeries.value.map(p => p.unitsSold),
    },
])

const canAccessProduct = computed(() => {
    if (!product.value) return false
    const role = authStore.user?.role
    if (role === 'Superadmin' || role === 'Admin') return true
    return false
})

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

const formatWeightGrams = (grams: number | null | undefined) => {
    if (grams == null || grams <= 0) return 'Sin definir'
    return `${new Intl.NumberFormat('es-CO').format(grams)} g`
}

const resetLocalState = () => {
    loadError.value = ''
    stockAdjustment.value = 0
    stockError.value = ''
    showEditDialog.value = false
    showDeleteDialog.value = false
}

const loadDetail = async (id: number) => {
    detailLoading.value = true
    loadError.value = ''
    try {
        await store.fetchById(id, { silent: true })
        if (!canAccessProduct.value) return
        await store.fetchDetail(id, { silent: true })
    } catch (e: any) {
        loadError.value = e?.message || 'No se pudo cargar el producto'
        showError('Error al cargar', loadError.value)
    } finally {
        detailLoading.value = false
    }
}

watch(
    () => [props.open, props.productId] as const,
    ([open, id]) => {
        if (!open) {
            store.clear()
            resetLocalState()
            return
        }
        if (id != null && id > 0) {
            loadDetail(id)
        }
    },
    { immediate: true },
)

const onDialogOpenChange = (val: boolean) => {
    if (!val) emit('close')
}

const openEditDialog = () => {
    showEditDialog.value = true
}

const confirmDelete = () => {
    showDeleteDialog.value = true
}

const handleEditSubmit = async (formData: ProductFormData) => {
    const id = props.productId
    if (id == null) return
    try {
        formBusy.value = true
        await store.update(id, formData, { silent: true })
        showEditDialog.value = false
        success('Producto actualizado', 4000, 'Los cambios se guardaron correctamente')
        await loadDetail(id)
        emit('refresh')
    } catch (e: any) {
        showError('Error al actualizar', e?.message || 'No se pudo actualizar el producto')
    } finally {
        formBusy.value = false
    }
}

const handleDelete = async () => {
    const id = props.productId
    if (id == null) return
    try {
        deleteBusy.value = true
        await store.remove(id, { silent: true })
        showDeleteDialog.value = false
        success('Producto eliminado', 4000, 'El producto se eliminó correctamente')
        emit('refresh')
        emit('close')
    } catch (e: any) {
        showError('Error al eliminar', e?.message || 'No se pudo eliminar el producto')
    } finally {
        deleteBusy.value = false
    }
}

const adjustStock = async () => {
    const id = props.productId
    if (id == null) return
    if (!stockAdjustment.value || stockAdjustment.value === 0) {
        stockError.value = 'Ingresa una cantidad válida'
        return
    }
    try {
        adjustingStock.value = true
        stockError.value = ''
        await store.adjustStock(id, { quantity: stockAdjustment.value }, { silent: true })
        success('Stock ajustado', 3000, `Ajuste de ${stockAdjustment.value} unidades`)
        stockAdjustment.value = 0
        await loadDetail(id)
        emit('refresh')
    } catch (e: any) {
        stockError.value = e?.message || 'Error al ajustar el stock'
    } finally {
        adjustingStock.value = false
    }
}
</script>

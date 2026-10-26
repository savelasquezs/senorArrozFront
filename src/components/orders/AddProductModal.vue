<template>
    <BaseDialog :model-value="open" title="Agregar productos" size="7xl" panel-class="h-[90dvh]"
        body-class="flex min-h-0 flex-1 flex-col overflow-hidden p-0 pt-4" scroll-body :close-on-backdrop="false"
        @update:model-value="requestClose">
        <div class="flex min-h-0 flex-1 overflow-hidden border-t border-gray-200" data-test="product-selector-workspace">
            <OrderProductCatalog v-if="open" :key="catalogSession" class="min-w-0 flex-1" compact selection-only
                :products="catalogMatchesBranch ? productsStore.catalogProducts : []" :categories="categoriesStore.catalogCategories"
                :loading="catalogLoading" :error="catalogError" :disabled="disabled || !catalogMatchesBranch"
                :selected-products="selectedProducts" :disabled-product-ids="existingProductIds"
                @product-selected="selection.add" @retry="loadCatalog(true)" />
            <section class="product-selector-summary flex min-h-0 flex-col overflow-hidden border-l border-gray-200 bg-gray-50"
                aria-label="Productos seleccionados">
                <header class="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
                    <h4 class="text-sm font-medium text-gray-900">Tu selección · {{ selection.items.value.length }}</h4>
                    <BaseButton v-if="selection.items.value.length" variant="ghost" size="xs" @click="closeAfterDiscard = false; discardRequested = true">Vaciar</BaseButton>
                </header>
                <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" data-test="selected-products-scroll">
                    <div v-if="!selection.items.value.length" class="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
                        <ShoppingBagIcon class="h-8 w-8 text-gray-400" />
                        <p>Selecciona productos del catálogo</p>
                    </div>
                    <fieldset v-else :disabled="disabled" class="space-y-2">
                        <OrderItem v-for="item in selection.items.value" :key="item.tempId" :item="item" :tab-id="`selector-${catalogSession}`"
                            :save-note="notes => saveNote(item.tempId, notes)" @quantity-change="selection.updateQuantity"
                            @price-change="selection.updatePrice" @discount-change="selection.updateDiscount" @remove="selection.remove" />
                    </fieldset>
                </div>
                <footer class="shrink-0 space-y-3 border-t border-gray-200 bg-white p-3" data-test="product-selector-footer">
                    <p v-if="disabled" role="alert" class="text-sm text-amber-800">La edición no está disponible en este momento. Conservamos tu selección; revisa el detalle antes de continuar.</p>
                    <p v-else-if="selection.errors.value.length" role="alert" class="text-sm text-red-700">{{ selection.errors.value[0] }}</p>
                    <p v-else-if="selection.notice.value" role="status" class="text-sm text-amber-800">{{ selection.notice.value }}</p>
                    <div class="flex items-center justify-between gap-2" aria-live="polite">
                        <span class="text-xs text-gray-500">{{ selection.units.value }} {{ selection.units.value === 1 ? 'unidad seleccionada' : 'unidades seleccionadas' }}</span>
                        <strong class="text-lg font-semibold tabular-nums text-emerald-700">{{ selection.errors.value.length ? '—' : formatCurrency(selection.total.value) }}</strong>
                    </div>
                    <div v-if="discardRequested" role="alert" class="space-y-2">
                        <p class="text-sm text-gray-700">¿Descartar los productos seleccionados?</p>
                        <div class="flex justify-end gap-2">
                            <BaseButton variant="secondary" size="sm" @click="discardRequested = false">Seguir editando</BaseButton>
                            <BaseButton variant="danger" size="sm" @click="discardSelection">Descartar selección</BaseButton>
                        </div>
                    </div>
                    <div v-else class="flex gap-2">
                        <BaseButton variant="secondary" size="sm" @click="requestClose">Cancelar</BaseButton>
                        <BaseButton variant="primary" size="sm" class="flex-1" :disabled="!canApply" @click="applySelection">Añadir a la edición</BaseButton>
                    </div>
                    <p class="text-xs text-gray-500">El pedido se guarda al pulsar «Guardar cambios» en el detalle.</p>
                </footer>
            </section>
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import OrderItem from './OrderItem.vue'
import OrderProductCatalog from './OrderProductCatalog.vue'
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderProductSelection } from '@/composables/useOrderProductSelection'
import type { OrderProductAddition } from '@/types/order'

const props = defineProps<{ open: boolean; existingProductIds: number[]; branchId?: number | null; disabled?: boolean }>()
const emit = defineEmits<{ close: []; 'products-added': [products: OrderProductAddition[]] }>()
const productsStore = useProductsStore()
const categoriesStore = useProductCategoriesStore()
const { formatCurrency } = useFormatting()
const selection = useOrderProductSelection(toRef(productsStore, 'catalogProducts'), toRef(props, 'existingProductIds'))
const catalogLoading = ref(false)
const loadError = ref('')
const discardRequested = ref(false)
const closeAfterDiscard = ref(true)
const catalogSession = ref(0)
let catalogVersion = 0
const catalogMatchesBranch = computed(() => props.branchId == null || props.branchId === productsStore.catalogBranchId)
const catalogError = computed(() => loadError.value || productsStore.catalogError
    || (!catalogMatchesBranch.value ? 'Actualiza el catálogo para consultar la disponibilidad de la sucursal del pedido.' : ''))
const selectedProducts = computed(() => {
    const ids = new Set(selection.items.value.map(item => item.productId))
    return productsStore.catalogProducts.filter(product => ids.has(product.id))
})
const canApply = computed(() => props.open && !props.disabled && !catalogLoading.value && !catalogError.value
    && productsStore.catalogLoaded && selection.items.value.length > 0 && selection.errors.value.length === 0)

async function loadCatalog(force = false) {
    const version = ++catalogVersion
    catalogLoading.value = true
    loadError.value = ''
    try {
        await Promise.all([productsStore.ensureCatalogLoaded(props.branchId, force), categoriesStore.ensureCatalogLoaded()])
    } catch {
        if (version === catalogVersion) loadError.value = 'No se pudieron cargar los productos y su disponibilidad. Reintenta.'
    } finally {
        if (version === catalogVersion) catalogLoading.value = false
    }
}
function requestClose() {
    closeAfterDiscard.value = true
    if (selection.items.value.length) discardRequested.value = true
    else emit('close')
}
function discardSelection() {
    selection.reset()
    discardRequested.value = false
    if (closeAfterDiscard.value) emit('close')
}
function saveNote(id: string, notes: string) {
    if (props.disabled || !props.open) throw new Error('La edición no está disponible. Conserva la nota y revisa el detalle.')
    const item = selection.items.value.find(item => item.tempId === id)
    if (item) item.notes = notes
}
function applySelection() {
    if (canApply.value) emit('products-added', selection.additions())
}
watch(() => [props.open, props.branchId] as const, ([open]) => {
    catalogVersion++
    catalogSession.value++
    selection.reset()
    discardRequested.value = false
    loadError.value = ''
    catalogLoading.value = false
    if (open) void loadCatalog()
}, { immediate: true })
onBeforeUnmount(() => { catalogVersion++ })
</script>

<style scoped>
.product-selector-summary { width: var(--order-sidebar-width); flex-shrink: 0; }
</style>

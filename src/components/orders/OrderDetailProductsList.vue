<template>
    <div class="space-y-3">
        <!-- Header con botón de edición -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h3 class="text-base font-semibold text-gray-900">Productos del pedido</h3>
            </div>
            <BaseButton v-if="!editing && canEdit" size="sm" variant="secondary" @click="enterEditMode">
                <PencilIcon class="w-4 h-4 mr-1" />
                Editar Productos
            </BaseButton>
        </div>

        <!-- Tabla de productos -->
        <div class="overflow-x-auto rounded-xl border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                        <th v-if="showDiscountColumn" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Descuento %</th>
                        <th v-if="freeDeliveryAppliedTotal > 0" class="px-3 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Domi gratis</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                        <th v-if="editing" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="(item, index) in localProducts" :key="item.id || index">
                        <!-- Producto -->
                        <td class="px-3 py-2">
                            <div>
                                <div class="flex items-center gap-1">
                                    <p class="text-sm font-medium text-gray-900">{{ item.productName }}</p>
                                    <button v-if="canEdit" type="button" class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-emerald-700 focus-visible:outline-emerald-600 disabled:opacity-40"
                                        :aria-label="`Editar nota de ${item.productName}`" :title="item.notes || 'Agregar nota'" :disabled="props.saving"
                                        @click="noteProduct = item">
                                        <PencilIcon class="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <p v-if="item.productDescription && item.productDescription.trim() !== item.productName.trim()" class="text-xs text-gray-500">
                                    {{ item.productDescription }}
                                </p>
                                <p v-if="item.notes" class="text-xs text-gray-600 mt-1 italic">
                                    Nota: {{ item.notes }}
                                </p>
                            </div>
                        </td>

                        <!-- Cantidad -->
                        <td class="px-3 py-2 text-center">
                            <BaseInput v-if="editing" v-model.number="item.quantity" type="number" size="sm" :min="1" class="w-20"
                                :aria-label="`Cantidad de ${item.productName}`" @input="recalculateSubtotal(item, index)" />
                            <span v-else class="text-sm text-gray-900">{{ item.quantity }}</span>
                        </td>

                        <!-- Precio unitario -->
                        <td class="px-3 py-2 text-right">
                            <BaseInput v-if="editing" v-model.number="item.unitPrice" type="number" size="sm" :min="0" step="100"
                                class="w-28" :aria-label="`Precio de ${item.productName}`" @input="recalculateSubtotal(item, index)" />
                            <span v-else class="text-sm text-gray-900">{{ formatCurrency(item.unitPrice) }}</span>
                        </td>

                        <!-- Descuento -->
                        <td v-if="showDiscountColumn" class="px-3 py-2 text-right">
                            <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                                <BaseInput v-if="editing" :model-value="Number((discountPercentages[index] ?? 0).toFixed(2))" type="number" size="sm" :min="0" :max="100" step="0.1"
                                    :aria-label="`Descuento en porcentaje de ${item.productName}`" class="w-20"
                                    @update:model-value="updateDiscountPercentage(item, index, $event)" />
                                <span v-if="editing" class="text-xs">%</span>
                                <span v-else class="text-sm text-gray-900">{{ Number((discountPercentages[index] ?? 0).toFixed(2)) }}%</span>
                                <span v-if="item.discount > (freeDeliveryAppliedByIndex[index] ?? 0)" class="ml-1 text-xs text-gray-500 tabular-nums">{{ formatCurrency(Math.max(0, item.discount - (freeDeliveryAppliedByIndex[index] ?? 0))) }}</span>
                            </div>
                        </td>
                        <td v-if="freeDeliveryAppliedTotal > 0" class="whitespace-nowrap px-3 py-2 text-right text-sm text-emerald-700 tabular-nums">
                            {{ freeDeliveryAppliedByIndex[index] ? `−${formatCurrency(freeDeliveryAppliedByIndex[index] ?? 0)}` : '—' }}
                        </td>

                        <!-- Subtotal -->
                        <td class="px-3 py-2 text-right">
                            <span class="text-sm font-medium text-gray-900">{{ formatCurrency(item.subtotal) }}</span>
                        </td>

                        <!-- Acciones (solo en modo edición) -->
                        <td v-if="editing" class="px-3 py-2 text-center">
                            <button type="button" class="text-red-600 hover:text-red-700 p-1" title="Eliminar producto"
                                @click="removeProduct(index)">
                                <TrashIcon class="w-4 h-4" />
                            </button>
                        </td>
                    </tr>

                    <!-- Mensaje si no hay productos -->
                    <tr v-if="localProducts.length === 0">
                        <td :colspan="4 + Number(showDiscountColumn) + Number(freeDeliveryAppliedTotal > 0) + Number(editing)" class="px-4 py-8 text-center text-gray-500">
                            No hay productos en este pedido
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Botón agregar producto (modo edición) -->
        <div v-if="editing" class="pt-2">
            <BaseButton size="sm" variant="outline" @click="showAddProductModal = true">
                <PlusIcon class="w-4 h-4 mr-1" />
                Agregar Producto
            </BaseButton>
        </div>

        <!-- Panel de totales -->
        <div class="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-1.5">
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(calculatedSubtotal) }}</span>
            </div>
            <div v-if="discountTotal > 0" class="flex items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <span class="text-gray-600">Descuentos:</span>
                <div class="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 tabular-nums">
                    <span class="font-medium text-red-600">−{{ formatCurrency(discountTotal) }}</span>
                    <span class="text-xs text-gray-500">
                        (<span :class="{ 'text-emerald-700': freeDeliveryAppliedTotal > 0 }">{{ formatCurrency(freeDeliveryAppliedTotal) }} domi gratis</span> · {{ formatCurrency(discountTotal - freeDeliveryAppliedTotal) }} otros)
                    </span>
                </div>
            </div>
            <div v-if="showDeliveryFeeLine">
                <slot name="delivery-fee" :editing-products="editing">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Domicilio:</span>
                        <span class="font-medium text-gray-900">{{ formatCurrency(deliveryFee) }}</span>
                    </div>
                </slot>
            </div>
            <div v-if="false" class="flex items-start justify-between gap-3 text-sm">
                <label class="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                    <input
                        type="checkbox"
                        class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        :disabled="!canEdit"
                        :checked="localFreeDeliveryRequested"
                        @change="onFreeDeliveryCheckboxChange"
                    />
                    Domicilio gratis
                </label>
                <span class="text-[10px] text-gray-400 text-right max-w-[10rem] leading-tight">
                    Hasta {{ formatCurrency(freeDeliveryBudgetCap) }} sobre el envío
                </span>
            </div>
            <div v-if="freeDeliveryAppliedTotal === 0 && showLegacyFreeDeliveryRevert" class="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                <span>Domi gratis posible en descuentos</span>
                <button
                    type="button"
                    class="font-semibold text-amber-800 underline-offset-2 hover:underline disabled:opacity-50"
                    :disabled="!canEdit"
                    @click="revertLegacyFreeDelivery"
                >
                    Revertir
                </button>
            </div>
            <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span class="text-gray-900">Total:</span>
                <span class="text-emerald-600">{{ formatCurrency(calculatedTotal) }}</span>
            </div>
        </div>

        <!-- Botones de acción (modo edición) -->
        <div v-if="editing" class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <BaseButton variant="secondary" @click="cancelEdit">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="props.saving" :disabled="localProducts.length === 0" @click="saveChanges">
                Guardar Cambios
            </BaseButton>
        </div>

        <!-- Modal para agregar producto -->
        <AddProductModal :open="showAddProductModal" :existing-product-ids="existingProductIds"
            @close="showAddProductModal = false" @product-added="handleProductAdded" />

        <OrderNoteDialog :model-value="noteProduct !== null" :notes="noteProduct?.notes"
            :title="`Notas · ${noteProduct?.productName ?? ''}`" :disabled="!canEdit || !!props.saving"
            :save="saveNotes" @update:model-value="value => { if (!value) noteProduct = null }" />
        <BaseDialog v-model="showLastProductWarningModal" title="Ultimo producto del pedido" size="md">
            <p class="text-sm text-gray-700">
                Este es el ultimo producto del pedido. Te recomendamos cancelar el pedido para que no sume en el total del dia.
            </p>
            <template #footer>
                <BaseButton variant="secondary" @click="showLastProductWarningModal = false">
                    Volver
                </BaseButton>
                <BaseButton variant="danger" @click="handleCancelOrderRequest">
                    Cancelar pedido
                </BaseButton>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderDetailItem, UpdateOrderDetailDto } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import { clampDiscountPercentage, discountAmountFromPercentage, discountPercentageFromAmount } from '@/helpers/orderProductDiscount'
import {
    deliveryDiscountBudget,
    distributeEqualWithCaps,
    lineCapacityCop,
} from '@/composables/useFreeDeliveryDiscount'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import OrderNoteDialog from './OrderNoteDialog.vue'
import AddProductModal from './AddProductModal.vue'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Props {
    products: OrderDetailItem[]
    deliveryFee: number
    /** Mostrar fila de domicilio (incluye tarifa $0) */
    showDeliveryFeeLine?: boolean
    orderType?: 'onsite' | 'delivery' | 'reservation'
    addressId?: number | null
    maxFreeDeliveryDiscount?: number
    freeDeliveryRequested?: boolean
    canEdit: boolean
    saving?: boolean
    saveProductNote?: (itemId: number, notes: string) => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
    showDeliveryFeeLine: false,
    orderType: 'onsite',
    addressId: null,
    maxFreeDeliveryDiscount: 0,
    freeDeliveryRequested: false,
})

const emit = defineEmits<{
    save: [payload: { products: UpdateOrderDetailDto[]; freeDeliveryRequested: boolean }]
    requestCancelOrder: []
    editingChange: [editing: boolean]
}>()

const { formatCurrency } = useFormatting()
const { error } = useToast()

// Estado
const editing = ref(false)
watch(editing, value => emit('editingChange', value))
const saving = ref(false)
const showAddProductModal = ref(false)
const showLastProductWarningModal = ref(false)
const localProducts = ref<OrderDetailItem[]>([])
const noteProduct = ref<OrderDetailItem | null>(null)
async function saveNotes(notes: string) {
    const item = noteProduct.value
    if (!item || !props.canEdit || props.saving || !localProducts.value.includes(item)) throw new Error('El producto ya no permite editar su nota.')
    if (editing.value) {
        item.notes = notes
        return
    }
    if (!props.saveProductNote) throw new Error('No se pudo guardar la nota del producto.')
    await props.saveProductNote(item.id, notes)
}
watch(editing, () => { noteProduct.value = null })
const showDiscountColumn = computed(() => editing.value || localProducts.value.some((item, index) => item.discount > (freeDeliveryAppliedByIndex.value[index] ?? 0)))
const originalProducts = ref<OrderDetailItem[]>([])
const localFreeDeliveryRequested = ref(false)
const freeDeliveryAppliedByIndex = ref<number[]>([])
const discountPercentages = ref<number[]>([])

function syncDiscountPercentages() {
    discountPercentages.value = localProducts.value.map((item, index) =>
        discountPercentageFromAmount(item.quantity * item.unitPrice, Math.max(0, item.discount - (freeDeliveryAppliedByIndex.value[index] ?? 0))),
    )
}

// Computed
const calculatedSubtotal = computed(() => {
    return localProducts.value.reduce((sum, item) => sum + item.subtotal, 0)
})

const discountTotal = computed(() => {
    return localProducts.value.reduce((sum, item) => sum + item.discount, 0)
})

const calculatedTotal = computed(() => {
    return calculatedSubtotal.value + (props.deliveryFee ?? 0)
})

const showFreeDeliveryCheckbox = computed(() => {
    return props.orderType === 'delivery' || (props.orderType === 'reservation' && props.addressId != null)
})

const freeDeliveryBudgetCap = computed(() =>
    deliveryDiscountBudget(props.deliveryFee ?? 0, props.maxFreeDeliveryDiscount ?? 0),
)

const freeDeliveryAppliedTotal = computed(() =>
    freeDeliveryAppliedByIndex.value.reduce((s, v) => s + Math.max(0, v || 0), 0),
)

const inferFreeDeliverySharesFromDiscounts = (products = localProducts.value) => {
    const budget = freeDeliveryBudgetCap.value
    if (budget <= 0 || products.length === 0) {
        return zeroFreeDeliveryShares(products)
    }

    const discountCaps = products.map((item) => {
        const gross = Math.max(0, item.quantity * item.unitPrice)
        const currentDiscount = Math.max(0, Math.round(item.discount ?? 0))
        return Math.min(gross, currentDiscount)
    })

    return distributeEqualWithCaps(budget, discountCaps)
}

const legacyFreeDeliveryRevertShares = computed(() => {
    if (localFreeDeliveryRequested.value || !showFreeDeliveryCheckbox.value) {
        return zeroFreeDeliveryShares()
    }
    return inferFreeDeliverySharesFromDiscounts()
})

const legacyFreeDeliveryRevertTotal = computed(() =>
    legacyFreeDeliveryRevertShares.value.reduce((sum, value) => sum + Math.max(0, value || 0), 0),
)

const showLegacyFreeDeliveryRevert = computed(() =>
    legacyFreeDeliveryRevertTotal.value > 0 && freeDeliveryBudgetCap.value > 0,
)

const zeroFreeDeliveryShares = (products = localProducts.value) => products.map(() => 0)

const inferAppliedFreeDeliveryShares = (products = localProducts.value) => {
    if (!props.freeDeliveryRequested || !showFreeDeliveryCheckbox.value) {
        return zeroFreeDeliveryShares(products)
    }

    return inferFreeDeliverySharesFromDiscounts(products)
}

const resetLocalProductsFromProps = () => {
    const copy = JSON.parse(JSON.stringify(props.products ?? [])) as OrderDetailItem[]
    localProducts.value = copy
    localFreeDeliveryRequested.value = props.freeDeliveryRequested === true
    freeDeliveryAppliedByIndex.value = inferAppliedFreeDeliveryShares(copy)
    syncDiscountPercentages()
    return copy
}

const existingProductIds = computed(() => {
    return localProducts.value.map(p => p.productId)
})

const applyFreeDeliveryDiscount = (enabled: boolean) => {
    const currentShares = freeDeliveryAppliedByIndex.value
    // Quitar reparto previo
    localProducts.value = localProducts.value.map((item, idx) => {
        const prev = Math.max(0, currentShares[idx] ?? 0)
        const nextDiscount = Math.max(0, (item.discount ?? 0) - prev)
        const nextSubtotal = Math.max(0, item.quantity * item.unitPrice - nextDiscount)
        return { ...item, discount: nextDiscount, subtotal: nextSubtotal }
    })

    if (!enabled || !showFreeDeliveryCheckbox.value) {
        freeDeliveryAppliedByIndex.value = localProducts.value.map(() => 0)
        return
    }

    const budget = freeDeliveryBudgetCap.value
    const caps = localProducts.value.map((item) =>
        lineCapacityCop({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            manualDiscount: item.discount ?? 0,
        }),
    )
    const shares = distributeEqualWithCaps(budget, caps)
    freeDeliveryAppliedByIndex.value = shares
    localProducts.value = localProducts.value.map((item, idx) => {
        const add = shares[idx] ?? 0
        const nextDiscount = (item.discount ?? 0) + add
        const nextSubtotal = Math.max(0, item.quantity * item.unitPrice - nextDiscount)
        return { ...item, discount: nextDiscount, subtotal: nextSubtotal }
    })
}

const onFreeDeliveryCheckboxChange = (e: Event) => {
    if (!props.canEdit) return
    const el = e.target as HTMLInputElement
    localFreeDeliveryRequested.value = el.checked

    // En detalle: permitir cambio inmediato como en sidebar, sin obligar a entrar a "Editar productos".
    if (!editing.value) {
        resetLocalProductsFromProps()
        localFreeDeliveryRequested.value = el.checked
    }
    applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)

    if (!editing.value) {
        const updateDto: UpdateOrderDetailDto[] = localProducts.value.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            notes: item.notes || undefined,
        }))
        emit('save', {
            products: updateDto,
            freeDeliveryRequested: localFreeDeliveryRequested.value,
        })
    }
}

// Métodos
const emitProductsSave = () => {
    const updateDto: UpdateOrderDetailDto[] = localProducts.value.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        notes: item.notes || undefined,
    }))

    emit('save', {
        products: updateDto,
        freeDeliveryRequested: localFreeDeliveryRequested.value,
    })
}

const revertLegacyFreeDelivery = () => {
    if (!props.canEdit || legacyFreeDeliveryRevertTotal.value <= 0) return
    if (!editing.value) {
        resetLocalProductsFromProps()
    }

    const shares = inferFreeDeliverySharesFromDiscounts(localProducts.value)
    localProducts.value = localProducts.value.map((item, idx) => {
        const remove = Math.max(0, shares[idx] ?? 0)
        const nextDiscount = Math.max(0, (item.discount ?? 0) - remove)
        const nextSubtotal = Math.max(0, item.quantity * item.unitPrice - nextDiscount)
        return { ...item, discount: nextDiscount, subtotal: nextSubtotal }
    })
    localFreeDeliveryRequested.value = false
    freeDeliveryAppliedByIndex.value = zeroFreeDeliveryShares()
    syncDiscountPercentages()

    if (!editing.value) {
        emitProductsSave()
    }
}

const recalculateSubtotal = (item: OrderDetailItem, index: number) => {
    const gross = Math.max(0, item.quantity * item.unitPrice)
    item.discount = discountAmountFromPercentage(gross, discountPercentages.value[index]) + (freeDeliveryAppliedByIndex.value[index] ?? 0)
    item.subtotal = Math.max(0, gross - item.discount)
    applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)
}

const updateDiscountPercentage = (item: OrderDetailItem, index: number, value: unknown) => {
    discountPercentages.value[index] = clampDiscountPercentage(value)
    recalculateSubtotal(item, index)
}

const enterEditMode = () => {
    // Hacer copia profunda de los productos
    originalProducts.value = JSON.parse(JSON.stringify(props.products))
    resetLocalProductsFromProps()
    applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)
    editing.value = true
}

const cancelEdit = () => {
    localProducts.value = JSON.parse(JSON.stringify(originalProducts.value))
    localFreeDeliveryRequested.value = props.freeDeliveryRequested === true
    freeDeliveryAppliedByIndex.value = inferAppliedFreeDeliveryShares(localProducts.value)
    syncDiscountPercentages()
    editing.value = false
}

const removeProduct = (index: number) => {
    if (localProducts.value.length === 1) {
        showLastProductWarningModal.value = true
        return
    }
    localProducts.value.splice(index, 1)
    freeDeliveryAppliedByIndex.value.splice(index, 1)
    discountPercentages.value.splice(index, 1)
    applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)
}

const handleCancelOrderRequest = () => {
    showLastProductWarningModal.value = false
    emit('requestCancelOrder')
}

const handleProductAdded = (newProduct: any) => {
    localProducts.value.push({
        id: 0,  // ID 0 indica que es nuevo para el backend
        productId: newProduct.productId,
        productName: newProduct.productName,
        productDescription: newProduct.productDescription,
        quantity: newProduct.quantity,
        unitPrice: newProduct.unitPrice,
        discount: newProduct.discount,
        notes: newProduct.notes,
        subtotal: (newProduct.quantity * newProduct.unitPrice) - newProduct.discount,
        orderId: 0, // Temporal, se asignará en el backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    })

    freeDeliveryAppliedByIndex.value.push(0)
    discountPercentages.value.push(discountPercentageFromAmount(newProduct.quantity * newProduct.unitPrice, newProduct.discount))
    applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)
    showAddProductModal.value = false
}

const saveChanges = async () => {
    if (localProducts.value.length === 0) {
        error('Error', 'El pedido debe tener al menos un producto')
        return
    }

    const updateDto: UpdateOrderDetailDto[] = localProducts.value.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        notes: item.notes || undefined,
    }))

    emit('save', {
        products: updateDto,
        freeDeliveryRequested: localFreeDeliveryRequested.value,
    })
}

/** Sincroniza con el padre cuando llegan datos del API (tras guardar, o carga inicial). Así los id reales y las líneas eliminadas no quedan desfasados en una segunda edición. */
watch(
    () => [props.products, props.freeDeliveryRequested, props.deliveryFee, props.maxFreeDeliveryDiscount],
    () => {
        const list = props.products ?? []
        resetLocalProductsFromProps()
        if (editing.value) {
            originalProducts.value = JSON.parse(JSON.stringify(list)) as OrderDetailItem[]
            applyFreeDeliveryDiscount(localFreeDeliveryRequested.value)
        }
    },
    { deep: true, immediate: true }
)
</script>

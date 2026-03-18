<template>
    <div class="order-sidebar bg-white border-l border-gray-200 h-full flex flex-col min-h-0">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 flex-shrink-0">
            <!-- Order Tabs -->
            <OrderTabs />
        </div>

        <!-- Order Content -->
        <div class="flex-1 overflow-y-auto min-h-0">
            <!-- No Order State -->
            <div v-if="!currentOrder" class="flex items-center justify-center h-full p-6">
                <div class="text-center">
                    <ShoppingCartIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p class="text-gray-500 mb-4">Crea un nuevo pedido para comenzar</p>
                    <BaseButton @click="createNewOrder" variant="primary">
                        <span class="flex items-center">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Crear Nuevo Pedido
                        </span>
                    </BaseButton>
                </div>
            </div>

            <!-- Order Content -->
            <div v-else class="space-y-4 pb-4">
                <!-- Order Items -->
                <div class="px-4">
                    <CustomerSection :selected-customer="getCustomer(currentOrder.customerId)"
                        :selected-address="getAddress(currentOrder.addressId, getCustomer(currentOrder.customerId))"
                        :order-type="currentOrder.type" mode="draft" @view-customer-detail="handleViewCustomerDetail" />

                    <!-- Guest Name / Recipient Name -->
                    <div class="py-3 border-b border-gray-200">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Nombre de quien recibe
                            <span v-if="currentOrder.type === 'delivery' || currentOrder.type === 'reservation'"
                                class="text-red-500">*</span>
                        </label>
                        <BaseInput :model-value="currentOrder.guestName || ''"
                            @update:model-value="(value) => updateGuestName(String(value || ''))"
                            placeholder="Ej: Juan Pérez, María López..." :error="guestNameError" />
                        <p class="text-xs text-gray-500 mt-1">
                            Nombre de quien recibirá el pedido (editable)
                        </p>
                    </div>
                    <!-- "Para más tarde" solo para onsite/delivery -->
                    <div v-if="currentOrder.type !== 'reservation'" class="space-y-2 flex px-4">
                        <label class="block text-sm font-medium text-gray-700 mr-2">Para más tarde?</label>
                        <input type="checkbox" :checked="currentOrder.isLater"
                            @change="(e) => updateIsLater((e.target as HTMLInputElement).checked)"
                            class="form-checkbox h-5 w-5 text-blue-600">
                    </div>
                    <!-- Hora de preparación/entrega para onsite y delivery (mismo día) -->
                    <div class="py-3 border-b border-gray-200 space-y-4"
                        v-if="currentOrder.type !== 'reservation' && currentOrder.isLater">
                        <label class="block text-sm font-medium text-gray-700">Hora preparación</label>
                        <VueDatePicker v-model="prepareAtLocal" time-picker placeholder="Hora preparación"
                            @update:model-value="onPrepareAtInput" />
                        <label class="block text-sm font-medium text-gray-700">Hora entrega</label>
                        <VueDatePicker v-model="reservedForLocal" time-picker placeholder="Hora entrega"
                            @update:model-value="onReservedForInput" />
                    </div>
                    <!-- Fecha y hora para reservas (otro día, siempre visible) -->
                    <div class="py-3 border-b border-gray-200 space-y-4" v-if="currentOrder.type === 'reservation'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha/hora preparación <span
                                    class="text-gray-400 font-normal">(opcional)</span></label>
                            <VueDatePicker v-model="prepareAtDateLocal" placeholder="Cuándo empezar a preparar"
                                :min-date="new Date()" @update:model-value="onPrepareAtDateInput" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha/hora del evento <span
                                    class="text-red-500">*</span></label>
                            <VueDatePicker v-model="reservedForDateLocal" placeholder="Cuándo se entrega/sirve"
                                :min-date="new Date()" @update:model-value="onReservedForDateInput" />
                        </div>
                    </div>

                    <OrderItemList :tab-id="currentTabId || ''" @add-products="handleAddProducts" />
                    <PaymentSelector :order="currentOrder" @payment-updated="handlePaymentUpdated" />
                </div>

                <!-- Order Actions -->
                <div class="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-3">
                    <!-- Order Notes -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700">Notas del Pedido</label>
                        <BaseInput :model-value="currentOrder.notes || ''"
                            @update:model-value="(value) => updateOrderNotes(String(value || ''))"
                            placeholder="Agregar notas especiales..." type="textarea" rows="2" />
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <BaseButton @click="handleSubmitOrder" variant="primary" size="sm" class="w-full"
                            :disabled="!canSubmitOrder" :title="submitButtonTooltip">
                            <span class="flex items-center justify-center">
                                <PaperAirplaneIcon class="w-4 h-4 mr-2" />
                                Enviar Pedido
                            </span>
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- Customer Detail Modal -->
        <CustomerDetailModal v-if="selectedCustomer" :show="showCustomerDetail" :customer="selectedCustomer"
            @close="closeCustomerDetail" @customer-updated="handleCustomerUpdated" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOrderPersistence } from '@/composables/useOrderPersistence'
import { useOrderValidation } from '@/composables/useOrderValidation'
import { useOrderTabs } from '@/composables/useOrderTabs'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

import { useToast } from '@/composables/useToast'
import type { Customer, CustomerAddress } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import OrderTabs from '@/components/orders/OrderTabs.vue'
import OrderItemList from '@/components/orders/OrderItemList.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'
import PaymentSelector from '@/components/payments/PaymentSelector.vue'

// Icons
import {
    ShoppingCartIcon,
    PlusIcon,
    PaperAirplaneIcon
} from '@heroicons/vue/24/outline'
import type { LocalHour } from '@/types/common'
import { DateTimeService } from '@/services/domain/DateTimeService'




// Composables
const { ordersStore } = useOrderPersistence()
const { createNewTab, closeTab } = useOrderTabs()
const { submitOrder } = useOrderSubmission()
const { success, error: showError } = useToast()

// State
const showCustomerDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)
// onsite / delivery: time-picker (solo hora, mismo día)
const prepareAtLocal = ref<LocalHour | null>(null)
const reservedForLocal = ref<LocalHour | null>(null)
// reservation: datepicker completo (fecha + hora, otro día)
const prepareAtDateLocal = ref<Date | null>(null)
const reservedForDateLocal = ref<Date | null>(null)

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const currentTabId = computed(() => ordersStore.currentTabId)
const { canSubmitOrder, orderErrors } = useOrderValidation(currentOrder.value || undefined)

const guestNameError = computed(() => {
    if (!currentOrder.value) return ''
    // Required for delivery and reservation orders
    const requiresGuestName = currentOrder.value.type === 'delivery' || currentOrder.value.type === 'reservation'
    if (requiresGuestName && !currentOrder.value.guestName?.trim()) {
        return 'El nombre de quien recibe es obligatorio para este tipo de pedido'
    }
    return ''
})

const submitButtonTooltip = computed(() => {
    if (!currentOrder.value) {
        return 'No hay pedido activo'
    }

    if (canSubmitOrder.value) {
        return 'Enviar pedido al sistema'
    }

    // Show what's missing
    const errors = orderErrors.value
    if (errors.length === 0) {
        return 'Completando validaciones...'
    }

    if (errors.length === 1) {
        return `Falta: ${errors[0]}`
    }

    return `Faltan ${errors.length} requisitos (click para ver detalles)`
})

const onPrepareAtInput = (time: LocalHour | undefined) => {
    if (!time) {
        reservedForLocal.value = null
        if (currentTabId.value) ordersStore.updatePrepareAt(null)
        return
    }
    reservedForLocal.value = { hours: time.hours + 1, minutes: time.minutes, seconds: time.seconds }
    const prepareDate = DateTimeService.localHourToDate(time)
    const reserveDate = DateTimeService.localHourToDate(reservedForLocal.value)
    if (currentTabId.value) {
        ordersStore.updatePrepareAt(prepareDate)
        ordersStore.updateReservedFor(reserveDate)
    }
}

const onReservedForInput = (time: LocalHour | undefined) => {
    if (!time || !currentTabId.value) return
    const date = DateTimeService.localHourToDate(time)
    ordersStore.updateReservedFor(date)
}

// Handlers para reservas (fecha + hora completa)
const onPrepareAtDateInput = (date: Date | null) => {
    if (!currentTabId.value) return
    ordersStore.updatePrepareAt(date ?? null)
    if (date) {
        const oneHourLater = new Date(date.getTime() + 60 * 60 * 1000)
        reservedForDateLocal.value = oneHourLater
        ordersStore.updateReservedFor(oneHourLater)
    }
}

const onReservedForDateInput = (date: Date | null) => {
    if (!currentTabId.value) return
    ordersStore.updateReservedFor(date ?? null)
}






// Methods
const createNewOrder = () => {
    createNewTab()
}

const getCustomer = (customerId: number | null) => {
    if (!customerId) return null
    // Buscar en ordersStore.customers que tiene las direcciones completas
    return ordersStore.customers.find((c: Customer) => c.id === customerId) || null
}

const getAddress = (addressId: number | null, customer: Customer | null) => {
    if (!addressId || !customer) return null
    return customer.addresses?.find((a: CustomerAddress) => a.id === addressId) || null
}

// CustomerSelection y AddressSelection ahora se manejan internamente en CustomerSection (modo 'draft')

const handlePaymentUpdated = () => {
    // Payment updated, totals recalculate automatically
    console.log('Payment updated')
}

const handleViewCustomerDetail = (customer: any) => {
    console.log('handleViewCustomerDetail', customer)
    selectedCustomer.value = customer
    showCustomerDetail.value = true
}

const closeCustomerDetail = () => {
    showCustomerDetail.value = false
    selectedCustomer.value = null
}

const handleCustomerUpdated = (customer: any) => {
    // Customer updated, refresh if needed
    console.log('Customer updated:', customer)
}

const updateOrderNotes = (notes: string) => {
    if (!currentTabId.value) return
    ordersStore.updateOrderNotes(notes)
}

const updateGuestName = (name: string) => {
    if (!currentTabId.value) return
    ordersStore.updateGuestName(name)
}

const updateIsLater = (value: boolean) => {
    if (!currentTabId.value) return
    ordersStore.updateIsLater(value)
}

const handleAddProducts = () => {
    // This would focus on the product grid or open a product selector
    console.log('Add products from grid')
}

const handleSubmitOrder = async () => {
    // Show errors if not valid
    if (!canSubmitOrder.value) {
        if (orderErrors.value.length > 0) {
            showError(
                'No se puede enviar el pedido',
                orderErrors.value.length === 1
                    ? orderErrors.value[0]
                    : `${orderErrors.value.length} requisitos faltantes`
            )

            // Show individual errors if multiple
            if (orderErrors.value.length > 1) {
                orderErrors.value.slice(0, 3).forEach((error, index) => {
                    setTimeout(() => {
                        showError('Requisito', error)
                    }, (index + 1) * 600)
                })
            }
        }
        return
    }

    // If valid, submit
    if (!currentOrder.value) return

    const tabToClose = currentTabId.value
    try {
        if (currentOrder.value.type === 'reservation') {
            // reservedFor es obligatorio (ya validado), prepareAt es opcional
            if (reservedForDateLocal.value) {
                currentOrder.value.reservedFor = reservedForDateLocal.value
            }
            if (prepareAtDateLocal.value) {
                currentOrder.value.prepareAt = prepareAtDateLocal.value
            }
        } else if (currentOrder.value.isLater) {
            if (!prepareAtLocal.value || !reservedForLocal.value) return
            currentOrder.value.prepareAt = DateTimeService.localHourToDate(prepareAtLocal.value)
            currentOrder.value.reservedFor = DateTimeService.localHourToDate(reservedForLocal.value)
        }
        await submitOrder(currentOrder.value)

        // Close the current tab and clean up
        if (tabToClose) {
            closeTab(tabToClose)
        }

        success(
            'Pedido creado exitosamente',
            3000
        )
    } catch (error: any) {
        console.error('Error submitting order:', error)
        showError(
            'Error al crear pedido',
            error?.message || ordersStore.error || 'No se pudo crear el pedido. Intenta nuevamente.'
        )
    }
}



// Watchers
watch(currentOrder, () => {
    // Ya no necesitamos actualizar refs locales, las props se actualizan automáticamente desde el store
    showCustomerDetail.value = false
}, { immediate: false })

// Sincronizar refs de fecha al cambiar de tab
watch(
    () => currentTabId.value,
    () => {
        const order = currentOrder.value
        if (!order) {
            prepareAtLocal.value = null
            reservedForLocal.value = null
            prepareAtDateLocal.value = null
            reservedForDateLocal.value = null
            return
        }
        if (order.type === 'reservation') {
            prepareAtDateLocal.value = order.prepareAt
                ? (order.prepareAt instanceof Date ? order.prepareAt : new Date(order.prepareAt))
                : null
            reservedForDateLocal.value = order.reservedFor
                ? (order.reservedFor instanceof Date ? order.reservedFor : new Date(order.reservedFor))
                : null
            prepareAtLocal.value = null
            reservedForLocal.value = null
        } else {
            if (order.prepareAt) {
                const d = order.prepareAt instanceof Date ? order.prepareAt : new Date(order.prepareAt)
                prepareAtLocal.value = DateTimeService.dateToLocalHour(d)
            } else {
                prepareAtLocal.value = null
            }
            if (order.reservedFor) {
                const d = order.reservedFor instanceof Date ? order.reservedFor : new Date(order.reservedFor)
                reservedForLocal.value = DateTimeService.dateToLocalHour(d)
            } else {
                reservedForLocal.value = null
            }
            prepareAtDateLocal.value = null
            reservedForDateLocal.value = null
        }
    },
    { immediate: true }
)

// Valores por defecto: día actual cuando cambia tipo o pestaña (onsite/delivery/reservation)
watch(
    () => [currentOrder.value?.type, currentTabId.value] as const,
    () => {
        if (!currentTabId.value) return
        const type = currentOrder.value?.type
        if (!type || (type !== 'onsite' && type !== 'delivery' && type !== 'reservation')) return
    },
    { immediate: true }
)
</script>

<style scoped>
.order-sidebar {
    min-width: 400px;
    max-width: 500px;
}

@media (max-width: 1024px) {
    .order-sidebar {
        min-width: 350px;
        max-width: 400px;
    }
}

@media (max-width: 768px) {
    .order-sidebar {
        min-width: 100%;
        max-width: 100%;
    }
}
</style>

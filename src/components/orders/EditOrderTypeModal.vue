<template>
    <BaseDialog :model-value="open" title="Cambiar Tipo de Pedido"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-4">
            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-sm text-gray-600">
                    Pedido <span class="font-medium text-gray-900">#{{ order.id }}</span>
                </div>
                <div class="mt-1 text-xs text-gray-500">
                    {{ order.typeDisplayName }} - {{ order.statusDisplayName }}
                </div>
            </div>

            <!-- Selector de tipo -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Tipo de pedido</label>
                <BaseRadioGroup v-model="selectedType" :options="orderTypeOptions" name="order-type" size="sm" />
            </div>

            <!-- Fecha de entrega y preparación (solo si tipo === 'reservation') -->
            <div v-if="selectedType === 'reservation'" class="space-y-4">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">
                        Tener listo a esta hora (entrega)
                        <span class="text-red-500">*</span>
                    </label>
                    <VueDatePicker
                        :model-value="reservedForDate"
                        placeholder="Fecha y hora de entrega"
                        :min-date="new Date()"
                        auto-apply
                        class="w-full"
                        @update:model-value="onReservedForPicker"
                    />
                    <p class="text-xs text-gray-500">
                        Fecha y hora en que el pedido debe estar listo para el cliente
                    </p>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">
                        Preparar a esta hora
                    </label>
                    <VueDatePicker
                        v-model="prepareAtDate"
                        placeholder="Cuándo aparece en cocina"
                        :min-date="new Date()"
                        auto-apply
                        class="w-full"
                    />
                    <p class="text-xs text-gray-500">
                        Hora en que debe aparecer en cocina (por defecto 1h antes de la entrega)
                    </p>
                </div>
            </div>

            <!-- Advertencias según tipo seleccionado -->
            <div v-if="validationWarning" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-blue-800">{{ validationWarning }}</p>
                        <p class="mt-1 text-xs text-blue-600">
                            Te guiaremos paso a paso para completar la información necesaria.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
                {{ validationWarning ? 'Continuar' : 'Guardar cambios' }}
            </BaseButton>
        </template>
    </BaseDialog>

    <BaseDialog v-model="showKitchenReservationWarn" title="Pedido en cocina" size="md">
        <p class="text-sm text-gray-700">
            Este pedido está en cocina (tomado o en preparación). Cambiar a reserva o sus fechas puede hacer que salga
            de la cola y se avisará en cocina. ¿Continuar?
        </p>
        <template #footer>
            <BaseButton variant="secondary" @click="showKitchenReservationWarn = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="saving" @click="confirmKitchenReservationSave">Continuar</BaseButton>
        </template>
    </BaseDialog>
    <BaseDialog v-model="showReservationAssociationsConfirm" title="Modificar reserva" size="sm">
        <p class="text-sm text-gray-600">
            Esta reserva tiene abonos y/o transferencias asociadas. Al confirmar tambiÃ©n se eliminarÃ¡n las
            transferencias y abonos asociados.
        </p>
        <template #footer>
            <BaseButton variant="secondary" :disabled="saving" @click="showReservationAssociationsConfirm = false">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" class="bg-red-600 hover:bg-red-700" :loading="saving"
                @click="confirmReservationAssociationsSave">
                Confirmar
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderListItem, OrderDetailView, Order } from '@/types/order'
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { toPaymentSnapshot, type OrderPaymentSnapshot } from '@/utils/orderPaymentCoverage'

interface Props {
    open: boolean
    order: OrderListItem | OrderDetailView
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order, paymentSnapshotBefore?: OrderPaymentSnapshot]
    'type-changed-pending': [newType: 'onsite' | 'delivery' | 'reservation']
    'reservation-associated-delete-confirmed': []
    'open-customer-modal': []
}>()

const { success, error } = useToast()
const ordersStore = useOrdersDataStore()

const saving = ref(false)
const selectedType = ref<'onsite' | 'delivery' | 'reservation'>(props.order.type)
const reservedForDate = ref<Date | null>(null)
const prepareAtDate = ref<Date | null>(null)
const showKitchenReservationWarn = ref(false)
const showReservationAssociationsConfirm = ref(false)
const pendingDeleteReservationAssociations = ref(false)

function datesCloseEqual(a: Date | null, b: Date | null): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return Math.abs(a.getTime() - b.getTime()) < 1000
}

function onReservedForPicker(value: Date | null) {
    reservedForDate.value = value
    if (value) {
        const pa = new Date(value)
        pa.setHours(pa.getHours() - 1)
        prepareAtDate.value = pa
    }
}

const orderTypeOptions = [
    { value: 'onsite', label: 'En el Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

const canSave = computed(() => {
    if (selectedType.value !== props.order.type) return true
    if (selectedType.value === 'reservation') {
        const curRf = props.order.reservedFor ? new Date(props.order.reservedFor) : null
        const curPa = (props.order as OrderDetailView).prepareAt
            ? new Date((props.order as OrderDetailView).prepareAt as Date | string)
            : null
        return !datesCloseEqual(reservedForDate.value, curRf) || !datesCloseEqual(prepareAtDate.value, curPa)
    }
    return false
})

const validationWarning = computed(() => {
    if (selectedType.value === 'delivery') {
        const missingFields = []
        if (!props.order.customerId) missingFields.push('cliente')
        if (!props.order.addressId) missingFields.push('dirección')
        if (!props.order.guestName) missingFields.push('nombre de quien recibe')

        if (missingFields.length > 0) {
            return `Para cambiar a Domicilio, necesitarás completar: ${missingFields.join(', ')}`
        }
    }

    if (selectedType.value === 'reservation') {
        const missingFields = []
        if (!props.order.guestName) missingFields.push('nombre de quien recibe')
        if (!reservedForDate.value) missingFields.push('fecha de reserva')

        if (missingFields.length > 0) {
            return `Para cambiar a Reserva, necesitarás completar: ${missingFields.join(', ')}`
        }
    }

    return ''
})

const hasReservationAssociatedPayments = computed(() =>
    props.order.type === 'reservation' &&
    ((props.order.reservationDeposits?.length ?? 0) > 0 || (props.order.bankPayments?.length ?? 0) > 0)
)

watch(selectedType, (newType) => {
    if (newType !== 'reservation') {
        reservedForDate.value = null
    } else if (props.order.reservedFor) {
        reservedForDate.value = new Date(props.order.reservedFor)
        if ((props.order as OrderDetailView).prepareAt) {
            prepareAtDate.value = new Date((props.order as OrderDetailView).prepareAt as Date | string)
        } else {
            const pa = new Date(props.order.reservedFor)
            pa.setHours(pa.getHours() - 1)
            prepareAtDate.value = pa
        }
    }
})

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            selectedType.value = props.order.type
            if (props.order.type === 'reservation' && props.order.reservedFor) {
                reservedForDate.value = new Date(props.order.reservedFor)
                if ((props.order as OrderDetailView).prepareAt) {
                    prepareAtDate.value = new Date((props.order as OrderDetailView).prepareAt as Date | string)
                } else {
                    const pa = new Date(props.order.reservedFor)
                    pa.setHours(pa.getHours() - 1)
                    prepareAtDate.value = pa
                }
            } else {
                reservedForDate.value = null
                prepareAtDate.value = null
            }
        }
    },
    { immediate: true },
)

async function persistTypeChange(deleteReservationAssociatedPayments = false) {
    const updateData: Record<string, unknown> = {
        type: selectedType.value,
    }

    if (selectedType.value === 'reservation' && reservedForDate.value) {
        updateData.reservedFor = reservedForDate.value
        if (prepareAtDate.value) {
            updateData.prepareAt = prepareAtDate.value
        }
    } else if (props.order.type === 'reservation' && selectedType.value !== 'reservation') {
        if (props.order.reservedFor) {
            updateData.reservedFor = new Date(props.order.reservedFor)
        }
        if (props.order.prepareAt) {
            updateData.prepareAt = new Date(props.order.prepareAt)
        }
    }

    if (props.order.type === 'delivery' && selectedType.value !== 'delivery') {
        updateData.deliveryFee = null
    }

    if (selectedType.value === 'onsite') {
        updateData.addressId = null
    }

    if (deleteReservationAssociatedPayments) {
        updateData.deleteReservationAssociatedPayments = true
    }

    const paymentSnapshotBefore = toPaymentSnapshot(props.order)
    const updatedOrder = await ordersStore.update(props.order.id, updateData as any)

    success('Tipo de pedido actualizado', 5000)
    emit('updated', updatedOrder, paymentSnapshotBefore)
    emit('close')
}

async function confirmKitchenReservationSave() {
    showKitchenReservationWarn.value = false
    saving.value = true
    try {
        await persistTypeChange(pendingDeleteReservationAssociations.value)
    } catch (err: any) {
        error('Error al actualizar tipo', err.message)
    } finally {
        saving.value = false
        pendingDeleteReservationAssociations.value = false
    }
}

async function confirmReservationAssociationsSave() {
    showReservationAssociationsConfirm.value = false
    pendingDeleteReservationAssociations.value = true
    emit('reservation-associated-delete-confirmed')
    await continueSaveAfterAssociationConfirmation()
}

async function continueSaveAfterAssociationConfirmation() {
    const needsCustomerSetup =
        selectedType.value === 'delivery' &&
        (!props.order.customerId || !props.order.addressId || !props.order.guestName)

    const needsReservationSetup =
        selectedType.value === 'reservation' && (!props.order.guestName || !reservedForDate.value)

    if (needsCustomerSetup || needsReservationSetup) {
        emit('type-changed-pending', selectedType.value)
        emit('open-customer-modal')
        emit('close')
        return
    }

    const inKitchen = props.order.status === 'taken' || props.order.status === 'in_preparation'
    if (inKitchen && selectedType.value === 'reservation') {
        showKitchenReservationWarn.value = true
        return
    }

    saving.value = true
    try {
        await persistTypeChange(pendingDeleteReservationAssociations.value)
    } catch (err: any) {
        error('Error al actualizar tipo', err.message)
    } finally {
        saving.value = false
        pendingDeleteReservationAssociations.value = false
    }
}

const handleSave = async () => {
    saving.value = true
    try {
        if (!pendingDeleteReservationAssociations.value && hasReservationAssociatedPayments.value) {
            saving.value = false
            showReservationAssociationsConfirm.value = true
            return
        }

        const needsCustomerSetup =
            selectedType.value === 'delivery' &&
            (!props.order.customerId || !props.order.addressId || !props.order.guestName)

        const needsReservationSetup =
            selectedType.value === 'reservation' && (!props.order.guestName || !reservedForDate.value)

        if (needsCustomerSetup || needsReservationSetup) {
            if (pendingDeleteReservationAssociations.value) {
                emit('reservation-associated-delete-confirmed')
            }
            emit('type-changed-pending', selectedType.value)
            emit('open-customer-modal')
            emit('close')
            return
        }

        const inKitchen = props.order.status === 'taken' || props.order.status === 'in_preparation'
        if (inKitchen && selectedType.value === 'reservation') {
            showKitchenReservationWarn.value = true
            return
        }

        await persistTypeChange(pendingDeleteReservationAssociations.value)
    } catch (err: any) {
        error('Error al actualizar tipo', err.message)
    } finally {
        saving.value = false
        pendingDeleteReservationAssociations.value = false
    }
}
</script>

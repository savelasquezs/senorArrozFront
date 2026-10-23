<template>
    <div class="customer-section" :class="{ 'customer-section--compact': compact }">
        <!-- Order Type Selector - CONDICIONAL -->
        <div v-if="showTypeSelector" class="space-y-2">

            <div v-if="compact" class="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1" role="radiogroup" aria-label="Tipo de pedido">
                <label v-for="option in orderTypeOptions" :key="option.value" class="relative min-w-0 cursor-pointer">
                    <input type="radio" :name="typeInputName" :value="option.value" :checked="orderType === option.value" class="peer sr-only"
                        @change="handleOrderTypeChanged(option.value)" />
                    <span class="flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-500 transition peer-checked:bg-white peer-checked:text-emerald-700 peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600 hover:text-gray-900">
                        <component :is="option.icon" class="h-4 w-4 shrink-0" />{{ option.label }}
                    </span>
                </label>
            </div>
            <BaseRadioGroup v-else :model-value="orderType" :options="orderTypeOptions" name="order-type"
                @update:model-value="(value) => handleOrderTypeChanged(value as 'onsite' | 'delivery' | 'reservation')"
                size="sm" />
        </div>
        <div v-if="compact" class="flex min-w-0 items-start gap-2">
            <div class="min-w-0 flex-1"><slot name="order-branch-selector" /></div>
            <span v-if="compactLoyaltySummary" class="mt-1.5 max-w-[48%] shrink-0 truncate text-right text-[11px] text-amber-700"
                :class="{ 'font-semibold': loyaltyRewardDue }"
                :title="props.selectedCustomer?.loyaltyNextRewardMessage || compactLoyaltySummary">{{ compactLoyaltySummary }}</span>
        </div>
        <slot v-else name="order-branch-selector" />
        <!-- No Customer Selected -->
        <div v-if="!props.selectedCustomer" class="space-y-3">


            <CustomerSelector :required="orderType === 'delivery'"
                :initial-address-branch-id="props.mode === 'draft' ? props.operationBranchId : undefined"
                :for-order-address="props.mode === 'draft'"
                :allow-address-branch-selection="props.mode !== 'draft'"
                @customer-selected="handleCustomerSelected" />
        </div>

        <!-- Customer Selected -->
        <div v-else :class="compact ? 'space-y-2' : 'space-y-3'">
            <!-- Customer Info -->
            <div class="border border-green-200 rounded-lg" :class="compact ? 'bg-emerald-50/50 px-2.5 py-2' : 'bg-green-50 p-3'">
                <div class="flex min-w-0 items-center gap-2">
                    <BaseButton @click="handleClearCustomer" variant="ghost" size="sm" icon-only class="text-gray-600"
                        aria-label="Cambiar cliente" title="Cambiar cliente">
                        <ArrowPathIcon class="h-4 w-4 shrink-0" />
                    </BaseButton>
                    <button type="button" class="min-w-0 flex-1 truncate text-left text-sm font-semibold capitalize text-emerald-900 underline-offset-2 hover:underline focus-visible:outline-emerald-600"
                        :title="`Ver detalle de ${props.selectedCustomer.name}`" :aria-label="`Ver cliente ${props.selectedCustomer.name}`"
                        @click="$emit('view-customer-detail', props.selectedCustomer)">{{ props.selectedCustomer.name }}</button>
                    <div class="flex shrink-0 items-center gap-2">
                        <PhoneNumberItem v-if="props.selectedCustomer.phone1" :phone-number="props.selectedCustomer.phone1" compact actions-on-hover :show-icon="false" />
                        <PhoneNumberItem v-if="props.selectedCustomer.phone2" :phone-number="props.selectedCustomer.phone2" compact actions-on-hover :show-icon="false" />
                    </div>
                </div>
                <p v-if="props.selectedCustomer.whatsAppUsername" class="mt-0.5 truncate pl-10 text-xs text-emerald-700">{{ props.selectedCustomer.whatsAppUsername }}</p>
            </div>

            <div v-if="!compact && loyaltyRewardDue"
                class="relative overflow-hidden rounded-lg border border-amber-300 bg-amber-50 text-amber-950" :class="compact ? 'px-2.5 py-2' : 'px-3 py-3 shadow-sm'">
                <div v-if="!compact" class="absolute right-2 top-2 text-amber-200">
                    <SparklesIcon class="h-10 w-10" />
                </div>
                <div class="relative flex items-start gap-3">
                    <div class="flex shrink-0 items-center justify-center rounded-full bg-amber-500 text-white" :class="compact ? 'h-7 w-7' : 'h-10 w-10 shadow-sm'">
                        <GiftIcon :class="compact ? 'h-4 w-4' : 'h-6 w-6'" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold uppercase text-amber-700">Regalo disponible en este pedido</p>
                        <p class="font-semibold leading-tight text-amber-950" :class="compact ? 'text-sm' : 'mt-1 text-base'">
                            {{ props.selectedCustomer.loyaltyNextRewardLabel || 'Premio de fidelidad' }}
                        </p>
                        <p v-if="!compact" class="mt-1 text-xs font-medium text-amber-800">
                            Este cliente ya tiene {{ props.selectedCustomer.loyaltyDeliveredCount || 0 }} pedido(s) entregado(s). Aplica el regalo antes de cobrar.
                        </p>
                    </div>
                </div>
            </div>

            <div v-else-if="!compact && props.selectedCustomer.loyaltyNextRewardMessage"
                class="rounded-lg border border-amber-200 bg-amber-50 text-amber-950" :class="compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'" :title="props.selectedCustomer.loyaltyNextRewardMessage">
                {{ compact && props.selectedCustomer.loyaltyDeliveriesUntilNextReward != null ? `Fidelidad · faltan ${props.selectedCustomer.loyaltyDeliveriesUntilNextReward} entregas · ${props.selectedCustomer.loyaltyNextRewardLabel || 'próximo premio'}` : props.selectedCustomer.loyaltyNextRewardMessage }}
            </div>

            <!-- Address Selection (for delivery and reservation) -->
            <div v-if="orderType === 'delivery' || orderType === 'reservation'" class="space-y-2">
                <div v-if="!compact" class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">
                        Dirección
                        <span v-if="orderType === 'delivery'" class="text-red-500">*</span>
                        <span v-else class="text-gray-400 font-normal text-xs"> (opcional)</span>
                    </span>
                </div>
                <AddressSelector :customer-id="props.selectedCustomer.id"
                    :branch-id="props.selectedCustomer.branchId" :operation-branch-id="props.operationBranchId"
                    :selected-address="props.selectedAddress?.id || undefined" :mode="props.mode" :compact="compact"
                    @address-selected="handleAddressSelected" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { Customer, CustomerAddress } from '@/types/customer'

// Stores y composables (condicionales según modo)
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue'
import CustomerSelector from '@/components/customers/CustomerSelector.vue'
import AddressSelector from '@/components/customers/address/AddressSelector.vue'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'

// Icons
import {
    GiftIcon,
    SparklesIcon,
    ArrowPathIcon, BuildingStorefrontIcon, TruckIcon, CalendarDaysIcon
} from '@heroicons/vue/24/outline'


interface Props {
    orderType: 'onsite' | 'delivery' | 'reservation'
    selectedCustomer?: Customer | null
    selectedAddress?: CustomerAddress | null
    mode?: 'draft' | 'persisted'
    showTypeSelector?: boolean
    operationBranchId?: number
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    selectedCustomer: null,
    selectedAddress: null,
    mode: 'draft',
    showTypeSelector: true
})

const emit = defineEmits<{
    'customer-selected': [customer: Customer | null]
    'address-selected': [address: CustomerAddress | null]
    'view-customer-detail': [customer: Customer]
    'order-type-changed': [type: 'onsite' | 'delivery' | 'reservation']
}>()

// Stores y composables (solo para modo 'draft')
let ordersDraftsStore: ReturnType<typeof useOrdersDraftsStore> | null = null
let updateOrderType: ((type: any) => void) | null = null

if (props.mode === 'draft') {
    ordersDraftsStore = useOrdersDraftsStore()
    const orderTabs = useOrderTabs()
    updateOrderType = orderTabs.updateOrderType
}



const typeInputName = `order-type-${useId()}`

// Options for order type selector
const orderTypeOptions = [
    { value: 'onsite' as const, label: 'En el local', icon: BuildingStorefrontIcon },
    { value: 'delivery' as const, label: 'Domicilio', icon: TruckIcon },
    { value: 'reservation' as const, label: 'Reserva', icon: CalendarDaysIcon },
]

const loyaltyRewardDue = computed(() =>
    props.selectedCustomer?.loyaltyRewardDueOnCurrentOrder === true ||
    props.selectedCustomer?.loyaltyDeliveriesUntilNextReward === 1,
)

const compactLoyaltySummary = computed(() => {
    const customer = props.selectedCustomer
    if (!customer) return ''
    const reward = (customer.loyaltyNextRewardLabel || 'próximo premio').replace(/descuento/gi, 'dcto')
    if (loyaltyRewardDue.value) return `Hoy → ${reward}`
    if (!customer.loyaltyNextRewardMessage) return ''
    const remaining = customer.loyaltyDeliveriesUntilNextReward
    return remaining != null ? `${remaining} ${remaining === 1 ? 'entrega más' : 'entregas más'} → ${reward}` : customer.loyaltyNextRewardMessage
})

// Methods
const handleCustomerSelected = async (customer: Customer, addressServiceBranchId?: number, createdAddressId?: number) => {
    if (props.mode === 'draft') {
        // Asegurar que el cliente esté en la lista del store (p. ej. recién creado) para que getCustomer lo encuentre
        if (customer) {
            ordersDraftsStore!.ensureCustomerInList(customer)
        }
        // Lógica de OrderSidebar (pedidos en creación)
        ordersDraftsStore!.updateCustomer(customer)

        // Auto-completar guestName
        if (customer && customer.name) {
            const currentOrder = ordersDraftsStore!.currentOrder
            const currentGuestName = currentOrder?.guestName
            if (!currentGuestName || currentGuestName.trim() === '') {
                ordersDraftsStore!.updateGuestName(customer.name)
            }
        } else if (!customer) {
            ordersDraftsStore!.updateGuestName('')
        }

        const createdAddress = addressServiceBranchId
            ? customer.addresses?.find(address => address.id === createdAddressId)
                ?? customer.addresses?.find(address =>
                    address.branchServices?.some(service => service.branchId === addressServiceBranchId && service.isCovered),
                )
            : null
        if (createdAddress && addressServiceBranchId) {
            if (ordersDraftsStore!.currentOrder?.branchId !== addressServiceBranchId) {
                const changed = await ordersDraftsStore!.changeOperationalBranch(addressServiceBranchId, createdAddress)
                if (!changed) return
            }
            ordersDraftsStore!.updateAddress(createdAddress)
        } else {
            ordersDraftsStore!.updateAddress(null)
        }
    } else {
        // Modo 'persisted' - emitir evento para que el modal maneje
        emit('customer-selected', customer || null)

        // Auto-selección de dirección (el modal también necesita esto)
        if (customer && customer.addresses && customer.addresses.length > 0) {
            const primaryAddress = customer.addresses.find(a => a.isPrimary)
            const addressToSelect = primaryAddress || customer.addresses[0]
            emit('address-selected', addressToSelect)
        } else {
            emit('address-selected', null)
        }
    }
}

const handleAddressSelected = (address: CustomerAddress | undefined) => {
    if (props.mode === 'draft') {
        if (address && props.selectedCustomer) {
            ordersDraftsStore!.addAddressToCustomer(
                props.selectedCustomer.id,
                address,
                props.selectedCustomer,
            )
        }
        ordersDraftsStore!.updateAddress(address || null)
    } else {
        emit('address-selected', address || null)
    }
}

const handleClearCustomer = () => {
    if (props.mode === 'draft') {
        ordersDraftsStore!.updateCustomer(null)
        ordersDraftsStore!.updateAddress(null)
        ordersDraftsStore!.updateGuestName('')
    } else {
        emit('customer-selected', null)
        emit('address-selected', null)
    }
}

// Handler para cambios de tipo de pedido
const handleOrderTypeChanged = (type: 'onsite' | 'delivery' | 'reservation') => {
    if (props.mode === 'draft') {
        updateOrderType!(type)
    } else {
        emit('order-type-changed', type)
    }
}
</script>

<style scoped>
.customer-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.customer-section--compact { gap: 0.5rem; }
</style>

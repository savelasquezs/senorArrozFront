<template>
    <div class="customer-section">
        <!-- Order Type Selector - CONDICIONAL -->
        <div v-if="showTypeSelector" class="space-y-2">

            <BaseRadioGroup :model-value="orderType" :options="orderTypeOptions" name="order-type"
                @update:model-value="(value) => handleOrderTypeChanged(value as 'onsite' | 'delivery' | 'reservation')"
                size="sm" />
        </div>
        <!-- No Customer Selected -->
        <div v-if="!props.selectedCustomer" class="space-y-3">


            <CustomerSelector :required="orderType === 'delivery'" @customer-selected="handleCustomerSelected" />
        </div>

        <!-- Customer Selected -->
        <div v-else class="space-y-3">
            <!-- Customer Info -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-medium text-green-900 capitalize">{{ props.selectedCustomer.name }}</h4>
                            <div class="flex items-center gap-1">
                                <BaseButton @click="$emit('view-customer-detail', props.selectedCustomer)"
                                    variant="ghost" size="sm">
                                    <EyeIcon class="w-4 h-4" />
                                </BaseButton>
                                <BaseButton @click="handleClearCustomer" variant="ghost" size="sm">
                                    <ArrowPathIcon class="w-4 h-4" />
                                </BaseButton>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <PhoneNumberItem :phone-number="props.selectedCustomer.phone1" />
                            <PhoneNumberItem v-if="props.selectedCustomer.phone2"
                                :phone-number="props.selectedCustomer.phone2" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Address Selection (for delivery) -->
            <div v-if="orderType === 'delivery' || orderType === 'reservation'" class="space-y-2">
                <AddressSelector :customer-id="props.selectedCustomer.id"
                    :selected-address="props.selectedAddress?.id || undefined"
                    @address-selected="handleAddressSelected" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
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
    EyeIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline'


interface Props {
    orderType: 'onsite' | 'delivery' | 'reservation'
    selectedCustomer?: Customer | null
    selectedAddress?: CustomerAddress | null
    mode?: 'draft' | 'persisted'
    showTypeSelector?: boolean
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



// Options for order type selector
const orderTypeOptions = [
    { value: 'onsite', label: 'En el Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

// Methods
const handleCustomerSelected = (customer: Customer) => {
    if (props.mode === 'draft') {
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

        // Auto-selección de dirección
        if (customer && customer.addresses && customer.addresses.length > 0) {
            const primaryAddress = customer.addresses.find(a => a.isPrimary)
            const addressToSelect = primaryAddress || customer.addresses[0]
            ordersDraftsStore!.updateAddress(addressToSelect)
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
</style>
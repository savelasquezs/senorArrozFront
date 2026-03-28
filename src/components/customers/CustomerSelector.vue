<template>
    <div class="customer-selector">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            Cliente
            <span v-if="required" class="text-red-500">*</span>
        </label>

        <!-- Customer Search -->
        <div class="space-y-3">
            <!-- Search Input -->
            <BaseInput v-model="searchQuery" placeholder="Buscar por teléfono o nombre..." @paste="handlePaste"
                @input="handleSearch" size="sm">
                <template #icon>
                    <MagnifyingGlassIcon class="w-4 h-4 text-gray-400" />
                </template>
            </BaseInput>

            <!-- Customer Creation Options -->
            <div v-if="searchResults.length === 0 && searchQuery.trim()">
                <div class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <UserPlusIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p class="text-sm text-gray-500 mb-3">No se encontró cliente</p>
                    <BaseButton @click="showCreateCustomer" variant="primary" size="sm">
                        
                        <span class="flex items-center"><PlusIcon class="w-4 h-4 mr-2" />Crear Cliente</span>
                    </BaseButton>
                </div>
            </div>

            <!-- Search Results -->
            <div v-else-if="searchResults.length > 0" class="space-y-2 max-h-48 overflow-y-auto">
                <div v-for="customer in searchResults" :key="customer.id" @click="selectCustomer(customer)"
                    class="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors">
                    <div class="flex items-center">
                        <UserCircleIcon class="w-6 h-6 text-gray-400 mr-3" />
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">
                                {{ customer.name }}
                            </div>
                            <div class="text-xs text-gray-500">
                                {{ customer.phone1 }}
                            </div>
                        </div>
                        <ChevronRightIcon class="win-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Customer Modal -->
        <BaseDialog v-model="showCreateModal" title="Crear Nuevo Cliente" size="lg">
            <div v-if="!createdCustomer">
                <CustomerForm @submit="createCustomerWrapper" @cancel="closeCreateModal" :loading="isCreating"
                    :initial-phone="searchQuery" submit-button-text="Crear Cliente" />
            </div>

            <div v-else class="text-center py-6">
                <CheckCircleIcon class="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">Cliente Creado</h3>
                <p class="text-gray-500 mb-4">{{ createdCustomer.name }} ha sido creado exitosamente</p>
                <div class="flex space-x-3 justify-center">
                    <BaseButton @click="selectCreatedCustomer" variant="primary">
                        Seleccionar Cliente
                    </BaseButton>
                    <BaseButton @click="closeCreateModal" variant="outline">
                        Continuar
                    </BaseButton>
                </div>
            </div>
        </BaseDialog>

        <!-- Error/Validation Message -->
        <div v-if="error" class="mt-2 text-sm text-red-600">
            {{ error }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import type { Customer } from '@/types/customer'
import type { CreateCustomerDto } from '@/types/customer'

// Components
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'

// Icons
import {
    MagnifyingGlassIcon,
    UserCircleIcon,
    UserPlusIcon,
    PlusIcon,
    ChevronRightIcon,
    CheckCircleIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    required?: boolean
}

withDefaults(defineProps<Props>(), {
    required: false
})

// Emits
const emit = defineEmits<{
    customerSelected: [customer: Customer]
}>()

// Composables
const customersStore = useCustomersStore()
const { success, error: showError } = useToast()

/** Debounce para GET /customers/by-phone (coincidencia exacta en API). */
const PHONE_SEARCH_DEBOUNCE_MS = 400
/** Mínimo de dígitos para considerar búsqueda por teléfono y llamar a la API (ej. 10 en CO). */
const MIN_PHONE_DIGITS_FOR_API = 10

// State
const searchQuery = ref('')
const searchResults = ref<Customer[]>([])
const showCreateModal = ref(false)
const isCreating = ref(false)
const createdCustomer = ref<Customer | null>(null)
const error = ref('')

let phoneDebounceTimer: ReturnType<typeof setTimeout> | null = null
let phoneSearchGeneration = 0

const normalizePhone = (value: string) => {
    return value.replace(/\D/g, '')
}

/** Quita prefijo país 57 si el número tiene longitud típica celular CO (12 dígitos). */
const normalizePhoneForApi = (raw: string) => {
    let digits = normalizePhone(raw)
    if (digits.length >= 12 && digits.startsWith('57')) {
        digits = digits.slice(2)
    }
    return digits
}

const hasLetters = (s: string) => /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(s)

const isPhoneLikeQuery = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || hasLetters(trimmed)) {
        return false
    }
    return normalizePhoneForApi(trimmed).length >= MIN_PHONE_DIGITS_FOR_API
}

const filterLocalCustomers = (raw: string): Customer[] => {
    const qLower = raw.toLowerCase().trim()
    const qDigits = normalizePhone(raw)
    const allCustomers = customersStore.list?.items || []
    return allCustomers.filter((customer) => {
        if (customer.name.toLowerCase().includes(qLower)) {
            return true
        }
        const p1 = customer.phone1?.toLowerCase() ?? ''
        const p2 = customer.phone2?.toLowerCase() ?? ''
        if (p1.includes(qLower) || p2.includes(qLower)) {
            return true
        }
        if (qDigits.length >= 3) {
            const n1 = normalizePhone(customer.phone1 ?? '')
            const n2 = normalizePhone(customer.phone2 ?? '')
            if (n1.includes(qDigits) || n2.includes(qDigits)) {
                return true
            }
        }
        return false
    })
}

const mergePhoneSearchResults = (remote: Customer | null, local: Customer[]): Customer[] => {
    if (!remote) {
        return local
    }
    const rest = local.filter((c) => c.id !== remote.id)
    return [remote, ...rest]
}

const cancelPendingPhoneSearch = () => {
    if (phoneDebounceTimer !== null) {
        clearTimeout(phoneDebounceTimer)
        phoneDebounceTimer = null
    }
    phoneSearchGeneration++
}

const isPhoneNotFoundError = (message: string) =>
    message.includes('Cliente no encontrado') ||
    message.includes('no encontrado') ||
    message.includes('404')

// Methods
const handleSearch = () => {
    if (!searchQuery.value.trim()) {
        cancelPendingPhoneSearch()
        searchResults.value = []
        return
    }

    const raw = searchQuery.value
    const local = filterLocalCustomers(raw)
    searchResults.value = local

    cancelPendingPhoneSearch()

    if (!isPhoneLikeQuery(raw)) {
        return
    }

    const phoneForApi = normalizePhoneForApi(raw)
    const generation = phoneSearchGeneration
    phoneDebounceTimer = setTimeout(async () => {
        phoneDebounceTimer = null
        if (generation !== phoneSearchGeneration) {
            return
        }
        try {
            const remote = await customersStore.searchByPhone(phoneForApi)
            if (generation !== phoneSearchGeneration) {
                return
            }
            const latestLocal = filterLocalCustomers(searchQuery.value)
            searchResults.value = mergePhoneSearchResults(remote, latestLocal)
        } catch (e: unknown) {
            if (generation !== phoneSearchGeneration) {
                return
            }
            const msg = e instanceof Error ? e.message : String(e)
            if (!isPhoneNotFoundError(msg)) {
                showError('Búsqueda por teléfono', msg || 'No se pudo buscar el cliente')
            }
        }
    }, PHONE_SEARCH_DEBOUNCE_MS)
}

const handlePaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text') ?? ''
    if (!pasted) {
        return
    }
    event.preventDefault()
    const cleaned = normalizePhone(pasted)
    const input = event.target as HTMLInputElement
    const start = input.selectionStart ?? searchQuery.value.length
    const end = input.selectionEnd ?? searchQuery.value.length
    const newValue = searchQuery.value.slice(0, start) + cleaned + searchQuery.value.slice(end)
    searchQuery.value = newValue
    handleSearch()
}

const selectCustomer = (customer: Customer) => {
    cancelPendingPhoneSearch()
    emit('customerSelected', customer)
    searchQuery.value = ''
    searchResults.value = []
}

const showCreateCustomer = () => {
    showCreateModal.value = true
}

const createCustomerWrapper = async (customerData: any) => {
    const createCustomerDto: CreateCustomerDto = {
        name: customerData.name,
        phone1: customerData.phone1,
        phone2: customerData.phone2,
        branchId: customerData.branchId,
        initialAddress: customerData.initialAddress?.address?.trim()
            ? customerData.initialAddress
            : undefined
    }

    isCreating.value = true
    try {
        const customer = await customersStore.create(createCustomerDto)
        createdCustomer.value = customer

        // No need to refresh - customersStore updates optimistically

        success('Cliente creado', 3000, `${customer.name} ha sido creado correctamente`)
    } catch (error: any) {
        showError('Error al crear cliente', error.message || 'No se pudo crear el cliente')
    } finally {
        isCreating.value = false
    }
}

const selectCreatedCustomer = () => {
    if (createdCustomer.value) {
        emit('customerSelected', createdCustomer.value)
        selectCustomer(createdCustomer.value)
    }
    closeCreateModal()
}

const closeCreateModal = () => {
    showCreateModal.value = false
    createdCustomer.value = null
}

// Lifecycle
onMounted(async () => {
    // Cargar clientes si no están cargados
    if (!customersStore.list || customersStore.list.items.length === 0) {
        await customersStore.fetch({ page: 1, pageSize: 1000 })
    }
})

onUnmounted(() => {
    cancelPendingPhoneSearch()
})

watch(searchQuery, () => {
    if (!searchQuery.value.trim()) {
        cancelPendingPhoneSearch()
        searchResults.value = []
    }
})

</script>

<style scoped>
/* Custom styles if needed */
</style>

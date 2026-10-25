<template>
    <div class="customer-selector">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ label }}<span v-if="required" class="text-red-500">*</span>
        </label>
        <div class="space-y-3" :aria-busy="isBusy">
            <BaseInput v-model="searchQuery" placeholder="Buscar nombre, empresa, NIT, teléfono o @usuario..."
                @paste="handlePaste" size="sm">
                <template #icon><MagnifyingGlassIcon class="w-4 h-4 text-gray-400" /></template>
            </BaseInput>
            <p v-if="phase === 'debouncing' || phase === 'loading'" role="status" class="text-sm text-gray-500">Buscando clientes…</p>
            <p v-else-if="phase === 'selecting'" role="status" class="text-sm text-gray-500">Cargando cliente…</p>
            <p v-else-if="searchQuery.trim().length === 1" class="text-sm text-gray-500">Escribe al menos 2 caracteres.</p>
            <div v-if="searchError" role="alert" class="text-sm text-red-600">
                {{ searchError }} <button type="button" class="underline ml-2" @click="retrySearch">Reintentar</button>
            </div>
            <p v-if="selectionError" role="alert" class="text-sm text-red-600">{{ selectionError }}</p>
            <div v-if="phase === 'success' && searchResults.length === 0" class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <UserPlusIcon v-if="allowCreate" class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-500 mb-3">No se encontró cliente</p>
                <BaseButton v-if="allowCreate" @click="showCreateCustomer" variant="primary" size="sm">
                    <span class="flex items-center"><PlusIcon class="w-4 h-4 mr-2" />Crear Cliente</span>
                </BaseButton>
            </div>
            <div v-if="searchResults.length" class="space-y-2 max-h-48 overflow-y-auto">
                <button v-for="customer in searchResults" :key="customer.id" type="button" :disabled="isBusy"
                    :aria-label="`Seleccionar ${customer.name}`" @click="selectSuggestion(customer)"
                    class="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 transition-colors">
                    <span class="flex items-center">
                        <UserCircleIcon class="w-6 h-6 text-gray-400 mr-3" />
                        <span class="flex-1 min-w-0">
                            <span class="block text-sm font-medium text-gray-900">{{ customer.name }}</span>
                            <span class="block text-xs text-gray-500">{{ [customer.whatsAppUsername, customer.phone1, customer.phone2].filter(Boolean).join(' · ') }}</span>
                            <span v-if="customer.billingCompanies?.length" class="block text-xs text-emerald-700">Factura a: {{ customer.billingCompanies.join(' · ') }}</span>
                        </span>
                        <ChevronRightIcon class="w-4 h-4 text-gray-400" />
                    </span>
                </button>
            </div>
            <BaseButton v-if="hasMore && searchResults.length" variant="outline" size="sm" :disabled="isBusy" @click="loadMore">Ver más coincidencias</BaseButton>
        </div>

        <BaseDialog v-model="showCreateModal" title="Crear Nuevo Cliente" size="lg">
            <div v-if="!createdCustomer">
                <CustomerForm @submit="createCustomerWrapper" @cancel="closeCreateModal" :loading="isCreating"
                    :initial-phone="initialPhone" :initial-username="initialUsername"
                    :initial-branch-id="initialBranchId ?? branchId"
                    :initial-address-branch-id="initialAddressBranchId" :for-order-address="forOrderAddress"
                    :allow-address-branch-selection="allowAddressBranchSelection" submit-button-text="Crear Cliente" />
            </div>
            <div v-else class="text-center py-6">
                <CheckCircleIcon class="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">Cliente Creado</h3>
                <p class="text-gray-500 mb-4">{{ createdCustomer.name }} ha sido creado exitosamente</p>
                <div class="flex space-x-3 justify-center">
                    <BaseButton @click="selectCreatedCustomer" variant="primary">Seleccionar Cliente</BaseButton>
                    <BaseButton @click="closeCreateModal" variant="outline">Continuar</BaseButton>
                </div>
            </div>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { useToast } from '@/composables/useToast'
import { customerLookupApi, type CustomerSuggestion } from '@/services/MainAPI/customerLookupApi'
import type { Customer, CustomerFormData, CreateCustomerDto } from '@/types/customer'
import { isLikelyPhoneNumber, normalizePhoneForSearch } from '@/utils/phoneInput'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import { MagnifyingGlassIcon, UserCircleIcon, UserPlusIcon, PlusIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

interface Props {
    required?: boolean; branchId?: number; label?: string; allowCreate?: boolean
    initialBranchId?: number; initialAddressBranchId?: number; forOrderAddress?: boolean; allowAddressBranchSelection?: boolean
}
const props = withDefaults(defineProps<Props>(), {
    required: false, branchId: undefined, label: 'Cliente', allowCreate: true, allowAddressBranchSelection: true,
})
const emit = defineEmits<{ customerSelected: [customer: Customer, addressServiceBranchId?: number, createdAddressId?: number] }>()
const customersStore = useCustomersStore(), auth = useAuthStore(), branchContext = useBranchContextStore()
const { success, error: showError } = useToast()
const SEARCH_DEBOUNCE_MS = 400
const searchQuery = ref(''), searchResults = ref<CustomerSuggestion[]>([])
const phase = ref<'idle' | 'debouncing' | 'loading' | 'success' | 'error' | 'selecting'>('idle')
const searchError = ref(''), selectionError = ref(''), hasMore = ref(false), page = ref(0)
const isBusy = computed(() => ['debouncing', 'loading', 'selecting'].includes(phase.value))
const isSuperadmin = computed(() => auth.user?.role?.toLowerCase() === 'superadmin')
// Search follows the authenticated/selected branch, NOT the delivery destination.
const effectiveBranchId = computed(() => props.branchId ?? (isSuperadmin.value ? branchContext.selectedBranchId : auth.user?.branchId) ?? undefined)
const scopeKey = computed(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.user?.accountType,
    effectiveBranchId.value, isSuperadmin.value ? branchContext.selectedBranchId : undefined].join(':'))
const showCreateModal = ref(false), isCreating = ref(false), createdCustomer = ref<Customer | null>(null)
const createdAddressServiceBranchId = ref<number>(), createdAddressId = ref<number>()
const initialPhone = ref(''), initialUsername = ref('')
let timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined
let generation = 0, createGeneration = 0, alive = true

function cancelPendingSearch() {
    generation++
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    controller?.abort(); controller = undefined
}
function handleSearch() {
    cancelPendingSearch()
    searchResults.value = []; hasMore.value = false; page.value = 0
    searchError.value = ''; selectionError.value = ''; phase.value = 'idle'
    const query = searchQuery.value.trim()
    if (!auth.user || query.length < 2 || showCreateModal.value) return
    if (!effectiveBranchId.value || effectiveBranchId.value <= 0) {
        phase.value = 'error'; searchError.value = 'Selecciona una sucursal para buscar clientes.'; return
    }
    const version = generation
    phase.value = 'debouncing'
    timer = setTimeout(() => { timer = undefined; if (alive && version === generation) void loadPage(1) }, SEARCH_DEBOUNCE_MS)
}
async function loadPage(nextPage: number) {
    const query = searchQuery.value.trim(), branch = effectiveBranchId.value, scope = scopeKey.value, version = generation
    if (!alive || !auth.user || !branch || query.length < 2) return
    controller?.abort()
    const request = new AbortController(); controller = request
    const current = () => alive && !request.signal.aborted && version === generation && scope === scopeKey.value && query === searchQuery.value.trim()
    phase.value = 'loading'; searchError.value = ''; selectionError.value = ''
    try {
        const result = await customerLookupApi.search(query, branch, nextPage, request.signal)
        if (!current()) return
        searchResults.value = nextPage === 1 ? result.items : [...new Map([...searchResults.value, ...result.items].map(item => [item.id, item])).values()]
        page.value = result.page; hasMore.value = result.hasMore; phase.value = 'success'
    } catch {
        if (!current()) return
        phase.value = 'error'; searchError.value = 'No se pudieron buscar los clientes. Intenta nuevamente.'
    } finally { if (controller === request) controller = undefined }
}
function loadMore() { if (!isBusy.value && hasMore.value) void loadPage(page.value + 1) }
function retrySearch() {
    if (isBusy.value) return
    if (searchResults.value.length && hasMore.value) void loadPage(page.value + 1)
    else handleSearch()
}
function handlePaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? ''
    if (!isLikelyPhoneNumber(pasted)) return
    event.preventDefault()
    const input = event.target instanceof HTMLInputElement ? event.target : null
    const start = input?.selectionStart ?? searchQuery.value.length, end = input?.selectionEnd ?? searchQuery.value.length
    searchQuery.value = `${searchQuery.value.slice(0, start)}${normalizePhoneForSearch(pasted)}${searchQuery.value.slice(end)}`
}
function selectCustomer(customer: Customer, addressServiceBranchId?: number, addressId?: number) {
    cancelPendingSearch()
    emit('customerSelected', customer, addressServiceBranchId, addressId)
    searchQuery.value = ''; searchResults.value = []; hasMore.value = false; phase.value = 'idle'
}
async function selectSuggestion(suggestion: CustomerSuggestion) {
    if (isBusy.value || !searchResults.value.some(item => item.id === suggestion.id)) return
    cancelPendingSearch()
    const version = generation, scope = scopeKey.value, request = new AbortController()
    controller = request; phase.value = 'selecting'; selectionError.value = ''
    const current = () => alive && !request.signal.aborted && generation === version && scopeKey.value === scope
    try {
        const customer = await customerLookupApi.getCustomer(suggestion.id, request.signal)
        if (!current()) return
        if (!customer.active || customer.id !== suggestion.id) throw new Error('unavailable')
        // Full object preserves addresses and loyalty used by POS/persisted orders.
        selectCustomer(customer)
    } catch {
        if (current()) { phase.value = 'success'; selectionError.value = 'No se pudo cargar el cliente. Vuelve a seleccionarlo o repite la búsqueda.' }
    } finally { if (controller === request) controller = undefined }
}
function showCreateCustomer() {
    if (!props.allowCreate || phase.value !== 'success' || searchResults.value.length) return
    cancelPendingSearch()
    const query = searchQuery.value.trim()
    initialUsername.value = query.startsWith('@') ? query : ''
    initialPhone.value = isLikelyPhoneNumber(query) ? normalizePhoneForSearch(query) : ''
    showCreateModal.value = true
}
async function createCustomerWrapper(customerData: CustomerFormData) {
    if (isCreating.value) return
    const version = ++createGeneration, scope = scopeKey.value
    const serviceBranchId = customerData.initialAddress?.serviceBranchId
    const initialAddress = customerData.initialAddress ? (({ serviceBranchId: _, ...address }) => address)(customerData.initialAddress) : undefined
    const payload: CreateCustomerDto = { name: customerData.name, phone1: customerData.phone1, phone2: customerData.phone2,
        whatsAppUsername: customerData.whatsAppUsername, branchId: customerData.branchId,
        initialAddress: initialAddress?.address.trim() ? initialAddress as CreateCustomerDto['initialAddress'] : undefined }
    isCreating.value = true
    const current = () => alive && version === createGeneration && scope === scopeKey.value
    try {
        const customer = await customersStore.create(payload)
        if (!current()) return
        createdCustomer.value = customer; createdAddressServiceBranchId.value = serviceBranchId
        createdAddressId.value = initialAddress ? customer.addresses?.find(address => address.neighborhoodId === initialAddress.neighborhoodId
            && address.address.trim().toLocaleLowerCase() === initialAddress.address.trim().toLocaleLowerCase())?.id : undefined
        success('Cliente creado', 3000, `${customer.name} ha sido creado correctamente`)
    } catch (cause: any) { if (current()) showError('Error al crear cliente', cause.message || 'No se pudo crear el cliente') }
    finally { if (current()) isCreating.value = false }
}
function selectCreatedCustomer() {
    if (createdCustomer.value) selectCustomer(createdCustomer.value, createdAddressServiceBranchId.value, createdAddressId.value)
    closeCreateModal()
}
function closeCreateModal() {
    showCreateModal.value = false; createdCustomer.value = null
    createdAddressServiceBranchId.value = undefined; createdAddressId.value = undefined
    handleSearch()
}
watch(searchQuery, handleSearch, { flush: 'sync' })
watch(scopeKey, () => {
    createGeneration++; isCreating.value = false; showCreateModal.value = false; createdCustomer.value = null
    createdAddressServiceBranchId.value = undefined; createdAddressId.value = undefined
    handleSearch()
}, { flush: 'sync' })
onBeforeUnmount(() => { alive = false; createGeneration++; cancelPendingSearch() })
</script>

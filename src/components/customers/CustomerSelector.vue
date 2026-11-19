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
            <div v-if="whatsappContact && allowCreate && phase === 'success' && searchResults.length === 0">
                <BaseButton variant="outline" size="sm" @click="showCreateCustomer">
                    <PlusIcon class="mr-1.5 h-4 w-4" />Crear cliente
                </BaseButton>
            </div>
            <div v-else-if="phase === 'success' && searchResults.length === 0" class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
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
                    :initial-phone="initialPhone" :initial-username="initialUsername" :initial-name="whatsappContact?.contactName ?? undefined"
                    :initial-branch-id="initialBranchId ?? branchId"
                    :initial-address-branch-id="initialAddressBranchId" :for-order-address="forOrderAddress"
                    :allow-address-branch-selection="allowAddressBranchSelection" submit-button-text="Crear Cliente"
                    :verifying-phone="checkingPhone || !!phoneLookupError" :hide-submit="!!phoneMatch" @phone-change="lookupPhone">
                    <template #phone-match>
                        <p v-if="checkingPhone" role="status" class="text-xs text-gray-500">Buscando este teléfono…</p>
                        <p v-else-if="phoneLookupError" role="alert" class="text-sm text-red-700">
                            {{ phoneLookupError }}
                            <button type="button" class="ml-1 underline" @click="lookupPhone(lookupNumber)">Reintentar</button>
                        </p>
                        <div v-else-if="phoneMatch" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                            <div class="min-w-0">
                                <p class="text-xs text-emerald-800">Teléfono registrado</p>
                                <p class="truncate text-sm font-semibold text-emerald-950">{{ phoneMatch.name }}</p>
                            </div>
                            <BaseButton size="sm" type="button" :loading="isCreating" @click="selectPhoneMatch">
                                <LinkIcon class="mr-1.5 h-4 w-4" aria-hidden="true" />
                                {{ whatsappContact?.whatsAppUsername ? 'Actualizar usuario y seleccionar' : 'Vincular y seleccionar' }}
                            </BaseButton>
                        </div>
                    </template>
                </CustomerForm>
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
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { useToast } from '@/composables/useToast'
import { customerLookupApi, type CustomerSuggestion } from '@/services/MainAPI/customerLookupApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppContactPrefill } from '@/types/whatsapp'
import { normalizeWhatsAppUsername } from '@/utils/whatsappIdentity'
import type { Customer, CustomerFormData, CreateCustomerDto } from '@/types/customer'
import { isLikelyPhoneNumber, normalizePhoneForSearch } from '@/utils/phoneInput'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
const CustomerForm = defineAsyncComponent(() => import('@/components/customers/CustomerForm.vue'))
import { MagnifyingGlassIcon, UserCircleIcon, UserPlusIcon, PlusIcon, ChevronRightIcon, CheckCircleIcon, LinkIcon } from '@heroicons/vue/24/outline'

interface Props {
    required?: boolean; branchId?: number; label?: string; allowCreate?: boolean
    initialBranchId?: number; initialAddressBranchId?: number; forOrderAddress?: boolean; allowAddressBranchSelection?: boolean
    whatsappContact?: WhatsAppContactPrefill
}
const props = withDefaults(defineProps<Props>(), {
    required: false, branchId: undefined, label: 'Cliente', allowCreate: true, allowAddressBranchSelection: true,
})
const emit = defineEmits<{ customerSelected: [customer: Customer, addressServiceBranchId?: number, createdAddressId?: number] }>()
const customersStore = useCustomersStore(), auth = useAuthStore(), branchContext = useBranchContextStore()
const { success, error: showError } = useToast()
const SEARCH_DEBOUNCE_MS = 400
const prefillSearch = () => props.whatsappContact?.phoneNumber
    ? normalizePhoneForSearch(props.whatsappContact.phoneNumber) : normalizeWhatsAppUsername(props.whatsappContact?.whatsAppUsername)
const searchQuery = ref(prefillSearch()), searchResults = ref<CustomerSuggestion[]>([])
const phase = ref<'idle' | 'debouncing' | 'loading' | 'success' | 'error' | 'selecting'>('idle')
const searchError = ref(''), selectionError = ref(''), hasMore = ref(false), page = ref(0)
const isBusy = computed(() => ['debouncing', 'loading', 'selecting'].includes(phase.value))
const isSuperadmin = computed(() => auth.user?.role?.toLowerCase() === 'superadmin')
// Search follows the authenticated/selected branch, NOT the delivery destination.
const effectiveBranchId = computed(() => props.branchId ?? (isSuperadmin.value ? branchContext.selectedBranchId : auth.user?.branchId) ?? undefined)
const scopeKey = computed(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.user?.accountType,
    effectiveBranchId.value, isSuperadmin.value ? branchContext.selectedBranchId : undefined, props.whatsappContact?.id].join(':'))
const showCreateModal = ref(false), isCreating = ref(false), createdCustomer = ref<Customer | null>(null)
const createdAddressServiceBranchId = ref<number>(), createdAddressId = ref<number>()
const initialPhone = ref(''), initialUsername = ref('')
let timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined
let generation = 0, createGeneration = 0, alive = true
const phoneMatch = ref<Customer | null>(null), checkingPhone = ref(false), phoneLookupError = ref(''), lookupNumber = ref('')
let phoneRequest: AbortController | undefined, phoneTimer: ReturnType<typeof setTimeout> | undefined

function stopPhoneLookup() {
    clearTimeout(phoneTimer)
    phoneRequest?.abort()
    phoneRequest = undefined
    checkingPhone.value = false
    phoneMatch.value = null
    phoneLookupError.value = ''
}

function lookupPhone(input: string) {
    stopPhoneLookup()
    lookupNumber.value = isLikelyPhoneNumber(input) ? normalizePhoneForSearch(input) : ''
    if (!props.whatsappContact || !showCreateModal.value || !lookupNumber.value) return
    const phone = lookupNumber.value, request = new AbortController()
    phoneRequest = request
    checkingPhone.value = true
    phoneTimer = setTimeout(async () => {
        try {
            const customer = await customerLookupApi.findByPhone(phone, request.signal)
            if (!request.signal.aborted) phoneMatch.value = customer
        } catch {
            if (!request.signal.aborted) phoneLookupError.value = 'No se pudo verificar el teléfono.'
        } finally {
            if (phoneRequest === request) { phoneRequest = undefined; checkingPhone.value = false }
        }
    }, 250)
}

async function selectPhoneMatch() {
    const customer = phoneMatch.value, contact = props.whatsappContact, phone = lookupNumber.value
    if (!customer || !contact || !phone || isCreating.value) return
    const version = ++createGeneration, scope = scopeKey.value
    const current = () => alive && version === createGeneration && scope === scopeKey.value && showCreateModal.value
    isCreating.value = true
    try {
        const result = await whatsappApi.linkConversationCustomer(contact.id, customer.id, {
            phoneNumber: phone, expectedAttentionVersion: contact.attentionRevision ?? 0,
        })
        if (!current()) return
        selectCustomer({ ...customer, whatsAppUsername: result.data?.whatsAppUsername ?? customer.whatsAppUsername })
        closeCreateModal()
    } catch (cause) {
        if (current()) showError('Vincular cliente', cause instanceof Error ? cause.message : 'No se pudo vincular al cliente.')
    } finally {
        if (version === createGeneration && scope === scopeKey.value) isCreating.value = false
    }
}

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
    initialUsername.value = normalizeWhatsAppUsername(props.whatsappContact?.whatsAppUsername) || (query.startsWith('@') ? query : '')
    initialPhone.value = isLikelyPhoneNumber(query) ? normalizePhoneForSearch(query)
        : normalizePhoneForSearch(props.whatsappContact?.phoneNumber ?? '')
    showCreateModal.value = true
}
async function createCustomerWrapper(customerData: CustomerFormData) {
    if (isCreating.value || checkingPhone.value || phoneMatch.value || phoneLookupError.value) return
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
        if (props.whatsappContact) selectCreatedCustomer()
        success('Cliente creado', 3000, `${customer.name} ha sido creado correctamente`)
    } catch (cause: any) {
        if (!current()) return
        if (props.whatsappContact && customerData.phone1) lookupPhone(customerData.phone1)
        showError('Error al crear cliente', cause.message || 'No se pudo crear el cliente')
    }
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
watch(searchQuery, handleSearch, { flush: 'sync', immediate: true })
watch(showCreateModal, open => { if (!open) stopPhoneLookup() })
watch(scopeKey, () => {
    createGeneration++; isCreating.value = false; showCreateModal.value = false; createdCustomer.value = null
    createdAddressServiceBranchId.value = undefined; createdAddressId.value = undefined
    if (props.whatsappContact) searchQuery.value = prefillSearch()
    handleSearch()
}, { flush: 'sync' })
onBeforeUnmount(() => { alive = false; createGeneration++; stopPhoneLookup(); cancelPendingSearch() })
</script>

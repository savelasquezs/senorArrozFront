<template>
    <BaseDialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" :dismissible="!busy" title="Datos de facturación" size="lg" z-class="z-[80]">
        <form :id="formId" class="space-y-4" @submit.prevent="save">
            <p class="text-sm text-slate-500">Los campos con * son obligatorios. Guardar datos no emite una factura.</p>
            <section class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2" aria-label="Directorio de facturación">
                <label class="block text-sm font-medium">Buscar empresa o destinatario guardado<input v-model="directoryQuery" type="search" maxlength="200" placeholder="Nombre comercial, razón social o NIT" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" @keydown.enter.prevent="directoryNit ? lookupSearchNit() : searchDirectory()" /></label>
                <p class="text-xs text-slate-500">Encuentra destinatarios de todo el negocio, aunque hayan facturado para otra persona.</p>
                <p v-if="directoryLoading" role="status" class="text-sm text-slate-600">Buscando en el negocio…</p>
                <p v-if="directoryError" role="alert" class="text-sm text-red-700">{{ directoryError }} <button type="button" class="underline" @click="searchDirectory()">Reintentar búsqueda</button></p>
                <ul v-if="directoryResults.length" aria-label="Destinatarios encontrados" class="max-h-52 overflow-y-auto space-y-1"><li v-for="r in directoryResults" :key="r.profileId"><button type="button" class="min-h-11 w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-emerald-500 focus-visible:outline-emerald-600" @click="selectDirectory(r)"><span class="block font-medium text-slate-900">{{ r.tradeName || r.name }}</span><span v-if="r.tradeName" class="block text-xs text-slate-600">{{ r.name }}</span><span class="block text-xs text-slate-500">{{ r.identification }}{{ r.email ? ` · ${r.email}` : '' }}{{ r.needsReview ? ' · Requiere revisión' : '' }}</span></button></li></ul>
                <p v-else-if="directorySearched && !directoryLoading && !directoryError" class="text-sm text-slate-600">No está registrado. Ingresa el NIT abajo para consultar DIAN o completa los datos manualmente.</p>
                <button v-if="directoryNit && directorySearched && !directoryResults.length && !directoryLoading" type="button" class="min-h-11 rounded-lg border border-emerald-600 bg-white px-3 text-sm font-medium text-emerald-700" :disabled="lookingUp || busy" @click="lookupSearchNit">Consultar NIT {{ directoryQuery.trim() }} en DIAN</button>
                <div v-if="directoryPages > 1" class="flex items-center justify-between text-sm"><button type="button" class="min-h-11 underline" :disabled="directoryLoading || directoryPage === 1" @click="searchDirectory(directoryPage - 1)">Anterior</button><span>Página {{ directoryPage }} de {{ directoryPages }}</span><button type="button" class="min-h-11 underline" :disabled="directoryLoading || directoryPage >= directoryPages" @click="searchDirectory(directoryPage + 1)">Siguiente</button></div>
            </section>
            <p v-if="loading" role="status">Cargando destinatarios…</p>
            <p v-if="loadError" role="alert" class="text-red-700">{{ loadError }} <button type="button" class="underline" @click="load()">Reintentar</button></p>
            <label v-if="recipients.length" class="block text-sm">Destinatario guardado
                <select class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" :value="form.id ?? ''" @change="selectRecipient">
                    <option value="">Nuevo destinatario</option>
                    <option v-for="r in recipients" :key="r.id" :value="r.id">{{ r.name }} · {{ r.identification }}{{ r.isDefault ? ' · Predeterminado' : '' }}</option>
                </select>
            </label>
            <div class="flex items-center justify-between gap-2"><h4 class="text-sm font-semibold text-slate-800">{{ form.profileId || form.id ? 'Destinatario seleccionado' : 'Nuevo destinatario' }}</h4><button v-if="form.profileId || form.id" type="button" class="min-h-11 text-sm font-medium text-emerald-700 underline" @click="newRecipient">Crear otro</button></div>
            <div v-if="form.profileId" class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><p>{{ form.needsReview ? 'Encontramos datos anteriores distintos para esta identificación. Revisa y confirma el nombre y correo correctos antes de reutilizarlos.' : 'Este registro se comparte con otros clientes del negocio.' }}</p><button type="button" class="min-h-11 font-medium text-emerald-700 underline" @click="editingShared = !editingShared">{{ editingShared ? 'Cancelar edición compartida' : 'Editar datos compartidos' }}</button></div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="text-sm">Tipo de identificación *
                    <select v-model.number="form.documentType" :disabled="!!form.profileId || busy" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" required>
                        <option :value="3">Cédula de ciudadanía</option><option :value="6">NIT</option>
                        <option :value="5">Cédula de extranjería</option><option :value="7">Pasaporte</option>
                    </select>
                </label>
                <label class="text-sm">Número de identificación *
                    <input v-model.trim="form.identification" :readonly="!!form.profileId" @blur="identificationBlur" :aria-invalid="touched.identification && !!issues.identification" required maxlength="32" pattern="[A-Za-z0-9-]+" :inputmode="form.documentType === 7 ? 'text' : 'numeric'" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
                </label>
            </div>
            <BaseButton v-if="!form.profileId" type="button" variant="outline" class="min-h-11" :loading="lookingUp" :disabled="!form.identification || busy" @click="lookup">Completar con datos DIAN</BaseButton>
            <p v-if="lookingUp" role="status" class="text-sm text-slate-600">Consultando datos en DIAN…</p>
            <p v-else-if="lookupError" role="alert" class="text-sm text-red-700">{{ lookupError }}</p>
            <p v-else-if="lookupMessage" role="status" class="text-sm text-emerald-700">{{ lookupMessage }}</p>
            <p v-if="!form.profileId" class="text-xs text-slate-500">Primero buscamos en el negocio. Si no existe, consultamos DIAN con Plemsi. Revisa los datos antes de guardar.</p>
            <label class="block text-sm">Nombre o razón social *
                <input v-model.trim="form.name" :readonly="sharedReadOnly" @blur="touched.name = true" :aria-invalid="touched.name && !!issues.name" required maxlength="200" autocomplete="organization" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label class="block text-sm">Nombre comercial <span class="text-slate-500">(opcional, para buscar la empresa)</span><input v-model.trim="form.tradeName" :readonly="sharedReadOnly" maxlength="200" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" /></label>
            <label class="block text-sm">Correo para recibir la factura <span class="text-slate-500">(opcional)</span>
                <input v-model.trim="form.email" :readonly="sharedReadOnly" @blur="touched.email = true" :aria-invalid="touched.email && !!issues.email" type="email" maxlength="254" autocomplete="email" inputmode="email" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label class="block text-sm">Dirección fiscal <span class="text-slate-500">(opcional)</span><input v-model.trim="form.address" :readonly="sharedReadOnly" maxlength="300" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" /><span class="text-xs text-slate-500">Se conserva en el directorio; la dirección de entrega se elige en el pedido.</span></label>
            <label v-if="editingShared && form.profileId" class="flex min-h-11 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><input v-model="form.confirmSharedUpdate" type="checkbox" class="mt-1" />Confirmo los datos compartidos para próximos pedidos de los clientes asociados. Las facturas emitidas conservan sus datos.</label>
            <p v-if="touched.identification && issues.identification" class="text-sm text-red-700">{{ issues.identification }}</p>
            <p v-if="touched.name && issues.name" class="text-sm text-red-700">{{ issues.name }}</p>
            <p v-if="touched.email && issues.email" class="text-sm text-red-700">{{ issues.email }}</p>
            <p v-if="!form.email" class="text-sm text-gray-600">Sin correo podrás descargar e imprimir la factura desde el pedido.</p>
            <fieldset v-if="orderContext || !customerId" class="rounded-xl bg-slate-50 p-3 text-sm space-y-2"><legend class="font-medium">Dónde guardar</legend>
                <label v-if="customerId" class="flex min-h-11 items-center gap-2"><input v-model="saveScope" :name="scopeName" type="radio" value="customer" />Recordar este destinatario para el cliente y el negocio</label>
                <label class="flex min-h-11 items-center gap-2"><input v-model="saveScope" :name="scopeName" type="radio" value="order" />Solo para este pedido</label>
                <label class="flex min-h-11 items-center gap-2"><input v-model="saveScope" :name="scopeName" type="radio" value="directory" />Guardar en el negocio sin asociarlo al cliente</label>
                <label v-if="saveScope === 'customer'" class="flex min-h-11 items-center gap-2"><input v-model="form.isDefault" type="checkbox" />Usar como destinatario predeterminado</label>
            </fieldset>
            <label v-else-if="customerId" class="flex min-h-11 items-center gap-2 text-sm"><input v-model="form.isDefault" type="checkbox" />Usar como destinatario predeterminado del cliente</label>
            <p role="status" :class="billingRecipientComplete(form) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'" class="rounded-xl p-3 text-sm">{{ billingRecipientComplete(form) ? 'Datos listos para solicitar factura.' : 'Completa tipo, identificación y nombre; verifica el correo si lo ingresas.' }}</p>
            <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
        </form>
        <template #footer>
            <BaseButton type="button" variant="outline" class="min-h-11" :disabled="busy" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
            <BaseButton type="submit" :form="formId" class="min-h-11" :loading="busy" :disabled="lookingUp || loading">{{ saveScope === 'customer' ? 'Guardar y asociar al cliente' : saveScope === 'directory' ? 'Guardar en el negocio' : 'Usar en este pedido' }}</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { electronicInvoicingApi } from '@/services/MainAPI/electronicInvoicingApi'
import { billingRecipientComplete, useBillingRecipients, useBillingDirectory } from '@/composables/useBillingRecipients'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import { useAuthStore } from '@/store/auth'
import type { BillingRecipient } from '@/types/electronicInvoicing'

const props = defineProps<{ modelValue: boolean; customerId?: number | null; recipient?: BillingRecipient | null; orderContext?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [BillingRecipient] }>()
const { recipients, load, loading, error: loadError } = useBillingRecipients(() => props.modelValue ? props.customerId : null)
const empty = (): BillingRecipient => ({ id: undefined, profileId: undefined, profileVersion: undefined, needsReview: false, confirmSharedUpdate: false, documentType: 3, identification: '', name: '', tradeName: '', address: '', email: '', isDefault: false })
const form = reactive<BillingRecipient>(empty())
const saveScope = ref<'customer' | 'directory' | 'order'>('customer'), busy = ref(false), lookingUp = ref(false), error = ref(''), editingShared = ref(false)
const selectedProfile = ref<BillingRecipient | null>(null)
const sharedReadOnly = computed(() => !!form.profileId && !editingShared.value)
const { query: directoryQuery, results: directoryResults, loading: directoryLoading, error: directoryError, page: directoryPage, totalPages: directoryPages, searched: directorySearched, search: searchDirectory } = useBillingDirectory(() => props.modelValue)
const directoryNit = computed(() => /^\d{6,15}(-\d)?$/.test(directoryQuery.value.trim()))
const lookupError = ref(''), lookupMessage = ref('')
const resources = useInvoiceResources(), auth = useAuthStore(), scopeName = useId(), formId = useId()
const touched = reactive({ identification: false, name: false, email: false })
const issues = computed(() => ({ identification: /^[A-Za-z0-9-]+$/.test(form.identification) ? '' : 'Ingresa la identificación sin espacios ni puntos.', name: form.name.trim() ? '' : 'Ingresa el nombre o la razón social.', email: !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Verifica el formato del correo.' }))
watch(recipients, values => {
    if (props.modelValue && !props.recipient && !form.identification) {
        const preferred = values.find(r => r.isDefault)
        if (preferred) { Object.assign(form, preferred); selectedProfile.value = { ...form }; editingShared.value = !!form.needsReview }
    }
    if (form.profileId && !form.id) {
        const linked = values.find(r => r.profileId === form.profileId)
        if (linked) { form.id = linked.id; form.isDefault = form.isDefault || linked.isDefault }
    }
})
function newRecipient() { resetLookup(); Object.assign(form, empty()); editingShared.value = false; selectedProfile.value = null; error.value = '' }
watch(() => [props.modelValue, props.customerId], () => {
    if (props.modelValue) { Object.assign(form, empty(), props.recipient ?? {}); selectedProfile.value = { ...form }; editingShared.value = false; directoryQuery.value = ''; error.value = ''; saveScope.value = props.customerId ? 'customer' : 'directory'; Object.assign(touched, { identification: false, name: false, email: false }) }
}, { immediate: true })
function selectDirectory(recipient: BillingRecipient) {
    resetLookup()
    const linked = recipients.value.find(r => r.profileId === recipient.profileId)
    Object.assign(form, empty(), recipient, { id: linked?.id, isDefault: linked?.isDefault ?? false })
    selectedProfile.value = { ...form }; editingShared.value = !!form.needsReview; error.value = ''; directoryQuery.value = ''
}
function selectRecipient(event: Event) {
    resetLookup()
    const selected = recipients.value.find(r => r.id === Number((event.target as HTMLSelectElement).value))
    Object.assign(form, empty(), selected ?? {}); selectedProfile.value = { ...form }; editingShared.value = !!form.needsReview
}
watch(editingShared, value => { if (!value && selectedProfile.value?.profileId) { Object.assign(form, selectedProfile.value); form.confirmSharedUpdate = false } })
let lookupGeneration = 0
function resetLookup() { lookupGeneration++; lookingUp.value = false; lookupError.value = ''; lookupMessage.value = '' }
watch([() => props.modelValue, () => props.customerId, () => form.documentType, () => form.identification], () => {
    resetLookup()
})
function identificationBlur() { touched.identification = true; if (form.documentType === 6 && !form.profileId && !issues.value.identification && !form.name && !lookingUp.value) void lookup() }
async function lookupSearchNit() {
    if (!directoryNit.value || lookingUp.value || busy.value) return
    const nit = directoryQuery.value.trim(), customerId = props.customerId
    newRecipient(); form.documentType = 6; form.identification = nit; directoryQuery.value = ''
    await nextTick()
    if (props.modelValue && props.customerId === customerId) await lookup()
}
function findValue(data: unknown, keys: string[]): string | undefined {
    if (!data || typeof data !== 'object') return
    const record = data as Record<string, unknown>
    for (const key of keys) if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim()
    for (const value of Object.values(record)) { const found = findValue(value, keys); if (found) return found }
}
async function lookup() {
    if (lookingUp.value) return
    const generation = ++lookupGeneration
    const requestedIdentification = form.identification, requestedType = form.documentType, requestedCustomer = props.customerId
    const token = auth.token
    const previous = { name: form.name, email: form.email, address: form.address }
    lookingUp.value = true; lookupError.value = ''; lookupMessage.value = ''
    const isCurrent = () => token === auth.token && generation === lookupGeneration && props.modelValue && requestedCustomer === props.customerId && requestedIdentification === form.identification && requestedType === form.documentType
    try {
        const result = await electronicInvoicingApi.lookup(form.documentType, form.identification)
        if (!isCurrent()) return
        const data = result.data as { source?: string; recipient?: BillingRecipient } | undefined
        if (data?.source === 'directory' && data.recipient) { selectDirectory(data.recipient); await nextTick(); if (props.modelValue && form.profileId === data.recipient.profileId) lookupMessage.value = 'Destinatario encontrado en el negocio. Puedes reutilizarlo sin consultar DIAN otra vez.'; return }
        const name = findValue(result.data, ['customerName', 'name', 'fullname', 'business_name'])
        const email = findValue(result.data, ['customerEmail', 'email', 'billing_email'])
        const address = findValue(result.data, ['customerAddress', 'address'])
        if (name && form.name === previous.name) form.name = name
        if (email && form.email === previous.email) form.email = email
        if (address && form.address === previous.address) form.address = address
        if (!name) lookupError.value = 'No se encontraron datos. Verifica el tipo y número de identificación o completa los datos manualmente.'
        else lookupMessage.value = email ? 'Nombre y correo completados. Revisa los datos antes de guardar.' : 'Nombre completado. DIAN no devolvió un correo; puedes ingresarlo manualmente.'
    } catch (e) { if (isCurrent()) lookupError.value = (e as Error).message }
    finally { if (generation === lookupGeneration) lookingUp.value = false }
}
async function save() {
    if (loading.value || lookingUp.value) return
    if (busy.value || !billingRecipientComplete({ ...form, needsReview: false })) { error.value = 'Completa los datos obligatorios y verifica el correo.'; return }
    if (form.needsReview && !form.confirmSharedUpdate || editingShared.value && form.profileId && saveScope.value !== 'order' && !form.confirmSharedUpdate) { error.value = 'Revisa y confirma los datos compartidos antes de guardar.'; return }
    busy.value = true; error.value = ''
    const customerId = props.customerId, token = auth.token
    const isCurrent = () => token === auth.token && customerId === props.customerId && props.modelValue
    try {
        let recipient: BillingRecipient = { ...form, email: form.email || null }
        if (customerId && saveScope.value === 'customer') {
            const result = await electronicInvoicingApi.saveRecipient(customerId, recipient)
            if (!result.data) throw new Error(result.message || 'No se guardaron los datos.')
            if (!isCurrent()) return
            recipient = result.data
            resources.updateRecipient(customerId, recipient)
        } else if (saveScope.value === 'directory') {
            const result = await electronicInvoicingApi.saveDirectoryRecipient(recipient)
            if (!result.data) throw new Error(result.message || 'No se guardaron los datos.')
            if (!isCurrent()) return
            recipient = result.data; resources.updateProfile(recipient)
        } else { recipient.id = undefined; recipient.profileId = undefined; recipient.profileVersion = undefined; recipient.needsReview = false; recipient.isDefault = false }
        if (!isCurrent()) return
        emit('saved', recipient); emit('update:modelValue', false)
    } catch (e) { error.value = (e as Error).message }
    finally { busy.value = false }
}
</script>

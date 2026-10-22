<template>
    <BaseDialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" :dismissible="!busy" title="Datos de facturación" size="lg" z-class="z-[80]">
        <form :id="formId" class="space-y-4" @submit.prevent="save">
            <p class="text-sm text-slate-500">Los campos con * son obligatorios. Guardar datos no emite una factura.</p>
            <p v-if="loading" role="status">Cargando destinatarios…</p>
            <p v-if="loadError" role="alert" class="text-red-700">{{ loadError }} <button type="button" class="underline" @click="load()">Reintentar</button></p>
            <label v-if="recipients.length" class="block text-sm">Destinatario guardado
                <select class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" :value="form.id ?? ''" @change="selectRecipient">
                    <option value="">Nuevo destinatario</option>
                    <option v-for="r in recipients" :key="r.id" :value="r.id">{{ r.name }} · {{ r.identification }}{{ r.isDefault ? ' · Predeterminado' : '' }}</option>
                </select>
            </label>
            <div class="flex items-center justify-between gap-2"><h4 class="text-sm font-semibold text-slate-800">{{ form.id ? 'Editar destinatario' : 'Nuevo destinatario' }}</h4><button v-if="form.id" type="button" class="min-h-11 text-sm font-medium text-emerald-700 underline" @click="newRecipient">Crear otro</button></div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="text-sm">Tipo de identificación *
                    <select v-model.number="form.documentType" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3" required>
                        <option :value="3">Cédula de ciudadanía</option><option :value="6">NIT</option>
                        <option :value="5">Cédula de extranjería</option><option :value="7">Pasaporte</option>
                    </select>
                </label>
                <label class="text-sm">Número de identificación *
                    <input v-model.trim="form.identification" @blur="touched.identification = true" :aria-invalid="touched.identification && !!issues.identification" required maxlength="32" pattern="[A-Za-z0-9-]+" :inputmode="form.documentType === 7 ? 'text' : 'numeric'" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
                </label>
            </div>
            <BaseButton type="button" variant="outline" class="min-h-11" :loading="lookingUp" :disabled="!form.identification || busy" @click="lookup">Completar con datos DIAN</BaseButton>
            <p v-if="lookingUp" role="status" class="text-sm text-slate-600">Consultando datos en DIAN…</p>
            <p v-else-if="lookupError" role="alert" class="text-sm text-red-700">{{ lookupError }}</p>
            <p v-else-if="lookupMessage" role="status" class="text-sm text-emerald-700">{{ lookupMessage }}</p>
            <p class="text-xs text-slate-500">La consulta requiere un proveedor activo. También puedes completar los datos manualmente.</p>
            <label class="block text-sm">Nombre o razón social *
                <input v-model.trim="form.name" @blur="touched.name = true" :aria-invalid="touched.name && !!issues.name" required maxlength="200" autocomplete="organization" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <label class="block text-sm">Correo para recibir la factura <span class="text-slate-500">(opcional)</span>
                <input v-model.trim="form.email" @blur="touched.email = true" :aria-invalid="touched.email && !!issues.email" type="email" maxlength="254" autocomplete="email" inputmode="email" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 p-3" />
            </label>
            <p v-if="touched.identification && issues.identification" class="text-sm text-red-700">{{ issues.identification }}</p>
            <p v-if="touched.name && issues.name" class="text-sm text-red-700">{{ issues.name }}</p>
            <p v-if="touched.email && issues.email" class="text-sm text-red-700">{{ issues.email }}</p>
            <p v-if="!form.email" class="text-sm text-gray-600">Sin correo podrás descargar e imprimir la factura desde el pedido.</p>
            <fieldset v-if="customerId && orderContext" class="rounded-xl bg-slate-50 p-3 text-sm space-y-2"><legend class="font-medium">Dónde guardar</legend>
                <label class="flex min-h-11 items-center gap-2"><input v-model="saveToCustomer" :name="scopeName" type="radio" :value="true" />En el cliente, para próximos pedidos</label>
                <label class="flex min-h-11 items-center gap-2"><input v-model="saveToCustomer" :name="scopeName" type="radio" :value="false" />Solo para este pedido</label>
                <label v-if="saveToCustomer" class="flex min-h-11 items-center gap-2"><input v-model="form.isDefault" type="checkbox" />Usar como destinatario predeterminado</label>
            </fieldset>
            <label v-else-if="customerId" class="flex min-h-11 items-center gap-2 text-sm"><input v-model="form.isDefault" type="checkbox" />Usar como destinatario predeterminado del cliente</label>
            <p v-else class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Estos datos se usarán únicamente para este pedido.</p>
            <p role="status" :class="billingRecipientComplete(form) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'" class="rounded-xl p-3 text-sm">{{ billingRecipientComplete(form) ? 'Datos listos para solicitar factura.' : 'Completa tipo, identificación y nombre; verifica el correo si lo ingresas.' }}</p>
            <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
        </form>
        <template #footer>
            <BaseButton type="button" variant="outline" class="min-h-11" :disabled="busy" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
            <BaseButton type="submit" :form="formId" class="min-h-11" :loading="busy" :disabled="lookingUp">{{ customerId && saveToCustomer ? 'Guardar en el cliente' : 'Usar en este pedido' }}</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { electronicInvoicingApi } from '@/services/MainAPI/electronicInvoicingApi'
import { billingRecipientComplete, useBillingRecipients } from '@/composables/useBillingRecipients'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import type { BillingRecipient } from '@/types/electronicInvoicing'

const props = defineProps<{ modelValue: boolean; customerId?: number | null; recipient?: BillingRecipient | null; orderContext?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [BillingRecipient] }>()
const { recipients, load, loading, error: loadError } = useBillingRecipients(() => props.modelValue ? props.customerId : null)
const empty = (): BillingRecipient => ({ documentType: 3, identification: '', name: '', email: '', isDefault: false })
const form = reactive<BillingRecipient>(empty())
const saveToCustomer = ref(true), busy = ref(false), lookingUp = ref(false), error = ref('')
const lookupError = ref(''), lookupMessage = ref('')
const resources = useInvoiceResources(), scopeName = useId(), formId = useId()
const touched = reactive({ identification: false, name: false, email: false })
const issues = computed(() => ({ identification: /^[A-Za-z0-9-]+$/.test(form.identification) ? '' : 'Ingresa la identificación sin espacios ni puntos.', name: form.name.trim() ? '' : 'Ingresa el nombre o la razón social.', email: !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Verifica el formato del correo.' }))
watch(recipients, values => {
    if (props.modelValue && !props.recipient && !form.identification) {
        const preferred = values.find(r => r.isDefault)
        if (preferred) Object.assign(form, preferred)
    }
})
function newRecipient() { Object.assign(form, empty()); form.id = undefined; error.value = '' }
watch(() => [props.modelValue, props.customerId], () => {
    if (props.modelValue) { Object.assign(form, empty(), props.recipient ?? {}); form.id = props.recipient?.id; error.value = ''; saveToCustomer.value = true; Object.assign(touched, { identification: false, name: false, email: false }) }
}, { immediate: true })
function selectRecipient(event: Event) {
    const selected = recipients.value.find(r => r.id === Number((event.target as HTMLSelectElement).value))
    Object.assign(form, empty(), selected ?? {}); form.id = selected?.id
}
watch(() => [props.modelValue, props.customerId, form.documentType, form.identification], () => {
    lookupError.value = ''; lookupMessage.value = ''
})
function findValue(data: unknown, keys: string[]): string | undefined {
    if (!data || typeof data !== 'object') return
    const record = data as Record<string, unknown>
    for (const key of keys) if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim()
    for (const value of Object.values(record)) { const found = findValue(value, keys); if (found) return found }
}
async function lookup() {
    const requestedIdentification = form.identification, requestedType = form.documentType, requestedCustomer = props.customerId
    lookingUp.value = true; lookupError.value = ''; lookupMessage.value = ''
    const isCurrent = () => props.modelValue && requestedCustomer === props.customerId && requestedIdentification === form.identification && requestedType === form.documentType
    try {
        const result = await electronicInvoicingApi.lookup(form.documentType, form.identification)
        if (!isCurrent()) return
        const name = findValue(result.data, ['customerName', 'name', 'fullname', 'business_name'])
        const email = findValue(result.data, ['customerEmail', 'email', 'billing_email'])
        if (name) form.name = name
        if (email) form.email = email
        if (!name) lookupError.value = 'No se encontraron datos. Verifica el tipo y número de identificación o completa los datos manualmente.'
        else lookupMessage.value = email ? 'Nombre y correo completados. Revisa los datos antes de guardar.' : 'Nombre completado. DIAN no devolvió un correo; puedes ingresarlo manualmente.'
    } catch (e) { if (isCurrent()) lookupError.value = (e as Error).message }
    finally { lookingUp.value = false }
}
async function save() {
    if (busy.value || !billingRecipientComplete(form)) { error.value = 'Completa los datos obligatorios y verifica el correo.'; return }
    busy.value = true; error.value = ''
    const customerId = props.customerId
    try {
        let recipient: BillingRecipient = { ...form, email: form.email || null }
        if (customerId && saveToCustomer.value) {
            const result = await electronicInvoicingApi.saveRecipient(customerId, recipient)
            if (!result.data) throw new Error(result.message || 'No se guardaron los datos.')
            recipient = result.data
            resources.updateRecipient(customerId, recipient)
        } else { recipient.id = undefined; recipient.isDefault = false }
        if (customerId !== props.customerId || !props.modelValue) return
        emit('saved', recipient); emit('update:modelValue', false)
    } catch (e) { error.value = (e as Error).message }
    finally { busy.value = false }
}
</script>

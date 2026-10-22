<template>
    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Facturación electrónica" :aria-busy="loading">
        <div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-semibold text-slate-900">Factura electrónica</h2><p class="mt-1 text-xs text-slate-500">Documentos y entrega al cliente.</p></div><BaseButton size="sm" variant="ghost" class="min-h-11" :loading="loading" @click="load">Actualizar</BaseButton></div>
        <BillingRecipientAccess :customer-id="customerId" v-model="recipient" order-context label="Datos de facturación" />
        <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">{{ error }}</p>
        <p v-if="message" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{{ message }}</p>
        <div v-if="!activeInvoice && status !== 'cancelled'" class="space-y-2"><BaseButton class="min-h-11" :disabled="!billingRecipientComplete(recipient) || !enabled || loading" :loading="busy" @click="requestConfirm = true">Solicitar factura electrónica</BaseButton><p v-if="!enabled && !loading" class="text-sm text-slate-500">La facturación no está activada. Puedes guardar los datos del cliente.</p><p v-else-if="!billingRecipientComplete(recipient)" class="text-sm text-slate-500">Completa los datos para solicitar la factura.</p></div>
        <p v-if="!documents.length && !loading" class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Este pedido aún no tiene documentos fiscales.</p>
        <p v-if="loading && !documents.length" role="status" class="animate-pulse rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Consultando documentos…</p>
        <article v-for="d in documents" :key="d.id" class="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2"><strong class="text-slate-900">{{ d.kind === 'credit' ? 'Nota crédito' : 'Factura' }} {{ d.number ? `${d.prefix}${d.number}` : 'por asignar' }}</strong><div class="flex flex-wrap gap-2"><span :class="invoiceStatusClass(d.status)" class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset">{{ invoiceStatusLabels[d.status] || d.status }}</span><span v-if="d.environment === 'sandbox'" class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">Pruebas</span></div></div>
            <div class="rounded-lg bg-slate-50 p-3 text-slate-600"><p class="font-medium text-slate-900">{{ invoiceRecipient(d.recipientJson)?.name || 'Destinatario del documento' }}</p><p>{{ invoiceRecipient(d.recipientJson)?.identification }}</p><p class="break-all">{{ invoiceRecipient(d.recipientJson)?.email || 'Sin correo · descarga al validarse' }}</p><p v-if="d.issuedAt" class="mt-1 text-xs">Validada {{ formatDate(d.issuedAt) }}</p></div>
            <p class="text-slate-600">{{ emailLabel(d) }}</p>
            <p v-if="d.status === 'scheduled'" class="text-amber-900">Se emitirá cuando el pedido figure como entregado.</p>
            <p v-if="d.status === 'verifying'" class="text-amber-900">Estamos comprobando el mismo consecutivo. No solicites otra factura.</p>
            <p v-if="d.creditRequested && d.status === 'issued'" class="text-amber-800">Anulación fiscal solicitada. Requiere nota crédito autorizada por administración.</p>
            <p v-if="d.lastError" class="text-red-700">{{ d.lastError }}</p>
            <div class="flex flex-wrap gap-2">
                <BaseButton v-if="d.hasPdf" class="min-h-11" :disabled="busy" @click="download(d, 'pdf')">Ver PDF / imprimir</BaseButton>
                <BaseButton v-if="['issued', 'credited'].includes(d.status) && invoiceRecipient(d.recipientJson)?.email" class="min-h-11" variant="outline" :disabled="busy" @click="action(d, 'email')">Reenviar correo</BaseButton>
                <BaseButton v-if="['pending', 'processing', 'verifying'].includes(d.status)" class="min-h-11" variant="outline" :disabled="busy" @click="action(d, 'retry')">Consultar estado</BaseButton>
                <BaseButton v-if="d.status === 'rejected'" class="min-h-11" variant="outline" :disabled="busy || d.kind === 'invoice' && !billingRecipientComplete(recipient)" @click="action(d, 'retry', d.kind === 'invoice' ? recipient : null)">{{ d.kind === 'credit' ? 'Reintentar nota crédito' : 'Reintentar con los datos seleccionados' }}</BaseButton>
            </div>
            <details class="border-t border-slate-100 pt-2"><summary class="min-h-11 cursor-pointer py-3 font-medium text-slate-600">Detalles y otras acciones</summary><div class="space-y-3 pb-1"><p v-if="d.cufe" class="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">CUFE/CUDE: {{ d.cufe }}</p><div class="flex flex-wrap gap-2"><BaseButton v-if="d.hasXml" class="min-h-11" variant="outline" :disabled="busy" @click="download(d, 'xml')">Descargar XML</BaseButton><BaseButton v-if="canCredit && d.kind === 'invoice' && d.status === 'issued'" class="min-h-11 text-red-700" variant="ghost" :disabled="busy" @click="creditDocument = d; creditReason = ''; error = ''">Anular con nota crédito</BaseButton></div></div></details>
        </article>
        <BaseDialog v-model="requestConfirm" :dismissible="!busy" title="Confirmar solicitud de factura" z-class="z-[80]"><div class="space-y-4 text-sm"><p class="font-semibold">{{ recipient?.name }} · {{ recipient?.identification }}</p><p>{{ recipient?.email || 'Sin correo: descarga la factura desde el pedido al validarse.' }}</p><p>La solicitud se procesará en segundo plano. Los pedidos programados esperan a la entrega.</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p><div class="flex flex-wrap justify-end gap-2"><BaseButton variant="outline" :disabled="busy" @click="requestConfirm = false">Volver</BaseButton><BaseButton :loading="busy" @click="request">Confirmar factura</BaseButton></div></div></BaseDialog>
        <BaseDialog :model-value="!!creditDocument" @update:model-value="creditDocument = null" :dismissible="!busy" title="Autorizar nota crédito total" z-class="z-[80]">
            <form class="space-y-4" @submit.prevent="authorizeCredit">
                <p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Se solicitará anular {{ creditDocument?.prefix }}{{ creditDocument?.number }} por completo. Podrás corregir importes cuando DIAN valide la nota crédito.</p>
                <label class="block">Motivo<textarea v-model.trim="creditReason" required minlength="5" maxlength="500" class="block w-full rounded border p-2" /></label>
                <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
                <div class="flex flex-wrap justify-end gap-2"><BaseButton variant="outline" :disabled="busy" @click="creditDocument = null">Cancelar</BaseButton><BaseButton type="submit" variant="danger" :loading="busy">Autorizar nota crédito</BaseButton></div>
            </form>
        </BaseDialog>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BillingRecipientAccess from '@/components/customers/BillingRecipientAccess.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { useAuthStore } from '@/store/auth'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import { billingRecipientComplete } from '@/composables/useBillingRecipients'
import { invoiceRecipient, invoiceStatusClass } from '@/helpers/invoicePresentation'
import { invoiceStatusLabels, type BillingRecipient, type InvoiceDocument } from '@/types/electronicInvoicing'
const props = defineProps<{ orderId: number; customerId?: number | null; status: string }>()
const auth = useAuthStore()
const resources = useInvoiceResources()
const canCredit = computed(() => auth.isSuperadmin || auth.userRole === 'Admin')
const recipient = ref<BillingRecipient | null>(null), documents = ref<InvoiceDocument[]>([])
const loading = ref(false), busy = ref(false), enabled = ref(false), error = ref(''), message = ref(''), requestConfirm = ref(false)
const creditDocument = ref<InvoiceDocument | null>(null), creditReason = ref('')
const activeInvoice = computed(() => documents.value.some(d => d.kind === 'invoice' && !['credited', 'cancelled'].includes(d.status)))
let generation = 0, timer: ReturnType<typeof setInterval> | undefined
const formatDate = (date: string) => new Date(date).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })
function emailLabel(d: InvoiceDocument) {
    if (!invoiceRecipient(d.recipientJson)?.email) return 'Sin envío por correo'
    if (d.emailStatus === 'accepted') return 'Correo aceptado por Plemsi; no confirma recepción en el buzón'
    return d.lastError && d.emailStatus === 'pending' && ['issued', 'credited'].includes(d.status) ? 'Correo pendiente de reintento; la factura sigue validada' : 'Correo pendiente'
}
async function load() {
    const current = ++generation; loading.value = true; error.value = ''
    try {
        const [docs, availability] = await Promise.allSettled([api.documents(props.orderId), resources.getAvailability()])
        if (current !== generation) return
        if (docs.status === 'fulfilled') documents.value = docs.value.data ?? []
        else error.value = (docs.reason as Error).message
        enabled.value = availability.status === 'fulfilled' && availability.value.enabled
        if (availability.status === 'rejected' && !error.value) error.value = 'No pudimos verificar si se pueden emitir nuevas facturas. El historial sigue disponible; vuelve a actualizar.'
    } catch (e) { if (current === generation) error.value = (e as Error).message }
    finally { if (current === generation) loading.value = false }
}
async function run(operation: () => Promise<unknown>, success: string, refresh = true) {
    if (busy.value) return false
    const orderId = props.orderId
    busy.value = true; error.value = ''; message.value = ''
    try { await operation(); if (orderId !== props.orderId) return false; if (refresh) await load(); message.value = success; return true } catch (e) { if (orderId === props.orderId) error.value = (e as Error).message; return false }
    finally { busy.value = false }
}
async function request() { if (billingRecipientComplete(recipient.value) && await run(() => api.request(props.orderId, recipient.value!), 'Solicitud guardada. El documento se procesará en segundo plano.')) requestConfirm.value = false }
function action(d: InvoiceDocument, action: 'retry' | 'email', data: unknown = null) { void run(() => api.documentAction(d.id, action, data), action === 'email' ? 'Reenvío solicitado al correo del documento original.' : 'Consulta solicitada para el mismo documento.') }
function download(d: InvoiceDocument, format: 'pdf' | 'xml') { void run(() => api.download(d.id, format, `${d.prefix}${d.number}`), 'Archivo descargado.', false) }
async function authorizeCredit() {
    if (creditDocument.value && await run(() => api.documentAction(creditDocument.value!.id, 'credit', { reason: creditReason.value }), 'Nota crédito solicitada. Espera su validación antes de corregir el pedido.')) creditDocument.value = null
}
function refreshVisible() { if (document.visibilityState !== 'hidden' && !busy.value && !loading.value) void load() }
watch(() => props.orderId, () => { recipient.value = null; documents.value = []; message.value = ''; requestConfirm.value = false; creditDocument.value = null; void load() }, { immediate: true })
onMounted(() => { document.addEventListener('visibilitychange', refreshVisible); timer = setInterval(() => { if (documents.value.some(d => ['scheduled', 'pending', 'processing', 'verifying'].includes(d.status) || d.emailStatus === 'pending' || ['issued', 'credited'].includes(d.status) && (!d.hasXml || d.kind === 'invoice' && !d.hasPdf))) refreshVisible() }, 10000) })
onUnmounted(() => { generation++; clearInterval(timer); document.removeEventListener('visibilitychange', refreshVisible) })
</script>

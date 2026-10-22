<template>
    <section class="rounded-xl border border-slate-200 bg-white px-3 py-2" aria-label="Facturación electrónica" :aria-busy="loading">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 class="text-sm font-semibold text-slate-900">Factura electrónica</h2>
            <BillingRecipientAccess :customer-id="customerId" v-model="recipient" order-context compact label="Datos de facturación" class="min-w-0 flex-1" />
            <BaseButton v-if="!activeInvoice && status !== 'cancelled'" size="sm" class="min-h-11" :disabled="!billingRecipientComplete(recipient) || !enabled || loading || stale || !order" :loading="busy" @click="requestConfirm = true">Solicitar factura electrónica</BaseButton>
            <BaseButton v-if="documents.length" size="sm" variant="outline" class="min-h-11" @click="showHistory = true">Ver avance y detalle<span class="sr-only"> de factura</span></BaseButton>
            <BaseButton v-if="latestInvoice?.hasPdf" size="sm" class="min-h-11" :disabled="busy" @click="download(latestInvoice, 'pdf')">Descargar copia PDF</BaseButton>
            <BaseButton size="sm" variant="ghost" class="min-h-11" :loading="loading" @click="load">Actualizar</BaseButton>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-1 text-xs text-slate-500">
            <template v-if="latestInvoice"><span :class="invoiceStatusClass(latestInvoice.status)" class="rounded-full px-2 py-0.5 ring-1 ring-inset">{{ latestInvoice.prefix }}{{ latestInvoice.number || '' }} · {{ invoiceStatusLabels[latestInvoice.status] || latestInvoice.status }}</span><InvoiceProgress :document="latestInvoice" compact /><span v-if="['issued', 'credited'].includes(latestInvoice.status) && !latestInvoice.hasPdf">Preparando copia PDF…</span></template>
            <span v-else-if="loading" role="status">Consultando documentos…</span>
            <span v-else-if="stale">Actualiza el pedido antes de solicitar la factura.</span>
            <span v-else-if="!enabled">La facturación no está activada.</span>
            <span v-else-if="!billingRecipientComplete(recipient)">Completa los datos para solicitar la factura.</span>
            <span v-else>Sin factura emitida · Revisa el pedido antes de confirmar.</span>
            <span v-if="error" role="alert" class="text-red-700">{{ error }}</span><span v-if="message" role="status" class="text-emerald-700">{{ message }}</span>
        </div>
        <BaseDialog v-model="showHistory" title="Avance y documentos de facturación" size="3xl" scroll-body z-class="z-[80]">
        <div class="space-y-4">
        <article v-for="d in documents" :key="d.id" class="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2"><strong class="text-slate-900">{{ d.kind === 'credit' ? 'Nota crédito' : 'Factura' }} {{ d.number ? `${d.prefix}${d.number}` : 'por asignar' }}</strong><div class="flex flex-wrap gap-2"><span :class="invoiceStatusClass(d.status)" class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset">{{ invoiceStatusLabels[d.status] || d.status }}</span><span v-if="d.environment === 'sandbox'" class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">Pruebas</span></div></div>
            <div class="rounded-lg bg-slate-50 p-3 text-slate-600"><p class="font-medium text-slate-900">{{ invoiceRecipient(d.recipientJson)?.name || 'Destinatario del documento' }}</p><p>{{ invoiceRecipient(d.recipientJson)?.identification }}</p><p class="break-all">{{ invoiceRecipient(d.recipientJson)?.email || 'Sin correo · descarga al validarse' }}</p><p v-if="d.issuedAt" class="mt-1 text-xs">Validada {{ formatDate(d.issuedAt) }}</p></div>
            <p class="text-slate-600">{{ emailLabel(d) }}</p>
            <p v-if="d.emailError" role="alert" class="text-sm text-amber-900">{{ d.emailError }}</p>
            <InvoiceProgress :document="d" />
            <p v-if="d.submittedAt && !d.dianRejected && !['issued', 'credited'].includes(d.status)" class="text-xs text-slate-500">La transmisión a Plemsi no confirma todavía la recepción ni la aceptación por DIAN.</p>
            <p v-if="d.status === 'scheduled'" class="text-amber-900">Se emitirá cuando el pedido figure como entregado.</p>
            <p v-if="d.status === 'verifying'" class="text-amber-900">Estamos comprobando el mismo consecutivo. No solicites otra factura.</p>
            <p v-if="d.creditRequested && d.status === 'issued'" class="text-amber-800">Anulación fiscal solicitada. Requiere nota crédito autorizada por administración.</p>
            <p v-if="d.lastError" role="alert" class="whitespace-pre-line break-words text-red-700">{{ d.lastError }}</p>
            <div class="flex flex-wrap gap-2">
                <BaseButton v-if="d.hasPdf" class="min-h-11" :disabled="busy" @click="download(d, 'pdf')">Descargar copia PDF</BaseButton>
                <span v-else-if="['issued', 'credited'].includes(d.status) && d.kind === 'invoice'" role="status" class="py-3 text-slate-500">Preparando copia PDF…</span>
                <BaseButton v-if="['issued', 'credited'].includes(d.status) && invoiceRecipient(d.recipientJson)?.email" class="min-h-11" variant="outline" :disabled="busy || !d.hasPdf || !d.hasXml || ['queued', 'processing', 'verifying'].includes(d.emailStatus)" @click="emailDocument = d">{{ ['queued', 'processing'].includes(d.emailStatus) ? 'Correo en cola' : d.emailStatus === 'verifying' ? 'Envío por verificar' : 'Reenviar correo' }}</BaseButton>
                <BaseButton v-if="['pending', 'processing', 'verifying'].includes(d.status)" class="min-h-11" variant="outline" :disabled="busy" @click="action(d, 'retry')">Consultar estado</BaseButton>
                <BaseButton v-if="d.status === 'rejected'" class="min-h-11" variant="outline" :disabled="busy || d.kind === 'invoice' && !billingRecipientComplete(recipient)" @click="action(d, 'retry', d.kind === 'invoice' ? recipient : null)">{{ d.kind === 'credit' ? 'Reintentar nota crédito' : 'Reintentar con los datos seleccionados' }}</BaseButton>
            </div>
            <details class="border-t border-slate-100 pt-2"><summary class="min-h-11 cursor-pointer py-3 font-medium text-slate-600">Pedido facturado y otras acciones</summary><div class="space-y-3 pb-1"><InvoiceOrderSummary v-if="invoiceSnapshotSummary(d.snapshotJson)" :summary="invoiceSnapshotSummary(d.snapshotJson)!" /><p v-else class="text-slate-500">El resumen histórico quedará disponible al preparar el documento.</p><p v-if="d.cufe" class="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">CUFE/CUDE: {{ d.cufe }}</p><div class="flex flex-wrap gap-2"><BaseButton v-if="d.hasXml" class="min-h-11" variant="outline" :disabled="busy" @click="download(d, 'xml')">Descargar XML</BaseButton><BaseButton v-if="canCredit && d.kind === 'invoice' && d.status === 'issued'" class="min-h-11 text-red-700" variant="ghost" :disabled="busy" @click="creditDocument = d; creditReason = ''; error = ''">Anular con nota crédito</BaseButton></div></div></details>
        </article>
        </div><template #footer><BaseButton variant="outline" @click="showHistory = false">Cerrar detalle</BaseButton></template>
        </BaseDialog>
        <BaseDialog v-model="requestConfirm" :dismissible="!busy" title="Revisar y confirmar factura" size="3xl" scroll-body z-class="z-[80]">
            <div class="space-y-4 text-sm"><div class="rounded-xl bg-slate-50 p-4"><p class="text-xs uppercase tracking-wide text-slate-500">Destinatario de la factura</p><p class="mt-1 font-semibold">{{ recipient?.name }} · {{ recipient?.identification }}</p><p class="break-all text-slate-600">{{ recipient?.email || 'Sin correo: podrás descargar el PDF al validarse.' }}</p></div><InvoiceOrderSummary v-if="order" :summary="invoiceOrderSummary(order)" /><p class="text-xs text-slate-500">Vista previa del pedido guardado. La fecha fiscal será la de emisión; los pedidos programados esperan a la entrega. Los descuentos se incorporan a los precios finales, conservando regalos y domicilio. El PDF personalizado con QR y CUFE estará disponible tras la validación DIAN.</p><p v-if="stale" role="alert" class="text-amber-800">El pedido cambió. Cierra esta vista y actualízalo antes de confirmar.</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p></div>
            <template #footer><p v-if="order" class="mr-auto self-center text-sm text-slate-500">Total a facturar <strong class="ml-2 whitespace-nowrap text-lg text-slate-900">{{ new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(order.total) }}</strong></p><BaseButton variant="outline" :disabled="busy" @click="requestConfirm = false">Volver</BaseButton><BaseButton :loading="busy" :disabled="stale || !order" @click="request">Confirmar factura</BaseButton></template>
        </BaseDialog>
        <BaseDialog :model-value="!!creditDocument" @update:model-value="creditDocument = null" :dismissible="!busy" title="Autorizar nota crédito total" z-class="z-[90]">
            <form class="space-y-4" @submit.prevent="authorizeCredit">
                <p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Se solicitará anular {{ creditDocument?.prefix }}{{ creditDocument?.number }} por completo. Podrás corregir importes cuando DIAN valide la nota crédito.</p>
                <label class="block">Motivo<textarea v-model.trim="creditReason" required minlength="5" maxlength="500" class="block w-full rounded border p-2" /></label>
                <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
                <div class="flex flex-wrap justify-end gap-2"><BaseButton variant="outline" :disabled="busy" @click="creditDocument = null">Cancelar</BaseButton><BaseButton type="submit" variant="danger" :loading="busy">Autorizar nota crédito</BaseButton></div>
            </form>
        </BaseDialog>
        <BaseDialog :model-value="!!emailDocument" @update:model-value="emailDocument = null" title="Reenviar factura por correo" :dismissible="!busy" z-class="z-[90]">
            <div class="space-y-4 text-sm"><p>Se enviará un mensaje con el PDF personalizado y el XML validado a <strong class="break-all">{{ emailDocument ? invoiceRecipient(emailDocument.recipientJson)?.email : '' }}</strong>.</p><p>Esto no emitirá otra factura. Plemsi no enviará un correo adicional.</p><p v-if="emailDocument?.emailStatus === 'accepted'" class="text-amber-900">Plemsi ya envió una copia anteriormente. Confirma solo si necesitas enviar otra copia con el nuevo diseño.</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p><div class="flex justify-end gap-2"><BaseButton variant="outline" :disabled="busy" @click="emailDocument = null">Cancelar</BaseButton><BaseButton :loading="busy" @click="resendEmail">Confirmar reenvío</BaseButton></div></div>
        </BaseDialog>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BillingRecipientAccess from '@/components/customers/BillingRecipientAccess.vue'
import InvoiceOrderSummary from './InvoiceOrderSummary.vue'
import InvoiceProgress from './InvoiceProgress.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { useAuthStore } from '@/store/auth'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import { billingRecipientComplete } from '@/composables/useBillingRecipients'
import { invoiceRecipient, invoiceStatusClass, invoiceOrderSummary, invoiceSnapshotSummary } from '@/helpers/invoicePresentation'
import type { OrderDetailView } from '@/types/order'
import { invoiceStatusLabels, type BillingRecipient, type InvoiceDocument } from '@/types/electronicInvoicing'
const props = defineProps<{ orderId: number; customerId?: number | null; status: string; order?: OrderDetailView; stale?: boolean }>()
const auth = useAuthStore()
const resources = useInvoiceResources()
const canCredit = computed(() => auth.isSuperadmin || auth.userRole === 'Admin')
const recipient = ref<BillingRecipient | null>(null), documents = ref<InvoiceDocument[]>([])
const loading = ref(false), busy = ref(false), enabled = ref(false), error = ref(''), message = ref(''), requestConfirm = ref(false)
const creditDocument = ref<InvoiceDocument | null>(null), creditReason = ref('')
const emailDocument = ref<InvoiceDocument | null>(null)
const activeInvoice = computed(() => documents.value.some(d => d.kind === 'invoice' && !['credited', 'cancelled'].includes(d.status)))
const latestInvoice = computed(() => documents.value.find(d => d.kind === 'invoice'))
const showHistory = ref(false)
let generation = 0, timer: ReturnType<typeof setInterval> | undefined
const formatDate = (date: string) => new Date(date).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })
function emailLabel(d: InvoiceDocument) {
    if (!invoiceRecipient(d.recipientJson)?.email) return 'Sin envío por correo'
    if (d.emailStatus === 'accepted') return 'Correo aceptado por Plemsi; no confirma recepción en el buzón'
    if (d.emailStatus === 'sent') return 'PDF personalizado y XML aceptados para envío por correo; no confirma recepción en el buzón'
    if (['queued', 'processing'].includes(d.emailStatus)) return 'PDF personalizado y XML en cola de correo. Plemsi no enviará otro mensaje.'
    if (d.emailStatus === 'failed') return 'No se pudo enviar el correo. La factura conserva su validación DIAN.'
    if (d.emailStatus === 'verifying') return 'Verifica el resultado del correo antes de reenviar para evitar duplicados.'
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
async function request() { if (!props.stale && props.order && billingRecipientComplete(recipient.value) && await run(() => api.request(props.orderId, recipient.value!), 'Solicitud guardada. El documento se procesará en segundo plano.')) { requestConfirm.value = false; showHistory.value = true } }
function action(d: InvoiceDocument, action: 'retry' | 'email', data: unknown = null) { void run(() => api.documentAction(d.id, action, data), action === 'email' ? 'Reenvío solicitado al correo del documento original.' : d.status === 'rejected' ? 'Reintento solicitado con los datos corregidos y el mismo consecutivo.' : 'Consulta solicitada para el mismo documento.') }
async function resendEmail() { if (emailDocument.value && await run(() => api.documentAction(emailDocument.value!.id, 'email'), 'Correo en cola con PDF y XML.')) emailDocument.value = null }
function download(d: InvoiceDocument, format: 'pdf' | 'xml') { void run(() => api.download(d.id, format, `${d.prefix}${d.number}`), 'Archivo descargado.', false) }
async function authorizeCredit() {
    if (creditDocument.value && await run(() => api.documentAction(creditDocument.value!.id, 'credit', { reason: creditReason.value }), 'Nota crédito solicitada. Espera su validación antes de corregir el pedido.')) creditDocument.value = null
}
function refreshVisible() { if (document.visibilityState !== 'hidden' && !busy.value && !loading.value) void load() }
watch(() => props.orderId, () => { recipient.value = null; documents.value = []; message.value = ''; requestConfirm.value = false; showHistory.value = false; creditDocument.value = null; emailDocument.value = null; void load() }, { immediate: true })
onMounted(() => { document.addEventListener('visibilitychange', refreshVisible); timer = setInterval(() => { if (documents.value.some(d => ['scheduled', 'pending', 'processing', 'verifying'].includes(d.status) || ['pending', 'queued', 'processing'].includes(d.emailStatus) || ['issued', 'credited'].includes(d.status) && (!d.hasXml || !d.hasPdf))) refreshVisible() }, 10000) })
onUnmounted(() => { generation++; clearInterval(timer); document.removeEventListener('visibilitychange', refreshVisible) })
</script>

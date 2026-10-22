<template>
    <section class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-xl font-semibold text-slate-900">Facturación electrónica del negocio</h2><p class="mt-1 text-sm text-slate-500">Un emisor para todas tus sucursales.</p></div><span :class="form.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'" class="rounded-full px-3 py-1 text-sm font-medium">{{ form.isActive ? 'Integración activa' : 'Emisión desactivada' }}</span></div>
        <p class="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">Ambiente {{ form.environment === 'sandbox' ? 'de pruebas' : 'de producción' }} · Sin IVA ni INC.<span v-if="!form.productionEnabled" class="mt-1 block font-medium">La emisión real está bloqueada en el servidor mientras completamos las pruebas con Plemsi.</span></p>
        <p v-if="!auth.isSuperadmin" class="text-sm">Solo Superadmin puede configurar proveedores de facturación.</p>
        <p v-if="error" role="alert" class="sticky top-0 z-10 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">{{ error }}</p>
        <p v-if="message" role="status" class="sticky top-0 z-10 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">{{ message }}</p>
        <template v-if="auth.isSuperadmin">
            <div class="flex flex-wrap gap-2"><BaseButton v-for="i in integrations" :key="i.id" variant="outline" size="sm" :disabled="busy" @click="edit(i)">{{ i.name }} · {{ i.isActive ? 'Activa' : 'Inactiva' }} · {{ i.environment === 'production' ? 'Producción' : 'Pruebas' }}</BaseButton><BaseButton size="sm" variant="outline" :disabled="busy" @click="edit()">Registrar proveedor Plemsi</BaseButton></div>
            <ol class="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Preparación de facturación"><li v-for="step in readiness" :key="step.label" :class="step.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'" class="rounded-xl border p-3 text-sm"><span class="font-semibold">{{ step.ready ? '✓' : '○' }} {{ step.label }}</span><p class="mt-1 text-xs">{{ step.detail }}</p></li></ol>
            <p v-if="dirty && form.id" role="status" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Hay cambios sin guardar. Guarda antes de consultar o activar.</p>
            <form class="space-y-5" @submit.prevent="save">
                <fieldset class="rounded-2xl border border-slate-200 p-4 sm:p-5"><legend class="px-2 font-semibold text-slate-900">1. Conexión con Plemsi</legend><p class="mb-4 text-sm text-slate-500">Usa la API key de esta empresa autorizada por Plemsi para el ambiente seleccionado.</p><div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label class="text-sm">Nombre de integración<input v-model.trim="form.name" required maxlength="100" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Ambiente<select v-model="form.environment" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy"><option value="sandbox">Pruebas</option><option value="production" :disabled="!form.productionEnabled">Producción</option></select></label>
                    <label class="text-sm">Token API de Plemsi<input v-model.trim="form.token" type="password" autocomplete="new-password" :placeholder="form.hasToken ? 'Guardado; dejar vacío para conservar' : 'Token de esta empresa'" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    </div><div v-if="form.id" class="mt-4 flex flex-wrap items-center gap-3"><BaseButton type="button" variant="outline" class="min-h-11" :disabled="busy || dirty" @click="action('test')">Probar conexión y emisor</BaseButton><span class="text-xs text-slate-500">{{ form.testedAt ? 'Conexión verificada: ' + formatDate(form.testedAt) : 'Conexión pendiente de validar' }}</span></div></fieldset>
                <fieldset class="rounded-2xl border border-slate-200 p-4 sm:p-5"><legend class="px-2 font-semibold text-slate-900">2. Datos del emisor</legend><div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label class="text-sm">NIT del emisor, sin dígito de verificación<input v-model.trim="form.taxId" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Nombre o razón social del emisor<input v-model.trim="form.legalName" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Correo de facturación del emisor<input v-model.trim="form.billingEmail" type="email" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    </div><p class="mt-3 text-xs text-slate-500">Plemsi enviará los mensajes. El correo empresarial no garantiza un remitente “De” personalizado.</p><BaseButton v-if="form.id" type="button" class="mt-4 min-h-11" variant="outline" :disabled="busy || dirty" @click="action('email')">Sincronizar correo guardado</BaseButton></fieldset>
                <fieldset class="rounded-2xl border border-slate-200 p-4 sm:p-5"><legend class="px-2 font-semibold text-slate-900">3. Numeración</legend><p class="mb-4 text-sm text-slate-500">Usa una numeración dedicada a este sistema. El próximo consecutivo debe estar confirmado por Plemsi.</p><BaseButton v-if="form.id" type="button" variant="outline" class="mb-4 min-h-11" :disabled="busy || dirty" @click="action('resolutions')">Consultar numeraciones y folios</BaseButton>
                    <div v-if="numberingLoaded && !resolutions.length" role="status" class="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Plemsi no devolvió numeraciones reconocibles. Verifica la habilitación con soporte; no activaremos con una numeración sin confirmar.</div>
                    <div v-if="resolutions.length" class="mb-4 space-y-2"><button v-for="r in resolutions" :key="r.resolution + r.prefix" type="button" class="block w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm hover:border-emerald-500" :disabled="form.isActive || busy" @click="chooseResolution(r)"><strong>{{ r.prefix }} · {{ r.resolution }}</strong><span class="mt-1 block text-slate-500">Rango {{ r.from }}–{{ r.to }} · Vence {{ r.validUntil?.slice(0, 10) || 'Sin confirmar' }}</span><span class="mt-1 block text-emerald-700">{{ r.nextNumber != null ? 'Siguiente confirmado: ' + r.nextNumber : 'Próximo consecutivo sin confirmar' }} · Seleccionar</span></button></div>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2"><label class="text-sm">Resolución de facturación<input v-model.trim="form.resolution" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Prefijo de facturas<input v-model.trim="form.prefix" maxlength="16" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Próximo consecutivo de factura<input v-model.number="form.nextNumber" type="number" min="1" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Último consecutivo autorizado<input v-model.number="form.lastNumber" type="number" min="0" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Vigencia de numeración<input v-model="expiry" type="date" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Prefijo de notas crédito<input v-model.trim="form.creditPrefix" maxlength="16" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                    <label class="text-sm">Próximo consecutivo de nota crédito<input v-model.number="form.nextCreditNumber" type="number" min="1" required class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 focus:border-emerald-500 focus:outline-emerald-500" :disabled="form.isActive || busy" /></label>
                </div>
                <p v-if="remainingNumbers" class="text-sm text-slate-600">Folios disponibles: {{ remainingNumbers }}</p>
                <p class="text-xs text-slate-500">Una integración con documentos conserva emisor, ambiente y consecutivos. Para otra numeración registra una nueva integración.</p></fieldset>
                <fieldset class="rounded-2xl border border-slate-200 p-4 sm:p-5"><legend class="px-2 font-semibold text-slate-900">4. Guardado y activación</legend>
                    <label v-if="form.environment === 'production'" class="mb-4 flex items-start gap-2 text-sm"><input v-model="form.productionReady" type="checkbox" :disabled="form.isActive || !form.productionEnabled" />Confirmo que Plemsi y DIAN habilitaron al emisor, la firma digital y la resolución para producción.</label>
                    <p class="mb-4 text-sm text-slate-500">Guardar no activa la emisión. Al activar verificaremos nuevamente la resolución, el prefijo, el rango y el consecutivo con Plemsi.</p>
                    <div class="flex flex-wrap gap-3"><BaseButton type="submit" class="min-h-11" :loading="busy" :disabled="form.isActive || busy">Guardar configuración</BaseButton><BaseButton v-if="form.id" type="button" class="min-h-11" :variant="form.isActive ? 'outline' : 'primary'" :disabled="busy || dirty || !form.isActive && !readyToActivate" @click="numberingConfirmed = false; confirmActivation = true">{{ form.isActive ? 'Desactivar integración' : form.environment === 'sandbox' ? 'Activar pruebas' : 'Activar producción' }}</BaseButton></div>
                    <p v-if="!form.isActive && !readyToActivate" class="mt-3 text-xs text-amber-800">Completa conexión, emisor y numeración antes de activar. Producción requiere además habilitación en el servidor.</p>
                    <a href="https://ayuda.plemsi.com/para-empezar/habilitar-documentos-electronicos-dian" target="_blank" rel="noopener noreferrer" class="mt-4 inline-block text-sm text-emerald-700 underline">Guía Plemsi / DIAN</a>
                </fieldset>
            </form>
        </template>
        <BaseDialog v-model="confirmActivation" :dismissible="!busy" :title="form.isActive ? 'Desactivar facturación' : 'Activar facturación en ' + (form.environment === 'sandbox' ? 'pruebas' : 'producción')"><div class="space-y-4 text-sm"><p>{{ form.isActive ? 'No se aceptarán nuevas solicitudes con esta integración. Los documentos pendientes conservan su historial y procesamiento.' : 'Las solicitudes confirmadas por el cajero se enviarán a Plemsi en el ambiente seleccionado.' }}</p><p class="font-medium">{{ form.legalName }} · {{ form.taxId }} · {{ form.prefix }}</p><p v-if="!form.isActive" class="rounded-xl bg-amber-50 p-3 text-amber-950">Próximo documento: {{ form.prefix }}{{ form.nextNumber }} · Resolución {{ form.resolution }}.</p><label v-if="!form.isActive" class="flex items-start gap-2"><input v-model="numberingConfirmed" type="checkbox" :disabled="busy" />Verifiqué el último consecutivo en DIAN y en el proveedor anterior. Este número está disponible y esta numeración será exclusiva de este sistema.</label><p v-if="error" role="alert" class="text-red-700">{{ error }}</p><div class="flex justify-end gap-2"><BaseButton variant="outline" :disabled="busy" @click="confirmActivation = false">Cancelar</BaseButton><BaseButton :loading="busy" :disabled="!form.isActive && !numberingConfirmed" @click="activate">Confirmar</BaseButton></div></div></BaseDialog>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import { useAuthStore } from '@/store/auth'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import type { InvoiceIntegration, InvoiceNumbering } from '@/types/electronicInvoicing'
const auth = useAuthStore(), integrations = ref<InvoiceIntegration[]>([]), productionEnabled = ref(false), numberingConfirmed = ref(false)
const empty = (): InvoiceIntegration => ({ name: 'Plemsi', environment: 'sandbox', token: '', taxId: '', legalName: '', billingEmail: '', resolution: '', prefix: '', nextNumber: 1, lastNumber: 0, creditPrefix: 'NC', nextCreditNumber: 1, productionReady: false })
const form = reactive<InvoiceIntegration>(empty()), expiry = ref(''), busy = ref(false), error = ref(''), message = ref('')
const resolutions = ref<InvoiceNumbering[]>([])
const resources = useInvoiceResources(), numberingLoaded = ref(false), confirmActivation = ref(false), savedState = ref('')
const fingerprint = () => JSON.stringify({ ...form, validUntil: expiry.value })
const dirty = computed(() => fingerprint() !== savedState.value)
const readiness = computed(() => [
    { label: 'Conexión', ready: !!form.hasToken && !!form.testedAt, detail: form.testedAt ? 'Token y NIT verificados' : 'Token de empresa y validación' },
    { label: 'Emisor', ready: !!form.taxId && !!form.legalName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.billingEmail), detail: 'Identidad y correo empresarial' },
    { label: 'Numeración', ready: !!form.resolution && !!form.prefix && form.nextNumber > 0 && form.nextNumber <= form.lastNumber && !!expiry.value && expiry.value >= new Date().toISOString().slice(0, 10), detail: 'Rango y vigencia por verificar al activar' },
    { label: 'Activación', ready: !!form.isActive, detail: form.isActive ? 'Solicitudes habilitadas' : 'Requiere confirmación' },
])
const readyToActivate = computed(() => readiness.value.slice(0, 3).every(s => s.ready) && (form.environment === 'sandbox' || form.productionEnabled && form.productionReady))
const formatDate = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
const remainingNumbers = ref('')
function edit(i?: InvoiceIntegration) { for (const key of Object.keys(form)) delete (form as unknown as Record<string, unknown>)[key]; Object.assign(form, empty(), { productionEnabled: productionEnabled.value }, i ?? {}, { token: '' }); expiry.value = i?.validUntil?.slice(0, 10) || ''; resolutions.value = []; numberingLoaded.value = false; remainingNumbers.value = ''; savedState.value = fingerprint() }
async function load() { const [list, availability] = await Promise.all([api.integrations(), api.availability()]); integrations.value = list.data ?? []; productionEnabled.value = availability.data?.productionEnabled === true }
async function save() {
    if (busy.value) return
    busy.value = true; error.value = ''; message.value = ''
    try {
        const result = await api.saveIntegration({ ...form, validUntil: expiry.value ? `${expiry.value}T23:59:59Z` : null })
        if (result.data) edit(result.data)
        await load(); message.value = 'Configuración guardada.'
    } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
async function action(name: 'test' | 'resolutions' | 'email' | 'activation', data?: unknown) {
    if (!form.id || busy.value || dirty.value) return
    busy.value = true; error.value = ''; message.value = ''
    try {
        const id = form.id, result = await api.integrationAction(id, name, data)
        await load(); const updated = integrations.value.find(i => i.id === id); if (updated) { Object.assign(form, updated); savedState.value = fingerprint() }
        if (name === 'resolutions') {
            const response = result.data as { resolutions?: InvoiceNumbering[]; nextNumber?: number | null }
            resolutions.value = response.resolutions ?? []; numberingLoaded.value = true
            const configured = resolutions.value.find(r => r.resolution === form.resolution && r.prefix === form.prefix)
            if (configured && response.nextNumber != null) configured.nextNumber = response.nextNumber
            const remaining = (result.data as { remaining?: unknown })?.remaining
            const findRemaining = (value: unknown): string => {
                if (typeof value === 'number') return String(value)
                if (value && typeof value === 'object') {
                    const r = value as Record<string, unknown>
                    for (const key of ['remaining', 'remaining_numbers', 'remainingNumbers', 'data']) { const found = findRemaining(r[key]); if (found) return found }
                }
                return ''
            }
            remainingNumbers.value = findRemaining(remaining)
        }
        if (name === 'activation') resources.invalidateAvailability()
        message.value = name === 'email' ? 'Correo empresarial sincronizado con Plemsi.' : name === 'test' ? 'Conexión y NIT verificados.' : name === 'activation' ? 'Estado actualizado.' : 'Numeraciones consultadas; selecciona y verifica los datos antes de guardar.'
    } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
function chooseResolution(r: InvoiceNumbering) {
    form.resolution = r.resolution; form.prefix = r.prefix; form.lastNumber = r.to
    form.nextNumber = r.nextNumber ?? 0
    expiry.value = r.validUntil?.slice(0, 10) || ''
    message.value = r.nextNumber == null ? 'Plemsi no informa el último consecutivo. Verifícalo en DIAN y en el proveedor anterior; escribe el próximo disponible antes de activar.' : 'Numeración seleccionada. Guarda y vuelve a consultar antes de activar.'
}
async function activate() { await action('activation', { enabled: !form.isActive, numberingConfirmed: numberingConfirmed.value }); if (!error.value) confirmActivation.value = false }
onMounted(async () => { if (auth.isSuperadmin) { try { await load(); edit(integrations.value[0]) } catch (e) { error.value = (e as Error).message } } })
</script>

<template>
    <div class="space-y-6">
        <BaseAlert v-if="!initial" type="info">
            <span class="text-sm">Sin datos de impresión en memoria. Recarga la página si acabas de crear la sucursal.</span>
        </BaseAlert>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Logo en ticket (opcional)</p>
            <p class="text-xs text-gray-500">
                PNG, JPEG, WebP o GIF; máximo 1,5 MB. Se guarda en el servidor y se usa en la impresión térmica.
            </p>
            <div v-if="logoPreviewSrc" class="flex items-start gap-4">
                <img :src="logoPreviewSrc" alt="Vista previa logo ticket" class="h-16 w-auto rounded border border-gray-200 bg-white object-contain" />
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                    class="text-sm text-gray-700" @change="onFilePick" />
                <BaseButton type="button" variant="primary" size="sm" :loading="uploadingLogo" :disabled="!pickedFile"
                    @click="uploadLogo">
                    Subir logo
                </BaseButton>
                <BaseButton v-if="initial?.receiptLogoPath" type="button" variant="outline" size="sm"
                    :loading="deletingLogo" @click="removeLogo">
                    Quitar logo
                </BaseButton>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.printerQueueKitchen" label="Cola Windows — Cocina"
                placeholder="Nombre exacto en Panel de impresión" :maxlength="128" />
            <BaseInput v-model="form.printerQueueDelivery" label="Cola Windows — Domicilio" :maxlength="128" />
            <BaseInput v-model="form.printerQueueCashier" label="Cola Windows — Caja (opcional)" :maxlength="128" />
        </div>

        <p class="text-xs text-gray-500">
            Si un campo queda vacío, el agente puede usar el valor de su archivo local como respaldo.
        </p>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Tipos de trabajo</p>
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableKitchenJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar comandas de cocina
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableDeliveryJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar tickets de domicilio
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableCashierJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar tickets de caja
                </label>
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Cabecera cocina (opcional)</p>
            <BaseInput v-model="form.kitchenHeaderLine1" label="Línea 1" :maxlength="80" />
            <BaseInput v-model="form.kitchenHeaderLine2" label="Línea 2" :maxlength="80" />
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenOrderNumber" type="checkbox" class="rounded border-gray-300" />
                    Mostrar número de pedido
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenTime" type="checkbox" class="rounded border-gray-300" />
                    Mostrar hora en cocina
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenNotes" type="checkbox" class="rounded border-gray-300" />
                    Mostrar notas de línea
                </label>
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Ticket domicilio / caja</p>
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowLineSubtotals" type="checkbox" class="rounded border-gray-300" />
                    Subtotales por línea
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowPayments" type="checkbox" class="rounded border-gray-300" />
                    Pagos en el ticket
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowLoyaltyFooter" type="checkbox" class="rounded border-gray-300" />
                    Pie de promoción / lealtad
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.cashierMirrorDeliveryLayout" type="checkbox" class="rounded border-gray-300" />
                    Caja usa plantilla similar a domicilio
                </label>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BaseInput v-model="form.footerMessageKitchen" label="Pie cocina" :maxlength="200" />
            <BaseInput v-model="form.footerMessageDelivery" label="Pie domicilio" :maxlength="200" />
            <BaseInput v-model="form.footerMessageCashier" label="Pie caja" :maxlength="200" />
        </div>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Ancho de papel por impresora (mm)</p>
            <p class="text-xs text-gray-500">
                Una configuración por cada cola: cocina, domicilio y caja pueden usar 58 o 80 mm.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                <BaseSelect
                    v-model="form.paperWidthMmKitchen"
                    :options="paperWidthOptions"
                    :searchable="false"
                    label="Cocina"
                    value-key="value"
                    display-key="label"
                    placeholder="Ancho"
                />
                <BaseSelect
                    v-model="form.paperWidthMmDelivery"
                    :options="paperWidthOptions"
                    :searchable="false"
                    label="Domicilio"
                    value-key="value"
                    display-key="label"
                    placeholder="Ancho"
                />
                <BaseSelect
                    v-model="form.paperWidthMmCashier"
                    :options="paperWidthOptions"
                    :searchable="false"
                    label="Caja"
                    value-key="value"
                    display-key="label"
                    placeholder="Ancho"
                />
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="text-sm">
                <p class="font-medium text-gray-900">Token del agente local</p>
                <p class="text-gray-600">
                    Estado:
                    <span :class="initial?.agentTokenConfigured ? 'text-green-700' : 'text-amber-700'">
                        {{ initial?.agentTokenConfigured ? 'Configurado' : 'Sin configurar' }}
                    </span>
                    <span v-if="initial?.agentTokenUpdatedAt" class="text-gray-500">
                        · Última rotación: {{ formatDt(initial.agentTokenUpdatedAt) }}
                    </span>
                </p>
            </div>
            <BaseButton type="button" variant="outline" size="sm" :loading="rotating" @click="onRotateClick">
                Regenerar token
            </BaseButton>
        </div>
        <p class="text-xs text-gray-500 -mt-1">
            El agente es un servicio/consola sin pantalla: el token solo vive en cada PC (archivo de configuración junto al ejecutable,
            User Secrets en desarrollo, o variable de entorno). Aquí solo se guarda el hash en el servidor.
        </p>

        <div class="flex justify-end pt-2">
            <BaseButton type="button" variant="primary" :loading="saving" @click="submit">
                Guardar impresión
            </BaseButton>
        </div>

        <BaseDialog v-model="showTokenModal" title="Nuevo token del agente" size="2xl">
            <BaseAlert type="warning" class="mb-3">
                <span class="text-sm">Copie el token ahora: no se volverá a mostrar en esta aplicación.</span>
            </BaseAlert>
            <p class="text-sm text-gray-700 mb-3">
                En cada equipo donde corre el agente (sin interfaz gráfica), pegue el valor en la configuración local del ejecutable
                <code class="text-xs bg-gray-100 px-1 rounded">SenorArrozPrintAgent</code>, por ejemplo:
            </p>
            <ul class="text-sm text-gray-700 list-disc pl-5 space-y-2 mb-4">
                <li>
                    Archivo <code class="text-xs bg-gray-100 px-1 rounded">appsettings.json</code> o
                    <code class="text-xs bg-gray-100 px-1 rounded">appsettings.Production.json</code> en la misma carpeta que el .exe,
                    sección <code class="text-xs bg-gray-100 px-1 rounded">PrintAgent</code> → propiedad
                    <code class="text-xs bg-gray-100 px-1 rounded">AgentToken</code>.
                </li>
                <li>
                    Variable de entorno (Windows/servicio):
                    <code class="text-xs bg-gray-100 px-1 rounded">PrintAgent__AgentToken</code> = el token copiado.
                </li>
                <li>
                    En desarrollo:
                    <code class="text-xs bg-gray-100 px-1 rounded">dotnet user-secrets set "PrintAgent:AgentToken" "…"</code> en el proyecto del agente.
                </li>
            </ul>
            <p class="text-xs text-gray-500 mb-2">Reinicie el agente o el servicio después de cambiar el token.</p>
            <pre
                class="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto break-all border border-gray-200">{{ revealedToken }}</pre>
            <template #footer>
                <BaseButton variant="secondary" type="button" @click="copyToken">Copiar</BaseButton>
                <BaseButton variant="primary" type="button" @click="closeTokenModal">Cerrar</BaseButton>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import type { BranchPrintSettings, UpdateBranchPrintSettingsPayload } from '@/types/common'
import { apiStaticOrigin, branchApi } from '@/services/MainAPI/branchApi'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
    branchId: number
    initial: BranchPrintSettings | null | undefined
}>()

const emit = defineEmits<{
    saved: []
}>()

const { success, error: showError } = useToast()
const saving = ref(false)
const rotating = ref(false)
const showTokenModal = ref(false)
const revealedToken = ref('')
const uploadingLogo = ref(false)
const deletingLogo = ref(false)
const pickedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const paperWidthOptions = [
    { value: 58, label: '58 mm' },
    { value: 80, label: '80 mm' },
]

const logoPreviewSrc = computed(() => {
    const p = props.initial?.receiptLogoPath
    if (!p) return ''
    if (/^https?:\/\//i.test(p)) return p
    const origin = apiStaticOrigin()
    return origin + (p.startsWith('/') ? p : '/' + p)
})

function emptyForm(): UpdateBranchPrintSettingsPayload {
    return {
        kitchenHeaderLine1: '',
        kitchenHeaderLine2: '',
        showKitchenOrderNumber: true,
        showKitchenTime: true,
        showKitchenNotes: true,
        deliveryShowLineSubtotals: true,
        deliveryShowPayments: true,
        deliveryShowLoyaltyFooter: true,
        cashierMirrorDeliveryLayout: false,
        footerMessageKitchen: '',
        footerMessageDelivery: '',
        footerMessageCashier: '',
        paperWidthMmKitchen: 58,
        paperWidthMmDelivery: 58,
        paperWidthMmCashier: 58,
        enableKitchenJobs: true,
        enableDeliveryJobs: true,
        enableCashierJobs: false,
        printerQueueKitchen: '',
        printerQueueDelivery: '',
        printerQueueCashier: '',
    }
}

function fromSettings(p: BranchPrintSettings): UpdateBranchPrintSettingsPayload {
    return {
        kitchenHeaderLine1: p.kitchenHeaderLine1 ?? '',
        kitchenHeaderLine2: p.kitchenHeaderLine2 ?? '',
        showKitchenOrderNumber: p.showKitchenOrderNumber,
        showKitchenTime: p.showKitchenTime,
        showKitchenNotes: p.showKitchenNotes,
        deliveryShowLineSubtotals: p.deliveryShowLineSubtotals,
        deliveryShowPayments: p.deliveryShowPayments,
        deliveryShowLoyaltyFooter: p.deliveryShowLoyaltyFooter,
        cashierMirrorDeliveryLayout: p.cashierMirrorDeliveryLayout,
        footerMessageKitchen: p.footerMessageKitchen ?? '',
        footerMessageDelivery: p.footerMessageDelivery ?? '',
        footerMessageCashier: p.footerMessageCashier ?? '',
        paperWidthMmKitchen: p.paperWidthMmKitchen ?? p.paperWidthMm ?? 58,
        paperWidthMmDelivery: p.paperWidthMmDelivery ?? p.paperWidthMm ?? 58,
        paperWidthMmCashier: p.paperWidthMmCashier ?? p.paperWidthMm ?? 58,
        enableKitchenJobs: p.enableKitchenJobs,
        enableDeliveryJobs: p.enableDeliveryJobs,
        enableCashierJobs: p.enableCashierJobs,
        printerQueueKitchen: p.printerQueueKitchen ?? '',
        printerQueueDelivery: p.printerQueueDelivery ?? '',
        printerQueueCashier: p.printerQueueCashier ?? '',
    }
}

const form = reactive<UpdateBranchPrintSettingsPayload>(emptyForm())

function syncFromProps() {
    if (props.initial) Object.assign(form, fromSettings(props.initial))
    else Object.assign(form, emptyForm())
}

watch(
    () => props.initial,
    () => syncFromProps(),
    { immediate: true }
)

function formatDt(iso: string) {
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return iso
    }
}

async function submit() {
    saving.value = true
    try {
        await branchApi.updateBranchPrintSettings(props.branchId, { ...form })
        success('Impresión actualizada', 3500, 'La configuración de comandas se guardó correctamente.')
        emit('saved')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo guardar.'
        showError('Error', msg)
    } finally {
        saving.value = false
    }
}

async function onRotateClick() {
    if (
        !confirm(
            '¿Generar un nuevo token? Los equipos que usen el token anterior dejarán de conectarse hasta actualizarlo.'
        )
    ) {
        return
    }
    rotating.value = true
    try {
        const res = await branchApi.rotateBranchAgentToken(props.branchId)
        revealedToken.value = res.data.plainToken
        showTokenModal.value = true
        success('Token generado', 3000, 'Actualice el agente en cada PC.')
        emit('saved')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo rotar el token.'
        showError('Error', msg)
    } finally {
        rotating.value = false
    }
}

async function copyToken() {
    try {
        await navigator.clipboard.writeText(revealedToken.value)
        success('Copiado', 2000, 'Token copiado al portapapeles.')
    } catch {
        showError('No se pudo copiar', 'Seleccione el texto manualmente.')
    }
}

function closeTokenModal() {
    showTokenModal.value = false
    revealedToken.value = ''
}

function onFilePick(ev: Event) {
    const input = ev.target as HTMLInputElement
    const f = input.files?.[0]
    pickedFile.value = f ?? null
}

async function uploadLogo() {
    const f = pickedFile.value
    if (!f) return
    if (f.size > 1_572_864) {
        showError('Archivo grande', 'El logo no puede superar 1,5 MB.')
        return
    }
    uploadingLogo.value = true
    try {
        const res = await branchApi.uploadBranchReceiptLogo(props.branchId, f)
        if (!res.isSuccess) {
            showError('Error', res.message || 'No se pudo subir el logo.')
            return
        }
        success('Logo actualizado', 3000, 'El ticket usará esta imagen al imprimir.')
        pickedFile.value = null
        if (fileInput.value) fileInput.value.value = ''
        emit('saved')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo subir el logo.'
        showError('Error', msg)
    } finally {
        uploadingLogo.value = false
    }
}

async function removeLogo() {
    if (!props.initial?.receiptLogoPath) return
    if (!confirm('¿Quitar el logo del ticket?')) return
    deletingLogo.value = true
    try {
        const res = await branchApi.deleteBranchReceiptLogo(props.branchId)
        if (!res.isSuccess) {
            showError('Error', res.message || 'No se pudo eliminar el logo.')
            return
        }
        success('Logo eliminado', 2500, 'Los tickets seguirán sin imagen hasta subir otra.')
        emit('saved')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo eliminar el logo.'
        showError('Error', msg)
    } finally {
        deletingLogo.value = false
    }
}
</script>

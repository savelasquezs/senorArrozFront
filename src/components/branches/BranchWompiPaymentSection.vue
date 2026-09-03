<template>
  <div class="space-y-6">
    <BaseLoading v-if="loading" text="Cargando configuración de pagos..." />

    <template v-else>
      <BaseCard title="Pago en línea con Wompi">
        <form class="space-y-5" @submit.prevent="save">
          <BaseAlert type="info">
            En la tienda el cliente verá “Pago en línea” con tarjeta y PSE. Wompi se usa únicamente como proveedor detrás del proceso.
          </BaseAlert>

          <div class="grid gap-4 md:grid-cols-3">
            <label class="text-sm text-gray-700">
              App financiera
              <select v-model.number="form.financialAppId" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" required>
                <option :value="0" disabled>Selecciona una app</option>
                <option v-for="app in settings?.financialApps ?? []" :key="app.id" :value="app.id">
                  {{ app.name }} — {{ app.bankName }}
                </option>
              </select>
            </label>

            <label class="text-sm text-gray-700">
              Ambiente activo
              <select v-model="form.activeEnvironment" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2">
                <option value="sandbox">Sandbox</option>
                <option value="production">Producción</option>
              </select>
            </label>

            <BaseInput v-model="commissionPercent" type="number" label="Comisión estimada (%)" :min="0" :max="100" :step="0.01" required />
          </div>

          <label class="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input v-model="form.isEnabled" type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300" />
            <span>
              <strong class="block text-sm text-gray-900">Habilitar pago en línea en esta sucursal</strong>
              <span class="text-xs text-gray-500">Solo se ofrecerá cuando la App financiera, su banco y esta integración estén activos.</span>
            </span>
          </label>

          <div class="grid gap-5 xl:grid-cols-2">
            <EnvironmentFields
              title="Sandbox"
              :environment="form.sandbox"
              :configured="settings?.integration?.sandbox"
              :webhook-url="webhookUrl('sandbox')"
            />
            <EnvironmentFields
              title="Producción"
              :environment="form.production"
              :configured="settings?.integration?.production"
              :webhook-url="webhookUrl('production')"
            />
          </div>

          <BaseAlert v-if="errorText" type="error">{{ errorText }}</BaseAlert>
          <BaseAlert v-else-if="successText" type="success">{{ successText }}</BaseAlert>
          <BaseAlert v-if="settings?.integration?.lastError" type="warning">
            Última validación: {{ settings.integration.lastError }}
          </BaseAlert>

          <div class="flex flex-wrap justify-end gap-2">
            <BaseButton type="button" variant="outline" :loading="testing" :disabled="!settings?.integration" @click="test">
              Probar ambiente activo
            </BaseButton>
            <BaseButton type="submit" :loading="saving">Guardar configuración</BaseButton>
          </div>
        </form>
      </BaseCard>

      <MetaConversionsDiagnosticsCard />

      <BaseCard title="Pagos que requieren revisión manual">
        <BaseLoading v-if="reviewsLoading" text="Cargando revisiones..." />
        <p v-else-if="reviews.length === 0" class="py-5 text-center text-sm text-gray-500">No hay pagos pendientes de revisión.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th class="p-3">Pedido</th><th class="p-3">Monto</th><th class="p-3">Motivo</th><th class="p-3">Recibido</th><th class="p-3 text-right">Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="review in reviews" :key="review.id" class="border-t">
                <td class="p-3 font-semibold">#{{ review.orderId }}</td>
                <td class="p-3">{{ currency(review.amount) }}</td>
                <td class="p-3">{{ review.manualReviewReason || 'Validación requerida' }}</td>
                <td class="p-3">{{ dateTime(review.createdAt) }}</td>
                <td class="p-3">
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="danger" :loading="resolvingId === review.id" @click="resolve(review, false)">{{ review.canApprove ? 'Rechazar' : 'Cerrar revisión' }}</BaseButton>
                    <BaseButton v-if="review.canApprove" size="sm" variant="success" :loading="resolvingId === review.id" @click="resolve(review, true)">Aprobar</BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch, type PropType } from 'vue'
import MetaConversionsDiagnosticsCard from '@/components/branches/MetaConversionsDiagnosticsCard.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'
import { useDialog } from '@/composables/useDialog'
import type {
  UpsertWompiPaymentIntegration,
  WompiEnvironmentConfiguration,
  WompiEnvironmentCredentials,
  WompiIntegrationSettings,
  WompiPaymentReview,
} from '@/types/integrations'

const EnvironmentFields = defineComponent({
  props: {
    title: { type: String, required: true },
    environment: { type: Object as PropType<WompiEnvironmentCredentials>, required: true },
    configured: { type: Object as PropType<WompiEnvironmentConfiguration | undefined>, default: undefined },
    webhookUrl: { type: String, required: true },
  },
  setup(props) {
    const field = (label: string, key: keyof WompiEnvironmentCredentials, type = 'text') => h(BaseInput, {
      modelValue: props.environment[key] ?? '',
      'onUpdate:modelValue': (value: string | number | null) => { props.environment[key] = String(value ?? '') },
      label,
      type,
      maxlength: 300,
      placeholder: key === 'publicKey' ? undefined : props.configured?.[`${key}Configured` as keyof WompiEnvironmentConfiguration] ? 'Configurado; deja vacío para conservar' : undefined,
    })
    return () => h('section', { class: 'space-y-4 rounded-xl border border-gray-200 p-4' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('h3', { class: 'font-semibold text-gray-900' }, props.title),
        h('span', { class: props.configured?.publicKey && props.configured.integritySecretConfigured && props.configured.eventsSecretConfigured ? 'text-xs font-medium text-green-700' : 'text-xs font-medium text-amber-700' }, props.configured?.publicKey && props.configured.integritySecretConfigured && props.configured.eventsSecretConfigured ? 'Credenciales completas' : 'Configuración pendiente'),
      ]),
      field('Llave pública', 'publicKey'),
      field('Secreto de integridad', 'integritySecret', 'password'),
      field('Secreto de eventos', 'eventsSecret', 'password'),
      h('div', { class: 'rounded-lg bg-gray-50 p-3 text-xs text-gray-600' }, [
        h('strong', { class: 'block text-gray-800' }, 'Webhook para registrar en Wompi'),
        h('code', { class: 'mt-1 block break-all select-all' }, props.webhookUrl),
        props.configured?.lastWebhookAt ? h('span', { class: 'mt-2 block text-green-700' }, `Último evento: ${new Date(props.configured.lastWebhookAt).toLocaleString('es-CO')}`) : null,
      ]),
    ])
  },
})

const props = defineProps<{ branchId: number }>()
const { confirmDialog } = useDialog()
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const reviewsLoading = ref(false)
const resolvingId = ref<number | null>(null)
const settings = ref<WompiIntegrationSettings | null>(null)
const reviews = ref<WompiPaymentReview[]>([])
const errorText = ref('')
const successText = ref('')
const commissionPercent = ref(0)
const form = reactive<UpsertWompiPaymentIntegration>({
  financialAppId: 0,
  activeEnvironment: 'sandbox',
  isEnabled: false,
  estimatedCommissionRate: 0,
  sandbox: {},
  production: {},
})

const apiBaseUrl = computed(() => String(import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, ''))
const webhookUrl = (environment: string) => `${apiBaseUrl.value}/api/integrations/wompi/webhooks/${environment}`
const currency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const dateTime = (value: string) => new Date(value).toLocaleString('es-CO')

function applySettings(value: WompiIntegrationSettings) {
  settings.value = value
  const integration = value.integration
  form.financialAppId = integration?.financialAppId ?? value.financialApps[0]?.id ?? 0
  form.activeEnvironment = integration?.activeEnvironment ?? 'sandbox'
  form.isEnabled = integration?.isEnabled ?? false
  form.estimatedCommissionRate = integration?.estimatedCommissionRate ?? 0
  commissionPercent.value = form.estimatedCommissionRate * 100
  form.sandbox = { publicKey: integration?.sandbox.publicKey ?? '' }
  form.production = { publicKey: integration?.production.publicKey ?? '' }
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const response = await integrationApi.getWompi(props.branchId)
    applySettings(response.data)
    await loadReviews()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'No fue posible cargar la configuración.'
  } finally {
    loading.value = false
  }
}

async function loadReviews() {
  reviewsLoading.value = true
  try {
    reviews.value = (await integrationApi.getWompiReviews(props.branchId)).data
  } finally {
    reviewsLoading.value = false
  }
}

async function save() {
  errorText.value = ''
  successText.value = ''
  saving.value = true
  try {
    form.estimatedCommissionRate = commissionPercent.value / 100
    const response = await integrationApi.saveWompi(props.branchId, form)
    const currentApps = settings.value?.financialApps ?? []
    applySettings({ integration: response.data, financialApps: currentApps })
    successText.value = response.message
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'No fue posible guardar la configuración.'
  } finally {
    saving.value = false
  }
}

async function test() {
  testing.value = true
  errorText.value = ''
  successText.value = ''
  try {
    const response = await integrationApi.testWompi(props.branchId)
    if (settings.value) settings.value.integration = response.data
    successText.value = response.message
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'No fue posible validar las credenciales.'
  } finally {
    testing.value = false
  }
}

async function resolve(review: WompiPaymentReview, approve: boolean) {
  const confirmed = await confirmDialog({
    title: approve ? 'Aprobar pago' : review.canApprove ? 'Rechazar pago' : 'Cerrar revisión',
    message: approve
      ? `¿Confirmas que el pago del pedido #${review.orderId} es válido? El pedido se enviará a cocina.`
      : review.canApprove
        ? `¿Confirmas que el pago del pedido #${review.orderId} no debe ingresar al flujo operativo?`
        : `¿Confirmas que revisaste la alerta del pedido #${review.orderId}?`,
    confirmLabel: approve ? 'Aprobar' : review.canApprove ? 'Rechazar' : 'Cerrar revisión',
    tone: approve ? 'warning' : 'danger',
  })
  if (!confirmed) return
  resolvingId.value = review.id
  try {
    await integrationApi.resolveWompiReview(review.id, approve)
    await loadReviews()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'No fue posible resolver la revisión.'
  } finally {
    resolvingId.value = null
  }
}

watch(() => props.branchId, () => void load())
onMounted(() => void load())
</script>

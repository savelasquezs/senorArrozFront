<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-600">Configura la integración Rappi API v2 para esta sucursal.</p>
      <BaseButton :icon="PlusIcon" @click="openForm">
        {{ connection ? 'Configurar Rappi' : 'Crear integración' }}
      </BaseButton>
    </div>

    <BaseLoading v-if="loading" text="Cargando integración..." />
    <BaseAlert v-else-if="errorText" type="error">{{ errorText }}</BaseAlert>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <BaseCard v-for="provider in providers" :key="provider.key">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">{{ provider.name }}</h3>
            <p class="text-sm text-gray-500">
              {{ provider.available ? statusText(provider.connection) : 'Próximamente' }}
            </p>
          </div>
          <span :class="badgeClass(provider.connection)" class="rounded-full px-2 py-1 text-xs font-semibold">
            {{ provider.connection?.ready ? 'Operativa' : provider.connection ? 'Configurando' : 'Sin crear' }}
          </span>
        </div>

        <div v-if="provider.connection" class="mt-4 space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-2">
            <p>Credenciales: <strong>{{ provider.connection.credentialsConfigured ? 'Railway configurado' : 'Faltantes' }}</strong></p>
            <p>Ambiente: <strong>Sandbox</strong></p>
            <p>Catálogo: <strong>{{ provider.connection.selectedProductCount }} seleccionado(s)</strong></p>
            <p>Publicados: <strong>{{ provider.connection.publishedProductCount }}</strong></p>
            <p>Webhooks: <strong>{{ provider.connection.webhookConfigured ? 'Completos' : 'Pendientes' }}</strong></p>
            <p>Menú: <strong>{{ provider.connection.catalogDirty ? 'Pendiente de publicar' : provider.connection.menuApproved ? 'Aprobado' : 'Pendiente' }}</strong></p>
          </div>

          <div class="rounded-lg border p-3">
            <p v-for="store in provider.connection.stores" :key="store.id" class="mb-1 last:mb-0">
              {{ store.isParent ? 'Padre' : 'Hija' }}:
              <strong>{{ store.name }} ({{ store.rappiStoreId }})</strong>
              <span v-if="store.storeIntegrationId" class="text-gray-500">
                · {{ store.storeIntegrationId }}
              </span>
              <span v-if="store.lastPingAt" class="text-green-700"> · PING recibido</span>
            </p>
          </div>

          <BaseAlert v-if="provider.connection.lastError" type="error">
            {{ provider.connection.lastError }}
          </BaseAlert>

          <div class="flex flex-wrap gap-2 pt-1">
            <BaseButton size="sm" variant="outline" @click="openForm">Configurar</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="testing" @click="testConnection">Probar conexión</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="configuringWebhooks" @click="configureWebhooks">Registrar webhooks</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="catalogLoading" @click="openCatalog">Catálogo</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="previewLoading" @click="openPreview">Vista previa</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="reconciling" @click="reconcileAvailability">Reconciliar stock</BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseDialog v-model="showForm" :title="connection ? 'Configurar Rappi' : 'Crear integración Rappi'" size="4xl">
      <form class="space-y-5" @submit.prevent="save">
        <BaseAlert type="info">
          Las credenciales se leen exclusivamente desde Rappi__ClientId y Rappi__ClientSecret en Railway.
        </BaseAlert>

        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="form.displayName" label="Nombre" required />
          <label class="text-sm">
            App financiera
            <select v-model.number="form.financialAppId" class="mt-1 w-full rounded-lg border border-gray-300 p-2" required>
              <option :value="0" disabled>Selecciona</option>
              <option v-for="app in financialApps" :key="app.id" :value="app.id">
                {{ app.name }} — {{ app.bankName }}
              </option>
            </select>
          </label>
          <div>
            <CustomerSelector
              label="Cliente interno Rappi"
              :branch-id="branchId"
              :allow-create="false"
              required
              @customer-selected="selectCustomer"
            />
            <p v-if="selectedCustomer" class="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Seleccionado: <strong>{{ selectedCustomer.name }}</strong>
              <span v-if="selectedCustomer.phone1"> — {{ selectedCustomer.phone1 }}</span>
            </p>
          </div>
          <BaseInput v-model="form.defaultCookingTimeMinutes" type="number" label="Preparación (min)" :min="5" :max="180" required />
          <BaseInput v-model="commissionPercent" type="number" label="Comisión estimada (%)" :min="0" :max="100" :step="0.01" required />
          <label class="flex items-center gap-2 pt-7 text-sm">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
            Integración activa
          </label>
        </div>

        <div class="space-y-3">
          <h4 class="font-semibold">Tiendas sandbox</h4>
          <BaseAlert type="info">
            POS Tester: POS <strong>SeñorArrozDevV2</strong> · INTEGRACIÓN
            <strong>SENORARROZDEVV2</strong>.
          </BaseAlert>
          <div v-for="store in form.stores" :key="store.rappiStoreId" class="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
            <div>
              <p class="font-medium">{{ store.name }}</p>
              <p class="text-xs text-gray-500">{{ store.rappiStoreId }} · {{ store.isParent ? 'Padre' : 'Hija' }}</p>
            </div>
            <BaseInput
              v-model="store.storeIntegrationId"
              label="store_integration_id"
              :placeholder="store.rappiStoreId"
            />
            <label class="flex items-center gap-2 pt-7 text-sm">
              <input v-model="store.manualReadyForPickupEnabled" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
              Enviar READY_FOR_PICKUP
            </label>
          </div>
          <p class="text-xs text-amber-700">
            SENORARROZDEVV2 identifica la integración del POS. stores-pa confirmó un store_integration_id distinto para cada tienda.
            READY_FOR_PICKUP continúa deshabilitado hasta autorización expresa.
          </p>
        </div>

        <BaseAlert v-if="formError" type="error">{{ formError }}</BaseAlert>
        <div class="flex justify-end gap-2">
          <BaseButton type="button" variant="outline" @click="showForm = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">Guardar</BaseButton>
        </div>
      </form>
    </BaseDialog>

    <BaseDialog v-model="showCatalog" title="Catálogo Rappi" size="6xl">
      <BaseLoading v-if="catalogLoading" text="Cargando catálogo..." />
      <div v-else-if="catalog" class="space-y-4">
        <BaseAlert type="info">
          Selecciona productos simples. El SKU es inmutable y los cambios quedan pendientes hasta publicar.
        </BaseAlert>
        <div class="max-h-[65vh] overflow-auto rounded-lg border">
          <table class="w-full min-w-[1000px] text-sm">
            <thead class="sticky top-0 bg-gray-50 text-left">
              <tr>
                <th class="p-2">Publicar</th>
                <th class="p-2">Producto / SKU</th>
                <th class="p-2">Nombre Rappi</th>
                <th class="p-2">Precio Rappi</th>
                <th class="p-2">Descripción</th>
                <th class="p-2">Imagen</th>
                <th class="p-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in catalog.products" :key="product.id" class="border-t align-top">
                <td class="p-3">
                  <input v-model="product.isSelected" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
                </td>
                <td class="p-3">
                  <p class="font-medium">{{ product.name }}</p>
                  <p class="text-xs text-gray-500">{{ product.categoryName }} · {{ product.sku }}</p>
                  <p v-if="!product.active" class="text-xs text-red-600">Inactivo</p>
                </td>
                <td class="p-2">
                  <input v-model="product.overrideName" :placeholder="product.name" class="w-full rounded border p-2" />
                </td>
                <td class="p-2">
                  <input v-model.number="product.overridePrice" type="number" :placeholder="String(product.price)" min="1" class="w-32 rounded border p-2" />
                </td>
                <td class="p-2">
                  <input v-model="product.overrideDescription" class="w-full rounded border p-2" />
                </td>
                <td class="p-2">
                  <input v-model="product.overrideImageUrl" class="w-full rounded border p-2" />
                </td>
                <td class="p-2">
                  <BaseButton size="sm" variant="outline" :loading="savingProductId === product.id" @click="saveProduct(product)">
                    Guardar
                  </BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-sm">{{ catalog.selectedCount }} seleccionado(s) · {{ catalog.publishedCount }} publicado(s)</p>
          <BaseButton :loading="previewLoading" @click="openPreview">Vista previa</BaseButton>
        </div>
      </div>
    </BaseDialog>

    <BaseDialog v-model="showPreview" title="Vista previa del menú Rappi" size="5xl">
      <BaseLoading v-if="previewLoading" text="Generando vista previa..." />
      <div v-else-if="menuPreview" class="space-y-4">
        <BaseAlert type="warning">
          Se publicará únicamente en la tienda padre {{ menuPreview.storeId }}. La hija debe heredarlo desde Rappi.
        </BaseAlert>
        <div class="max-h-[60vh] overflow-auto rounded-lg border">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-gray-50 text-left">
              <tr>
                <th class="p-3">Categoría</th>
                <th class="p-3">Producto</th>
                <th class="p-3">SKU</th>
                <th class="p-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in menuPreview.items" :key="item.sku" class="border-t">
                <td class="p-3">{{ item.category.name }}</td>
                <td class="p-3">{{ item.name }}</td>
                <td class="p-3">{{ item.sku }}</td>
                <td class="p-3 text-right">{{ formatCurrency(item.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-2">
          <BaseButton variant="outline" @click="showPreview = false">Cerrar</BaseButton>
          <BaseButton :loading="publishing" @click="publishMenu">Publicar en tienda padre</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerSelector from '@/components/customers/CustomerSelector.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'
import { appApi } from '@/services/MainAPI/appApi'
import type { App } from '@/types/bank'
import type { Customer } from '@/types/customer'
import type {
  DeliveryProviderCard,
  RappiCatalog,
  RappiCatalogProduct,
  RappiConnection,
  RappiMenuPreview,
  UpsertRappiConnection,
} from '@/types/integrations'

const props = defineProps<{ branchId: number }>()
const providers = ref<DeliveryProviderCard[]>([])
const connection = ref<RappiConnection | null>(null)
const financialApps = ref<App[]>([])
const selectedCustomer = ref<{ id: number; name: string; phone1?: string } | null>(null)
const catalog = ref<RappiCatalog | null>(null)
const menuPreview = ref<RappiMenuPreview | null>(null)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const configuringWebhooks = ref(false)
const catalogLoading = ref(false)
const previewLoading = ref(false)
const publishing = ref(false)
const reconciling = ref(false)
const savingProductId = ref<number | null>(null)
const showForm = ref(false)
const showCatalog = ref(false)
const showPreview = ref(false)
const errorText = ref('')
const formError = ref('')

const form = reactive<UpsertRappiConnection>({
  displayName: 'Rappi',
  financialAppId: 0,
  customerId: 0,
  defaultCookingTimeMinutes: 30,
  estimatedCommissionRate: 0.25,
  isActive: false,
  stores: defaultStores(),
})

const commissionPercent = computed({
  get: () => Number((form.estimatedCommissionRate * 100).toFixed(2)),
  set: (value: number | string | null) => {
    form.estimatedCommissionRate = Number(value || 0) / 100
  },
})

function defaultStores() {
  return [
    {
      rappiStoreId: '900173116',
      name: 'Señor Arroz Dev1',
      isParent: true,
      storeIntegrationId: '900173116',
      manualReadyForPickupEnabled: false,
    },
    {
      rappiStoreId: '900173117',
      name: 'Señor Arroz Dev2',
      isParent: false,
      storeIntegrationId: '900173117',
      manualReadyForPickupEnabled: false,
    },
  ]
}

function apply(value: RappiConnection | null) {
  connection.value = value
  if (!value) {
    selectedCustomer.value = null
    return
  }
  selectedCustomer.value = {
    id: value.customerId,
    name: value.customerName || `Cliente #${value.customerId}`,
  }
  Object.assign(form, {
    displayName: value.displayName,
    financialAppId: value.financialAppId,
    customerId: value.customerId,
    technicalUserId: value.technicalUserId,
    defaultCookingTimeMinutes: value.defaultCookingTimeMinutes,
    estimatedCommissionRate: value.estimatedCommissionRate,
    isActive: value.isActive,
    stores: value.stores.map(store => ({
      rappiStoreId: store.rappiStoreId,
      storeIntegrationId: store.storeIntegrationId || '',
      name: store.name,
      isParent: store.isParent,
      manualReadyForPickupEnabled: store.manualReadyForPickupEnabled,
    })),
  })
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const [providersResponse, appsResponse] = await Promise.all([
      integrationApi.getDeliveryApps(props.branchId),
      appApi.getApps({ branchId: props.branchId, active: true, page: 1, pageSize: 100 }),
    ])
    providers.value = providersResponse.data.providers
    apply(providers.value.find(item => item.key === 'rappi')?.connection || null)
    financialApps.value = appsResponse.items
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    loading.value = false
  }
}

function openForm() {
  showForm.value = true
}

function selectCustomer(customer: Customer) {
  form.customerId = customer.id
  formError.value = ''
  selectedCustomer.value = {
    id: customer.id,
    name: customer.name,
    phone1: customer.phone1,
  }
}

async function save() {
  if (!form.customerId) {
    formError.value = 'Selecciona el cliente interno Rappi.'
    return
  }
  if (form.stores.some(store => store.manualReadyForPickupEnabled)
    && !window.confirm('¿Rappi confirmó por escrito READY_FOR_PICKUP manual para las tiendas marcadas?')) {
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const response = await integrationApi.saveRappi(props.branchId, {
      ...form,
      stores: form.stores.map(store => ({ ...store })),
    })
    apply(response.data)
    showForm.value = false
    await load()
  } catch (error: any) {
    formError.value = error.message
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  errorText.value = ''
  try {
    const response = await integrationApi.testRappi(props.branchId)
    apply(response.data)
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    testing.value = false
  }
}

async function configureWebhooks() {
  configuringWebhooks.value = true
  errorText.value = ''
  try {
    const response = await integrationApi.configureRappiWebhooks(props.branchId)
    apply(response.data)
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    configuringWebhooks.value = false
  }
}

async function openCatalog() {
  showCatalog.value = true
  catalogLoading.value = true
  try {
    catalog.value = (await integrationApi.getRappiCatalog(props.branchId)).data
  } catch (error: any) {
    errorText.value = error.message
    showCatalog.value = false
  } finally {
    catalogLoading.value = false
  }
}

async function saveProduct(product: RappiCatalogProduct) {
  savingProductId.value = product.id
  try {
    catalog.value = (await integrationApi.updateRappiCatalogProduct(props.branchId, product.id, {
      isSelected: product.isSelected,
      overrideName: product.overrideName || undefined,
      overrideDescription: product.overrideDescription || undefined,
      overrideImageUrl: product.overrideImageUrl || undefined,
      overridePrice: product.overridePrice || undefined,
    })).data
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    savingProductId.value = null
  }
}

async function openPreview() {
  previewLoading.value = true
  showPreview.value = true
  try {
    menuPreview.value = (await integrationApi.previewRappiMenu(props.branchId)).data
  } catch (error: any) {
    errorText.value = error.message
    showPreview.value = false
  } finally {
    previewLoading.value = false
  }
}

async function publishMenu() {
  if (!window.confirm('¿Publicar este menú en la tienda padre 900173116?')) return
  publishing.value = true
  try {
    await integrationApi.publishRappiMenu(props.branchId)
    showPreview.value = false
    showCatalog.value = false
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    publishing.value = false
  }
}

async function reconcileAvailability() {
  reconciling.value = true
  try {
    await integrationApi.reconcileRappiAvailability(props.branchId)
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    reconciling.value = false
  }
}

function statusText(value?: RappiConnection | null) {
  if (!value) return 'Proveedor disponible'
  if (value.ready) return 'Conectada y lista para operar'
  if (!value.credentialsConfigured) return 'Faltan credenciales en Railway'
  if (!value.isVerified) return 'Pendiente probar conexión'
  if (!value.webhookConfigured) return 'Pendiente registrar webhooks'
  if (!value.menuApproved || value.catalogDirty) return 'Pendiente publicar o aprobar menú'
  if (!value.storeIdsComplete) return 'Pendiente store_integration_id'
  return 'Revisa el último error'
}

function badgeClass(value?: RappiConnection | null) {
  return value?.ready
    ? 'bg-green-100 text-green-700'
    : value
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

watch(() => props.branchId, load)
onMounted(load)
</script>

<template>
  <BaseDialog
    :model-value="modelValue"
    title="Promoción del día"
    size="2xl"
    :dismissible="!dailyPromotionStore.isSaving"
    scroll-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>Hoy · 5:00 a. m. – 11:59 p. m. · Colombia</span>
        <span v-if="readonly" class="rounded-full bg-gray-100 px-2 py-1">Solo lectura</span>
      </div>
      <p v-if="loading" role="status" class="text-sm text-gray-500">Cargando promoción…</p>
      <div v-if="loadError" role="alert" class="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <span>{{ loadError }}</span>
        <BaseButton variant="outline" size="sm" @click="loadPromotion">Reintentar</BaseButton>
      </div>
      <div v-if="readonly && displayedPromotion" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {{ displayedSummary }}
        <p v-if="displayedPromotion.isActive" class="mt-1 text-xs text-emerald-700">
          Edición disponible para su creador o un administrador.
        </p>
      </div>
      <div v-else-if="readonly" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        No hay promo activa para esta sucursal.
      </div>

      <div v-if="needsProducts" class="space-y-2">
        <p v-if="catalogLoading" role="status" class="text-sm text-gray-500">Cargando productos…</p>
        <div v-else-if="catalogError" role="alert" class="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <span>{{ catalogError }}</span>
          <BaseButton variant="outline" size="sm" @click="loadProducts(true)">Reintentar</BaseButton>
        </div>
      </div>

      <fieldset :disabled="readonly || loading || !ready || dailyPromotionStore.isSaving" class="space-y-4">
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Promoción activa
        </label>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BaseSelect
            v-model="form.type"
            :options="typeOptions"
            value-key="value"
            display-key="label"
            label="Tipo"
            :searchable="false"
          />

          <BaseInput
            v-model.number="form.minimumOrderValue"
            label="Compra mínima ($)"
            type="number"
            :min="0"
            placeholder="Sin mínimo"
            :error="minimumInvalid ? 'Ingresa un valor mayor o igual a 0.' : ''"
          />
        </div>

        <div v-if="form.type === 'GiftProduct'" class="space-y-2">
          <BaseSelect
            v-model="form.giftProductId"
            :options="giftProductOptions"
            value-key="id"
            display-key="name"
            label="Producto de regalo"
            placeholder="Selecciona un regalo"
            :disabled="catalogLoading || !!catalogError || !giftProductOptions.length || readonly"
            required
            searchable
            inline-dropdown
          />
          <div v-if="!catalogLoading && !catalogError && !giftProductOptions.length" class="flex items-center justify-between gap-3 text-sm text-gray-500">
            <span>No hay productos activos en Regalos.</span>
            <BaseButton variant="ghost" size="sm" :disabled="readonly" @click="loadProducts(true)">Actualizar</BaseButton>
          </div>
          <p v-else class="text-xs text-gray-500">Solo productos activos de Regalos.</p>
          <p v-if="form.giftProductId && !catalogLoading && !catalogError && !selectedGift" class="text-sm text-amber-700">El regalo guardado no está disponible. Elige otro.</p>
        </div>

        <div v-if="form.type === 'FreeDelivery'" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          El domicilio será gratis cuando se cumpla la compra mínima.
        </div>

        <div v-if="form.type === 'PercentageDiscount'" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BaseInput
              v-model.number="form.discountPercentage"
              label="Porcentaje"
              type="number"
              :min="0"
              :max="100"
              step="0.1"
              required
              :error="percentageInvalid ? 'El descuento debe ser mayor a 0 y máximo 100.' : ''"
            />
            <BaseSelect
              v-model="form.discountScope"
              :options="scopeOptions"
              value-key="value"
              display-key="label"
              label="Alcance"
              :searchable="false"
            />
          </div>

          <BaseSelect
            v-if="form.discountScope === 'SpecificProducts'"
            v-model="form.discountProductIds"
            :options="productOptions"
            value-key="id"
            display-key="name"
            label="Productos específicos"
            placeholder="Seleccionar productos"
            multiple
            searchable
            inline-dropdown
            :disabled="catalogLoading || !!catalogError || readonly"
            required
          />

          <p class="text-xs text-gray-500">El descuento no incluye el domicilio.</p>
          <div v-if="unavailableDiscountProducts" class="flex items-center justify-between gap-3 text-sm text-amber-700">
            <span>Hay productos que ya no están disponibles.</span>
            <BaseButton variant="ghost" size="sm" @click="form.discountProductIds = form.discountProductIds.filter(id => productOptions.some(product => product.id === id))">Quitar no disponibles</BaseButton>
          </div>
        </div>

        <div v-if="selectionValid" aria-live="polite" class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {{ preview }}
        </div>
      </fieldset>

      <p v-if="submitError" role="alert" class="text-sm text-red-600">{{ submitError }}</p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" size="sm" :disabled="dailyPromotionStore.isSaving" @click="emit('update:modelValue', false)">
        Cerrar
      </BaseButton>
      <BaseButton
        v-if="!readonly && displayedPromotion?.isActive"
        variant="outline"
        size="sm"
        :disabled="!branchId || !ready || loading || dailyPromotionStore.isSaving"
        @click="handleDisable"
      >
        Desactivar
      </BaseButton>
      <BaseButton
        v-if="!readonly"
        variant="primary"
        size="sm"
        :loading="dailyPromotionStore.isSaving"
        :disabled="!canSave"
        @click="handleSave"
      >
        Guardar promoción
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useDailyPromotionStore } from '@/store/dailyPromotion'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { normalizeCategoryLabel } from '@/config/orderPosCategories'
import { formatCurrency } from '@/composables/useFormatting'
import type { DailyPromotion, DailyPromotionDiscountScope, DailyPromotionType, UpsertDailyPromotion } from '@/types/dailyPromotion'
import { getTodayDailyPromotionWindow } from '@/utils/dailyPromotionWindow'

const props = defineProps<{
  modelValue: boolean
  branchId: number | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const dailyPromotionStore = useDailyPromotionStore()
const productsStore = useProductsStore()
const categoriesStore = useProductCategoriesStore()
const loading = ref(false), ready = ref(false), catalogLoading = ref(false)
const loadError = ref(''), catalogError = ref(''), submitError = ref('')
let loadVersion = 0

const form = reactive<{
  isActive: boolean
  type: DailyPromotionType
  giftProductId: number | null
  discountPercentage: number | null
  discountScope: DailyPromotionDiscountScope
  discountProductIds: number[]
  minimumOrderValue: number | null
}>({
  isActive: true,
  type: 'GiftProduct',
  giftProductId: null,
  discountPercentage: null,
  discountScope: 'AllProducts',
  discountProductIds: [],
  minimumOrderValue: null,
})

const typeOptions = [
  { value: 'GiftProduct', label: 'Producto gratis' },
  { value: 'FreeDelivery', label: 'Domicilio gratis' },
  { value: 'PercentageDiscount', label: 'Descuento porcentual' },
]

const scopeOptions = [
  { value: 'AllProducts', label: 'Todos los productos' },
  { value: 'SpecificProducts', label: 'Productos específicos' },
]

const currentPromotion = computed(() =>
  props.branchId ? dailyPromotionStore.currentByBranch[props.branchId] ?? null : null,
)

const activePromotion = computed(() =>
  props.branchId ? dailyPromotionStore.activeByBranch[props.branchId] ?? null : null,
)

const productOptions = computed(() => {
  const categories = new Map(categoriesStore.catalogCategories.map(category => [category.id, category.name]))
  return productsStore.catalogProducts
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, name: p.name, categoryName: categories.get(p.categoryId) ?? p.categoryName }))
})

const giftProductOptions = computed(() => {
  return productOptions.value.filter((p) => normalizeCategoryLabel(p.categoryName ?? '') === 'regalos')
})

const displayedPromotion = computed(() => activePromotion.value ?? currentPromotion.value)
const displayedSummary = computed(() => summarize(displayedPromotion.value))
const selectedGift = computed(() => giftProductOptions.value.find(product => product.id === form.giftProductId))
const needsProducts = computed(() => form.type === 'GiftProduct' || form.type === 'PercentageDiscount' && form.discountScope === 'SpecificProducts')
const minimumInvalid = computed(() => form.minimumOrderValue != null && (!Number.isFinite(Number(form.minimumOrderValue)) || Number(form.minimumOrderValue) < 0))
const percentageInvalid = computed(() => form.type === 'PercentageDiscount' && form.discountPercentage != null && (!Number.isFinite(Number(form.discountPercentage)) || Number(form.discountPercentage) <= 0 || Number(form.discountPercentage) > 100))
const unavailableDiscountProducts = computed(() => form.type === 'PercentageDiscount' && form.discountScope === 'SpecificProducts' && !catalogLoading.value && !catalogError.value && form.discountProductIds.some(id => !productOptions.value.some(product => product.id === id)))
const selectionValid = computed(() => !minimumInvalid.value && (form.type === 'FreeDelivery'
  || form.type === 'GiftProduct' && !!selectedGift.value
  || form.type === 'PercentageDiscount' && Number(form.discountPercentage) > 0 && !percentageInvalid.value
    && (form.discountScope === 'AllProducts' || form.discountProductIds.length > 0 && !unavailableDiscountProducts.value)))
const canSave = computed(() => !!props.branchId && !props.readonly && ready.value && !loading.value && !dailyPromotionStore.isSaving && selectionValid.value
  && (!needsProducts.value || !catalogLoading.value && !catalogError.value))
const preview = computed(() => {
  const benefit = form.type === 'GiftProduct' ? `${selectedGift.value?.name} gratis`
    : form.type === 'FreeDelivery' ? 'Domicilio gratis'
    : `${form.discountPercentage}% en ${form.discountScope === 'AllProducts' ? 'todos los productos' : `${form.discountProductIds.length} producto${form.discountProductIds.length === 1 ? '' : 's'}`}`
  const minimum = Number(form.minimumOrderValue) > 0 ? `Desde ${formatCurrency(Number(form.minimumOrderValue))}` : 'Sin compra mínima'
  return `${!form.isActive ? 'Inactiva · ' : ''}${benefit} · ${minimum}`
})

watch(
  () => [props.modelValue, props.branchId],
  () => { void loadPromotion() },
  { immediate: true },
)
onBeforeUnmount(() => { loadVersion++ })

async function loadProducts(force = false, version = loadVersion) {
  const branchId = props.branchId
  if (!branchId) return
  catalogLoading.value = true
  catalogError.value = ''
  try {
    await Promise.all([productsStore.ensureCatalogLoaded(branchId, force), categoriesStore.ensureCatalogLoaded()])
  } catch {
    if (version === loadVersion) catalogError.value = 'No se pudieron cargar los productos.'
  } finally {
    if (version === loadVersion) catalogLoading.value = false
  }
}

async function loadPromotion() {
  const version = ++loadVersion
  ready.value = false
  loading.value = false
  loadError.value = submitError.value = ''
  if (!props.modelValue || !props.branchId) return
  const branchId = props.branchId
  loading.value = true
  hydrateForm(null)
  await Promise.all([dailyPromotionStore.loadCurrent(branchId), dailyPromotionStore.loadActive(branchId, true), loadProducts(false, version)])
  if (version !== loadVersion) return
  loading.value = false
  if (!dailyPromotionStore.currentLoadedByBranch[branchId]) {
    loadError.value = 'No se pudo cargar la promoción.'
    return
  }
  hydrateForm(currentPromotion.value)
  ready.value = true
}

watch(
  () => form.type,
  (type) => {
    if (type !== 'GiftProduct') form.giftProductId = null
    if (type !== 'PercentageDiscount') {
      form.discountPercentage = null
      form.discountProductIds = []
    } else if (!form.discountScope) {
      form.discountScope = 'AllProducts'
    }
  },
)

watch(
  () => form.discountScope,
  (scope) => {
    if (scope === 'AllProducts') form.discountProductIds = []
  },
)

function hydrateForm(promo: DailyPromotion | null) {
  form.isActive = promo?.isActive ?? true
  form.type = promo?.type ?? 'GiftProduct'
  form.giftProductId = promo?.giftProductId ?? null
  form.discountPercentage = promo?.discountPercentage ?? null
  form.discountScope = promo?.discountScope ?? 'AllProducts'
  form.discountProductIds = promo?.discountProducts?.map((p) => p.productId) ?? []
  form.minimumOrderValue = promo?.minimumOrderValue ?? null
}

async function handleSave() {
  if (!canSave.value || !props.branchId) return
  const version = loadVersion
  submitError.value = ''
  const promotionWindow = getTodayDailyPromotionWindow()
  const payload: UpsertDailyPromotion = {
    type: form.type,
    giftProductId: form.type === 'GiftProduct' ? form.giftProductId : null,
    discountPercentage: form.type === 'PercentageDiscount' ? form.discountPercentage : null,
    discountScope: form.type === 'PercentageDiscount' ? form.discountScope : null,
    discountProductIds:
      form.type === 'PercentageDiscount' && form.discountScope === 'SpecificProducts'
        ? form.discountProductIds
        : [],
    minimumOrderValue:
      typeof form.minimumOrderValue === 'number' && Number.isFinite(form.minimumOrderValue)
        ? form.minimumOrderValue
        : null,
    isActive: form.isActive,
    startsAt: promotionWindow.startsAt,
    endsAt: promotionWindow.endsAt,
  }

  try {
    await dailyPromotionStore.save(props.branchId, payload)
    if (version !== loadVersion) return
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    if (version === loadVersion) submitError.value = 'No se pudo guardar. Intenta de nuevo.'
  }
}

async function handleDisable() {
  if (!props.branchId || props.readonly || !ready.value || loading.value || dailyPromotionStore.isSaving) return
  const version = loadVersion
  submitError.value = ''
  try {
    await dailyPromotionStore.disable(props.branchId)
    if (version !== loadVersion) return
    form.isActive = false
    emit('saved')
  } catch {
    if (version === loadVersion) submitError.value = 'No se pudo desactivar. Intenta de nuevo.'
  }
}

function summarize(promo: DailyPromotion | null) {
  if (!promo) return ''
  const status = promo.isActive ? 'Activa' : 'Inactiva'
  if (promo.type === 'GiftProduct') return `${status}: ${promo.giftProductName ?? 'producto de regalo'} gratis`
  if (promo.type === 'FreeDelivery') return `${status}: Domicilio gratis`
  return `${status}: ${promo.discountPercentage ?? 0}% de descuento`
}
</script>

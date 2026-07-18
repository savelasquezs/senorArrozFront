<template>
  <BaseDialog
    :model-value="modelValue"
    title="Promo del dia"
    size="2xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div v-if="readonly && activePromotion" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {{ activeSummary }}
      </div>
      <div v-else-if="readonly" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        No hay promo activa para esta sucursal.
      </div>

      <fieldset :disabled="readonly || dailyPromotionStore.isSaving" class="space-y-4">
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Activa
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
            label="Pedido minimo"
            type="number"
            :min="0"
            placeholder="Opcional"
          />
        </div>

        <div v-if="form.type === 'GiftProduct'" class="space-y-2">
          <BaseSelect
            v-model="form.giftProductId"
            :options="giftProductOptions"
            value-key="id"
            display-key="name"
            label="Producto regalo"
            placeholder="Seleccionar producto"
            searchable
            teleport-dropdown
          />
          <p class="text-xs text-gray-500">El producto se agregara automaticamente al pedido cuando aplique.</p>
        </div>

        <div v-if="form.type === 'FreeDelivery'" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Se activara automaticamente la opcion de domicilio gratis cuando aplique.
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
            label="Productos especificos"
            placeholder="Seleccionar productos"
            multiple
            searchable
            teleport-dropdown
          />

          <p class="text-xs text-gray-500">El descuento se aplicara unicamente sobre productos, no sobre el domicilio.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BaseInput
            v-model="startsAtLocal"
            label="Fecha inicio"
            type="datetime-local"
          />
          <BaseInput
            v-model="endsAtLocal"
            label="Fecha fin"
            type="datetime-local"
            placeholder="Opcional"
          />
        </div>
      </fieldset>

      <p v-if="dailyPromotionStore.error" class="text-sm text-red-600">{{ dailyPromotionStore.error }}</p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" size="sm" @click="emit('update:modelValue', false)">
        Cerrar
      </BaseButton>
      <BaseButton
        v-if="!readonly"
        variant="outline"
        size="sm"
        :disabled="!branchId || dailyPromotionStore.isSaving"
        @click="handleDisable"
      >
        Desactivar
      </BaseButton>
      <BaseButton
        v-if="!readonly"
        variant="primary"
        size="sm"
        :loading="dailyPromotionStore.isSaving"
        :disabled="!branchId"
        @click="handleSave"
      >
        Guardar
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useDailyPromotionStore } from '@/store/dailyPromotion'
import { useProductsStore } from '@/store/products'
import type { DailyPromotion, DailyPromotionDiscountScope, DailyPromotionType, UpsertDailyPromotion } from '@/types/dailyPromotion'
import { defaultBusinessCalendar } from '@/utils/datetime'

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

const startsAtLocal = ref('')
const endsAtLocal = ref('')

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
  { value: 'SpecificProducts', label: 'Productos especificos' },
]

const currentPromotion = computed(() =>
  props.branchId ? dailyPromotionStore.currentByBranch[props.branchId] ?? null : null,
)

const activePromotion = computed(() =>
  props.branchId ? dailyPromotionStore.activeByBranch[props.branchId] ?? null : null,
)

const productOptions = computed(() => {
  const branchId = props.branchId
  return productsStore.currentProducts
    .filter((p) => p.active && (!branchId || p.branchId === branchId))
    .map((p) => ({ id: p.id, name: p.name, categoryName: p.categoryName }))
})

const giftProductOptions = computed(() => {
  const gifts = productOptions.value.filter((p) => normalize(p.categoryName) === 'regalos')
  return gifts.length > 0 ? gifts : productOptions.value
})

const activeSummary = computed(() => summarize(activePromotion.value))

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.branchId) return
    await Promise.all([
      dailyPromotionStore.loadCurrent(props.branchId),
      dailyPromotionStore.loadActive(props.branchId, true),
      productsStore.ensureCatalogLoaded(),
    ])
    hydrateForm(currentPromotion.value)
  },
)

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
  const promoEnd = promo?.endsAt ? new Date(promo.endsAt).getTime() : null
  const hasReusableSchedule = promo && (promoEnd == null || promoEnd >= Date.now())
  if (hasReusableSchedule) {
    startsAtLocal.value = toDatetimeLocal(promo.startsAt)
    endsAtLocal.value = promo.endsAt ? toDatetimeLocal(promo.endsAt) : ''
  } else {
    const today = defaultBusinessCalendar.todayYmd()
    startsAtLocal.value = `${today}T10:00`
    endsAtLocal.value = `${today}T23:59`
  }
}

async function handleSave() {
  if (!props.branchId) return
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
    startsAt: fromDatetimeLocal(startsAtLocal.value) ?? new Date().toISOString(),
    endsAt: fromDatetimeLocal(endsAtLocal.value),
  }

  await dailyPromotionStore.save(props.branchId, payload)
  emit('saved')
  emit('update:modelValue', false)
}

async function handleDisable() {
  if (!props.branchId) return
  await dailyPromotionStore.disable(props.branchId)
  emit('saved')
}

function toDatetimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function summarize(promo: DailyPromotion | null) {
  if (!promo) return ''
  if (promo.type === 'GiftProduct') return `Promo activa: ${promo.giftProductName ?? 'producto gratis'} gratis`
  if (promo.type === 'FreeDelivery') return 'Promo activa: Domicilio gratis'
  return `Promo activa: ${promo.discountPercentage ?? 0}% de descuento`
}

function normalize(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
</script>

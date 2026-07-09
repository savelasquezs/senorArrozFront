<template>
  <BaseCard>
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GiftIcon class="w-6 h-6 text-amber-600" />
            Fidelizacion
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            Configura los premios del ciclo por sucursal.
          </p>
        </div>
        <BaseBadge :variant="activeSteps.length > 0 ? 'success' : 'secondary'">
          {{ activeSteps.length > 0 ? `${activeSteps.length} paso(s)` : 'Sin ciclo' }}
        </BaseBadge>
      </div>

      <BaseAlert v-if="message.text" :type="message.type">
        <ExclamationTriangleIcon v-if="message.type === 'error'" class="w-5 h-5" />
        <InformationCircleIcon v-else class="w-5 h-5" />
        <span>{{ message.text }}</span>
      </BaseAlert>

      <BaseLoading v-if="loading" text="Cargando ciclo de fidelizacion..." />

      <div v-else class="space-y-4">
        <div
          v-for="(step, index) in formSteps"
          :key="step.localId"
          class="rounded-lg border border-gray-200 bg-white p-4"
          :class="!step.isActive ? 'opacity-60' : ''"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <BaseInput
                v-model="step.stepIndex"
                type="number"
                label="Paso del ciclo"
                :min="1"
                required
              />
              <BaseInput
                v-model="step.stepName"
                label="Nombre interno"
                placeholder="Ej: Premio 5 pedidos"
              />
              <BaseSelect
                v-model="step.rewardType"
                :options="rewardTypeOptions"
                value-key="value"
                display-key="label"
                label="Tipo de premio"
                :searchable="false"
              />
              <label class="flex items-end gap-2 pb-2 text-sm font-medium text-gray-700">
                <input
                  v-model="step.isActive"
                  type="checkbox"
                  class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Activo
              </label>
            </div>
            <BaseButton variant="ghost" size="sm" class="text-red-600" @click="removeStep(index)">
              Quitar
            </BaseButton>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <BaseSelect
              v-if="step.rewardType === 'GiftProduct'"
              v-model="step.giftProductId"
              :options="giftProductOptions"
              value-key="id"
              display-key="name"
              label="Producto regalo"
              placeholder="Seleccionar producto"
              searchable
              teleport-dropdown
            />
            <BaseInput
              v-if="step.rewardType === 'PercentageDiscount'"
              v-model="step.discountPercentage"
              type="number"
              label="% descuento"
              :min="0"
              :max="100"
              step="0.1"
            />
            <BaseInput
              v-model="step.rewardLabel"
              class="md:col-span-2"
              label="Nombre/mensaje visible"
              placeholder="Ej: Papitas gratis por fidelidad"
              required
            />
          </div>

          <p v-if="step.rewardType === 'GiftProduct'" class="mt-2 text-xs text-gray-500">
            El producto regalo debe pertenecer a la categoria Regalos.
          </p>
          <p v-if="step.rewardType === 'FreeDelivery'" class="mt-2 text-xs text-gray-500">
            Este paso marca el premio como domicilio gratis.
          </p>
          <p v-if="step.rewardType === 'PercentageDiscount'" class="mt-2 text-xs text-gray-500">
            El mensaje visible sigue siendo el texto que aparece en tickets y vista de cliente.
          </p>
        </div>

        <div v-if="formSteps.length === 0" class="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
          No hay pasos configurados.
        </div>

        <div class="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <BaseButton type="button" variant="outline" @click="addStep">
            Agregar paso
          </BaseButton>
          <BaseButton type="button" variant="primary" :loading="saving" :disabled="formSteps.length === 0" @click="save">
            Guardar fidelizacion
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ExclamationTriangleIcon,
  GiftIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useProductsStore } from '@/store/products'
import { loyaltyCycleApi } from '@/services/MainAPI/loyaltyCycleApi'
import type { LoyaltyCycleStep, LoyaltyRewardType, UpsertLoyaltyCycleStep } from '@/types/loyaltyCycle'

const props = defineProps<{ branchId: number }>()
const emit = defineEmits<{ saved: [steps: LoyaltyCycleStep[]] }>()

type EditableStep = {
  id?: number
  localId: string
  stepIndex: number
  stepName: string | null
  rewardLabel: string
  rewardType: LoyaltyRewardType
  giftProductId: number | null
  discountPercentage: number | null
  isActive: boolean
}

const productsStore = useProductsStore()
const loading = ref(false)
const saving = ref(false)
const formSteps = ref<EditableStep[]>([])
const message = reactive<{ text: string; type: 'success' | 'warning' | 'error' | 'info' }>({ text: '', type: 'info' })

const rewardTypeOptions = [
  { value: 'GiftProduct', label: 'Producto gratis' },
  { value: 'FreeDelivery', label: 'Domicilio gratis' },
  { value: 'PercentageDiscount', label: 'Descuento porcentual' },
]

const productOptions = computed(() =>
  productsStore.currentProducts
    .filter((p) => p.active && p.branchId === props.branchId)
    .map((p) => ({ id: p.id, name: p.name, categoryName: p.categoryName })),
)

const giftProductOptions = computed(() => {
  const gifts = productOptions.value.filter((p) => normalize(p.categoryName) === 'regalos')
  return gifts.length > 0 ? gifts : productOptions.value
})

const activeSteps = computed(() => formSteps.value.filter((step) => step.isActive))

async function load() {
  loading.value = true
  message.text = ''
  try {
    await productsStore.ensureCatalogLoaded()
    const res = await loyaltyCycleApi.getCycle(props.branchId)
    formSteps.value = (res.data ?? []).map(fromDto)
  } catch (error: any) {
    message.type = 'error'
    message.text = error?.message || 'No se pudo cargar fidelizacion.'
  } finally {
    loading.value = false
  }
}

function fromDto(step: LoyaltyCycleStep): EditableStep {
  return {
    id: step.id,
    localId: `loyalty-${step.id}`,
    stepIndex: step.stepIndex,
    stepName: step.stepName ?? '',
    rewardLabel: step.rewardLabel ?? '',
    rewardType: step.rewardType ?? 'GiftProduct',
    giftProductId: step.giftProductId ?? null,
    discountPercentage: step.discountPercentage ?? null,
    isActive: step.isActive,
  }
}

function addStep() {
  const nextIndex = Math.max(0, ...formSteps.value.map((step) => Number(step.stepIndex) || 0)) + 1
  formSteps.value.push({
    localId: `loyalty-new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    stepIndex: nextIndex,
    stepName: '',
    rewardLabel: '',
    rewardType: 'GiftProduct',
    giftProductId: null,
    discountPercentage: null,
    isActive: true,
  })
}

function removeStep(index: number) {
  formSteps.value.splice(index, 1)
}

function validate(): string | null {
  const seen = new Set<number>()
  for (const step of formSteps.value) {
    const stepIndex = Number(step.stepIndex)
    if (!Number.isFinite(stepIndex) || stepIndex <= 0) return 'Cada paso debe tener un numero mayor que cero.'
    if (seen.has(stepIndex)) return `El paso ${stepIndex} esta duplicado.`
    seen.add(stepIndex)
    if (!String(step.rewardLabel ?? '').trim()) return `El paso ${stepIndex} necesita nombre/mensaje visible.`
    if (step.rewardType === 'GiftProduct') {
      if (!step.giftProductId) return `El paso ${stepIndex} necesita producto regalo.`
      const product = productOptions.value.find((p) => p.id === step.giftProductId)
      if (!product || normalize(product.categoryName) !== 'regalos') {
        return `El producto regalo del paso ${stepIndex} debe pertenecer a Regalos.`
      }
    }
    if (step.rewardType === 'PercentageDiscount') {
      const pct = Number(step.discountPercentage)
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return `El descuento del paso ${stepIndex} debe ser mayor a 0 y maximo 100.`
      }
    }
  }
  return null
}

async function save() {
  const validation = validate()
  if (validation) {
    message.type = 'error'
    message.text = validation
    return
  }

  const payload: UpsertLoyaltyCycleStep[] = formSteps.value
    .map((step) => ({
      stepIndex: Number(step.stepIndex),
      stepName: String(step.stepName ?? '').trim() || null,
      rewardLabel: String(step.rewardLabel ?? '').trim(),
      rewardType: step.rewardType,
      giftProductId: step.rewardType === 'GiftProduct' ? step.giftProductId : null,
      discountPercentage: step.rewardType === 'PercentageDiscount' ? Number(step.discountPercentage) : null,
      isActive: step.isActive,
    }))
    .sort((a, b) => a.stepIndex - b.stepIndex)

  saving.value = true
  message.text = ''
  try {
    const res = await loyaltyCycleApi.saveCycle(props.branchId, payload)
    formSteps.value = (res.data ?? []).map(fromDto)
    message.type = 'success'
    message.text = 'Fidelizacion guardada.'
    emit('saved', res.data ?? [])
  } catch (error: any) {
    message.type = 'error'
    message.text = error?.message || 'No se pudo guardar fidelizacion.'
  } finally {
    saving.value = false
  }
}

function normalize(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

onMounted(() => {
  void load()
})

watch(() => props.branchId, () => {
  void load()
})

watch(
  formSteps,
  (steps) => {
    for (const step of steps) {
      if (step.rewardType !== 'GiftProduct') step.giftProductId = null
      if (step.rewardType !== 'PercentageDiscount') step.discountPercentage = null
    }
  },
  { deep: true },
)
</script>

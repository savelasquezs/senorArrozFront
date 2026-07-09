<template>
  <BaseCard>
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GiftIcon class="w-6 h-6 text-amber-600" />
            Fidelizacion
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            Ciclo de premios configurable por sucursal.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <BaseBadge :variant="activeSteps.length > 0 ? 'success' : 'secondary'">
            {{ activeSteps.length > 0 ? `${activeSteps.length} activo(s)` : 'Sin ciclo' }}
          </BaseBadge>
          <BaseButton type="button" variant="outline" size="sm" @click="openCreateStep">
            <span class="flex items-center gap-1.5">
              <PlusIcon class="w-4 h-4" />
              Agregar
            </span>
          </BaseButton>
        </div>
      </div>

      <BaseAlert v-if="message.text" :type="message.type">
        <ExclamationTriangleIcon v-if="message.type === 'error'" class="w-5 h-5" />
        <InformationCircleIcon v-else class="w-5 h-5" />
        <span>{{ message.text }}</span>
      </BaseAlert>

      <BaseLoading v-if="loading" text="Cargando ciclo de fidelizacion..." />

      <div v-else class="overflow-hidden rounded-md border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Paso</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Nombre</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Premio</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Mensaje visible</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
              <th class="px-3 py-2 text-right font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr v-if="sortedSteps.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-sm text-gray-500">
                No hay pasos configurados.
              </td>
            </tr>
            <tr
              v-for="(step, index) in sortedSteps"
              :key="step.localId"
              :class="!step.isActive ? 'bg-gray-50 text-gray-500' : ''"
            >
              <td class="px-3 py-2 font-medium text-gray-900">
                {{ step.stepIndex }}
              </td>
              <td class="px-3 py-2">
                {{ step.stepName || '-' }}
              </td>
              <td class="px-3 py-2">
                {{ rewardTypeLabel(step.rewardType) }}
              </td>
              <td class="px-3 py-2">
                {{ rewardSummary(step) }}
              </td>
              <td class="px-3 py-2 max-w-[240px] truncate" :title="step.rewardLabel">
                {{ step.rewardLabel || '-' }}
              </td>
              <td class="px-3 py-2">
                <BaseBadge :variant="step.isActive ? 'success' : 'secondary'">
                  {{ step.isActive ? 'Activo' : 'Inactivo' }}
                </BaseBadge>
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-1.5">
                  <BaseButton variant="ghost" size="sm" title="Editar" @click="openEditStep(index)">
                    <PencilSquareIcon class="w-4 h-4" />
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    class="text-red-600 hover:text-red-700"
                    title="Quitar"
                    @click="removeStep(index)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end border-t border-gray-100 pt-3">
        <BaseButton type="button" variant="primary" :loading="saving" :disabled="formSteps.length === 0" @click="save">
          Guardar fidelizacion
        </BaseButton>
      </div>
    </div>

    <BaseDialog v-model="showStepDialog" :title="editingIndex == null ? 'Agregar paso' : 'Editar paso'" size="lg">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseInput
          v-model="draftStep.stepIndex"
          type="number"
          label="Paso del ciclo"
          :min="1"
          required
        />
        <BaseInput
          v-model="draftStep.stepName"
          label="Nombre interno"
          placeholder="Ej: Premio 5 pedidos"
        />
        <BaseSelect
          v-model="draftStep.rewardType"
          :options="rewardTypeOptions"
          value-key="value"
          display-key="label"
          label="Tipo de premio"
          :searchable="false"
        />
        <label class="flex items-end gap-2 pb-2 text-sm font-medium text-gray-700">
          <input
            v-model="draftStep.isActive"
            type="checkbox"
            class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Activo
        </label>
        <BaseSelect
          v-if="draftStep.rewardType === 'GiftProduct'"
          v-model="draftStep.giftProductId"
          :options="giftProductOptions"
          value-key="id"
          display-key="name"
          label="Producto regalo"
          placeholder="Seleccionar producto"
          searchable
          teleport-dropdown
        />
        <BaseInput
          v-if="draftStep.rewardType === 'PercentageDiscount'"
          v-model="draftStep.discountPercentage"
          type="number"
          label="% descuento"
          :min="0"
          :max="100"
          step="0.1"
        />
        <BaseInput
          v-model="draftStep.rewardLabel"
          class="md:col-span-2"
          label="Nombre/mensaje visible"
          placeholder="Ej: Papitas gratis por fidelidad"
          required
        />
      </div>

      <p v-if="draftStep.rewardType === 'GiftProduct'" class="mt-3 text-xs text-gray-500">
        El producto regalo debe pertenecer a la categoria Regalos.
      </p>
      <p v-if="draftStep.rewardType === 'FreeDelivery'" class="mt-3 text-xs text-gray-500">
        Este paso marca el premio como domicilio gratis.
      </p>
      <p v-if="draftStep.rewardType === 'PercentageDiscount'" class="mt-3 text-xs text-gray-500">
        El descuento se aplica sobre productos del pedido.
      </p>

      <BaseAlert v-if="modalError" class="mt-4" type="error">
        <ExclamationTriangleIcon class="w-5 h-5" />
        <span>{{ modalError }}</span>
      </BaseAlert>

      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showStepDialog = false">
          Cancelar
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="confirmStepDialog">
          Guardar en tabla
        </BaseButton>
      </template>
    </BaseDialog>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ExclamationTriangleIcon,
  GiftIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
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
const showStepDialog = ref(false)
const editingIndex = ref<number | null>(null)
const modalError = ref('')
const message = reactive<{ text: string; type: 'success' | 'warning' | 'error' | 'info' }>({ text: '', type: 'info' })
const draftStep = reactive<EditableStep>(emptyStep(1))

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

const sortedSteps = computed(() =>
  [...formSteps.value].sort((a, b) => Number(a.stepIndex) - Number(b.stepIndex)),
)

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

function emptyStep(stepIndex: number): EditableStep {
  return {
    localId: `loyalty-new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    stepIndex,
    stepName: '',
    rewardLabel: '',
    rewardType: 'GiftProduct',
    giftProductId: null,
    discountPercentage: null,
    isActive: true,
  }
}

function copyToDraft(step: EditableStep) {
  Object.assign(draftStep, {
    ...step,
    stepName: step.stepName ?? '',
    giftProductId: step.giftProductId ?? null,
    discountPercentage: step.discountPercentage ?? null,
  })
}

function openCreateStep() {
  const nextIndex = Math.max(0, ...formSteps.value.map((step) => Number(step.stepIndex) || 0)) + 1
  editingIndex.value = null
  modalError.value = ''
  copyToDraft(emptyStep(nextIndex))
  showStepDialog.value = true
}

function openEditStep(sortedIndex: number) {
  const step = sortedSteps.value[sortedIndex]
  const realIndex = formSteps.value.findIndex((item) => item.localId === step.localId)
  if (realIndex < 0) return
  editingIndex.value = realIndex
  modalError.value = ''
  copyToDraft(formSteps.value[realIndex])
  showStepDialog.value = true
}

function removeStep(sortedIndex: number) {
  const step = sortedSteps.value[sortedIndex]
  const realIndex = formSteps.value.findIndex((item) => item.localId === step.localId)
  if (realIndex >= 0) formSteps.value.splice(realIndex, 1)
}

function confirmStepDialog() {
  const validation = validateStep(draftStep, editingIndex.value)
  if (validation) {
    modalError.value = validation
    return
  }

  const normalized = normalizeStep(draftStep)
  if (editingIndex.value == null) {
    formSteps.value.push(normalized)
  } else {
    formSteps.value.splice(editingIndex.value, 1, normalized)
  }
  message.text = ''
  showStepDialog.value = false
}

function validateStep(step: EditableStep, currentIndex: number | null): string | null {
  const stepIndex = Number(step.stepIndex)
  if (!Number.isFinite(stepIndex) || stepIndex <= 0) return 'El paso debe ser mayor que cero.'
  const duplicate = formSteps.value.some((item, index) =>
    index !== currentIndex && Number(item.stepIndex) === stepIndex,
  )
  if (duplicate) return `El paso ${stepIndex} ya existe.`
  if (!String(step.rewardLabel ?? '').trim()) return 'Ingresa el nombre/mensaje visible.'
  if (step.rewardType === 'GiftProduct') {
    if (!step.giftProductId) return 'Selecciona el producto regalo.'
    const product = productOptions.value.find((p) => p.id === step.giftProductId)
    if (!product || normalize(product.categoryName) !== 'regalos') {
      return 'El producto regalo debe pertenecer a Regalos.'
    }
  }
  if (step.rewardType === 'PercentageDiscount') {
    const pct = Number(step.discountPercentage)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return 'El descuento debe ser mayor a 0 y maximo 100.'
    }
  }
  return null
}

function validate(): string | null {
  for (let index = 0; index < formSteps.value.length; index++) {
    const validation = validateStep(formSteps.value[index], index)
    if (validation) return validation
  }
  return null
}

function normalizeStep(step: EditableStep): EditableStep {
  return {
    ...step,
    stepIndex: Number(step.stepIndex),
    stepName: String(step.stepName ?? '').trim() || null,
    rewardLabel: String(step.rewardLabel ?? '').trim(),
    giftProductId: step.rewardType === 'GiftProduct' ? step.giftProductId : null,
    discountPercentage: step.rewardType === 'PercentageDiscount' ? Number(step.discountPercentage) : null,
  }
}

async function save() {
  const validation = validate()
  if (validation) {
    message.type = 'error'
    message.text = validation
    return
  }

  const payload: UpsertLoyaltyCycleStep[] = formSteps.value
    .map((step) => normalizeStep(step))
    .map((step) => ({
      stepIndex: Number(step.stepIndex),
      stepName: step.stepName,
      rewardLabel: step.rewardLabel,
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

function rewardTypeLabel(type: LoyaltyRewardType) {
  return rewardTypeOptions.find((item) => item.value === type)?.label ?? type
}

function rewardSummary(step: EditableStep) {
  if (step.rewardType === 'GiftProduct') {
    return productOptions.value.find((product) => product.id === step.giftProductId)?.name ?? 'Producto regalo'
  }
  if (step.rewardType === 'FreeDelivery') return 'Domicilio gratis'
  if (step.rewardType === 'PercentageDiscount') return `${Number(step.discountPercentage ?? 0)}% descuento`
  return '-'
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
  () => draftStep.rewardType,
  (type) => {
    if (type !== 'GiftProduct') draftStep.giftProductId = null
    if (type !== 'PercentageDiscount') draftStep.discountPercentage = null
  },
)
</script>

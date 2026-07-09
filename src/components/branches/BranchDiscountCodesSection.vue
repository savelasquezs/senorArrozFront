<template>
  <BaseCard>
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Codigos promocionales</h3>
          <p class="mt-1 text-sm text-gray-600">Beneficios por codigo para esta sucursal.</p>
        </div>
        <div class="flex items-center gap-2">
          <BaseBadge :variant="activeCodes.length > 0 ? 'success' : 'secondary'">
            {{ activeCodes.length }} activo(s)
          </BaseBadge>
          <BaseButton type="button" variant="outline" size="sm" @click="openCreate">
            Agregar
          </BaseButton>
        </div>
      </div>

      <BaseAlert v-if="message.text" :type="message.type">
        <span>{{ message.text }}</span>
      </BaseAlert>

      <BaseLoading v-if="loading" text="Cargando codigos..." />

      <div v-else class="overflow-hidden rounded-md border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Codigo</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Beneficio</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Vigencia</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Minimo</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
              <th class="px-3 py-2 text-right font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr v-if="codes.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-gray-500">
                No hay codigos configurados.
              </td>
            </tr>
            <tr v-for="code in codes" :key="code.id" :class="!code.isActive ? 'bg-gray-50 text-gray-500' : ''">
              <td class="px-3 py-2 font-semibold text-gray-900">{{ code.code }}</td>
              <td class="px-3 py-2">{{ typeLabel(code.type) }}</td>
              <td class="px-3 py-2">
                <div class="font-medium text-gray-800">{{ code.label || rewardSummary(code) }}</div>
                <div v-if="code.description" class="text-xs text-gray-500 truncate max-w-[260px]">{{ code.description }}</div>
              </td>
              <td class="px-3 py-2 text-xs text-gray-600">
                <div>{{ formatDate(code.startsAt) }}</div>
                <div>{{ code.endsAt ? formatDate(code.endsAt) : 'Sin fin' }}</div>
              </td>
              <td class="px-3 py-2">{{ code.minimumOrderValue ? formatCurrency(code.minimumOrderValue) : '-' }}</td>
              <td class="px-3 py-2">
                <BaseBadge :variant="code.status === 'active' ? 'success' : 'secondary'">
                  {{ statusLabel(code) }}
                </BaseBadge>
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-1.5">
                  <BaseButton variant="ghost" size="sm" title="Editar" @click="openEdit(code)">
                    <PencilIcon class="w-4 h-4" />
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" title="Eliminar" @click="removeCode(code)">
                    <TrashIcon class="w-4 h-4 text-red-500" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </BaseCard>

  <BaseDialog v-model="showDialog" :title="editingId ? 'Editar codigo' : 'Nuevo codigo'" size="md">
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.code" label="Codigo" placeholder="ARROZ10" />
        <BaseInput v-model="form.label" label="Nombre/mensaje visible" placeholder="10% de descuento" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Tipo de beneficio</label>
        <select v-model="form.type" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="GiftProduct">Producto gratis</option>
          <option value="FreeDelivery">Domicilio gratis</option>
          <option value="PercentageDiscount">Descuento porcentual</option>
        </select>
      </div>

      <div v-if="form.type === 'GiftProduct'">
        <label class="mb-1 block text-sm font-medium text-gray-700">Producto regalo</label>
        <select v-model.number="form.giftProductId" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option :value="null">Seleccionar</option>
          <option v-for="product in giftProducts" :key="product.id" :value="product.id">
            {{ product.name }}
          </option>
        </select>
      </div>

      <BaseInput
        v-if="form.type === 'PercentageDiscount'"
        v-model.number="form.discountPercentage"
        label="% descuento"
        type="number"
        :min="0"
        :max="100"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.startsAt" label="Inicio" type="datetime-local" />
        <BaseInput v-model="form.endsAt" label="Fin" type="datetime-local" />
      </div>

      <BaseInput v-model.number="form.minimumOrderValue" label="Pedido minimo" type="number" :min="0" />

      <BaseInput v-model="form.description" label="Descripcion" type="textarea" rows="2" />

      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-emerald-600">
        Activo
      </label>
    </div>
    <template #footer>
      <BaseButton variant="secondary" size="sm" @click="showDialog = false">Cancelar</BaseButton>
      <BaseButton variant="primary" size="sm" :loading="saving" @click="saveCode">Guardar</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { discountCodeApi } from '@/services/MainAPI/discountCodeApi'
import { useProductsStore } from '@/store/products'
import type { DiscountCode, DiscountCodeType, UpsertDiscountCode } from '@/types/discountCode'

const props = defineProps<{ branchId: number }>()

const productsStore = useProductsStore()
const codes = ref<DiscountCode[]>([])
const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const message = reactive<{ type: 'success' | 'error' | 'info'; text: string }>({ type: 'info', text: '' })

const form = reactive({
  code: '',
  type: 'PercentageDiscount' as DiscountCodeType,
  giftProductId: null as number | null,
  discountPercentage: 0,
  startsAt: '',
  endsAt: '',
  minimumOrderValue: null as number | null,
  isActive: true,
  label: '',
  description: '',
})

const activeCodes = computed(() => codes.value.filter((code) => code.isActive))
const giftProducts = computed(() =>
  productsStore.currentProducts.filter((product) =>
    product.branchId === props.branchId &&
    product.active &&
    normalize(product.categoryName) === 'regalos'),
)

onMounted(() => {
  void loadData()
})

watch(() => props.branchId, () => {
  void loadData()
})

async function loadData() {
  loading.value = true
  message.text = ''
  try {
    const [codesResponse] = await Promise.all([
      discountCodeApi.getAll(props.branchId),
      productsStore.fetch({ branchId: props.branchId, active: true, page: 1, pageSize: 150 }),
    ])
    codes.value = codesResponse.data ?? []
  } catch (err: any) {
    message.type = 'error'
    message.text = err?.message || 'No se pudieron cargar los codigos.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  resetForm()
  showDialog.value = true
}

function openEdit(code: DiscountCode) {
  editingId.value = code.id
  form.code = code.code
  form.type = code.type
  form.giftProductId = code.giftProductId ?? null
  form.discountPercentage = Number(code.discountPercentage ?? 0)
  form.startsAt = toDateTimeLocal(code.startsAt)
  form.endsAt = code.endsAt ? toDateTimeLocal(code.endsAt) : ''
  form.minimumOrderValue = code.minimumOrderValue ?? null
  form.isActive = code.isActive
  form.label = code.label
  form.description = code.description ?? ''
  showDialog.value = true
}

async function saveCode() {
  const validation = validateForm()
  if (validation) {
    message.type = 'error'
    message.text = validation
    return
  }

  const payload: UpsertDiscountCode = {
    id: editingId.value,
    code: form.code.trim().toUpperCase(),
    type: form.type,
    giftProductId: form.type === 'GiftProduct' ? form.giftProductId : null,
    discountPercentage: form.type === 'PercentageDiscount' ? Number(form.discountPercentage) : null,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    minimumOrderValue:
      form.minimumOrderValue == null || Number(form.minimumOrderValue) <= 0
        ? null
        : Math.round(Number(form.minimumOrderValue)),
    isActive: form.isActive,
    label: form.label.trim(),
    description: form.description.trim() || null,
  }

  saving.value = true
  try {
    if (editingId.value) {
      await discountCodeApi.update(props.branchId, payload)
    } else {
      await discountCodeApi.create(props.branchId, payload)
    }
    showDialog.value = false
    message.type = 'success'
    message.text = 'Codigo guardado.'
    await loadData()
  } catch (err: any) {
    message.type = 'error'
    message.text = err?.message || 'No se pudo guardar el codigo.'
  } finally {
    saving.value = false
  }
}

async function removeCode(code: DiscountCode) {
  if (!window.confirm(`Eliminar el codigo ${code.code}?`)) return
  try {
    await discountCodeApi.remove(props.branchId, code.id)
    message.type = 'success'
    message.text = 'Codigo eliminado.'
    await loadData()
  } catch (err: any) {
    message.type = 'error'
    message.text = err?.message || 'No se pudo eliminar el codigo.'
  }
}

function validateForm() {
  if (!form.code.trim()) return 'El codigo es requerido.'
  if (!form.label.trim()) return 'El mensaje visible es requerido.'
  if (!form.startsAt) return 'La fecha de inicio es requerida.'
  if (form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return 'La fecha final debe ser mayor al inicio.'
  if (form.type === 'GiftProduct' && !form.giftProductId) return 'Selecciona un producto regalo.'
  if (form.type === 'PercentageDiscount') {
    const percentage = Number(form.discountPercentage)
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) return 'El descuento debe estar entre 0 y 100.'
  }
  return ''
}

function resetForm() {
  form.code = ''
  form.type = 'PercentageDiscount'
  form.giftProductId = null
  form.discountPercentage = 0
  form.startsAt = toDateTimeLocal(new Date().toISOString())
  form.endsAt = ''
  form.minimumOrderValue = null
  form.isActive = true
  form.label = ''
  form.description = ''
}

function rewardSummary(code: DiscountCode) {
  if (code.type === 'GiftProduct') return code.giftProductName ?? 'Producto regalo'
  if (code.type === 'FreeDelivery') return 'Domicilio gratis'
  return `${Number(code.discountPercentage ?? 0)}% descuento`
}

function typeLabel(type: DiscountCodeType) {
  if (type === 'GiftProduct') return 'Producto gratis'
  if (type === 'FreeDelivery') return 'Domicilio gratis'
  return 'Descuento porcentual'
}

function statusLabel(code: DiscountCode) {
  if (!code.isActive || code.status === 'inactive') return 'Inactivo'
  if (code.status === 'scheduled') return 'Programado'
  if (code.status === 'expired') return 'Vencido'
  return 'Activo'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
</script>

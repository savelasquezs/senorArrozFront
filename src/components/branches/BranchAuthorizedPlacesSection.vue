<template>
  <BaseCard>
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <MapPinIcon class="h-6 w-6 text-emerald-600" />
            <h3 class="text-lg font-semibold text-gray-900">Lugares autorizados para domiciliarios</h3>
          </div>
          <p class="mt-1 text-sm text-gray-500">
            Las permanencias dentro del radio configurado se reconocerán como parte de la operación.
          </p>
        </div>
        <BaseButton size="sm" :icon="PlusIcon" @click="openCreate">Nuevo lugar</BaseButton>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-gray-500">Cargando lugares...</div>
      <div v-else-if="places.length === 0" class="rounded-lg border border-dashed border-gray-300 py-8 text-center">
        <MapPinIcon class="mx-auto h-10 w-10 text-gray-400" />
        <p class="mt-2 text-sm text-gray-600">No hay lugares autorizados configurados.</p>
      </div>
      <div v-else class="grid gap-3 md:grid-cols-2">
        <article v-for="place in places" :key="place.id" class="rounded-xl border border-gray-200 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="font-semibold text-gray-900">{{ place.name }}</h4>
                <span class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="place.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">
                  {{ place.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500">Radio: {{ place.radiusMeters }} m</p>
              <p class="mt-1 font-mono text-xs text-gray-400">{{ place.latitude.toFixed(6) }}, {{ place.longitude.toFixed(6) }}</p>
            </div>
            <div class="flex gap-2">
              <BaseButton size="sm" variant="outline" :icon="PencilIcon" @click="openEdit(place)">Editar</BaseButton>
              <BaseButton v-if="place.active" size="sm" variant="danger" :icon="NoSymbolIcon"
                :loading="disablingId === place.id" @click="disable(place)">Desactivar</BaseButton>
            </div>
          </div>
        </article>
      </div>
    </div>

    <BaseDialog v-model="dialogOpen" :title="editing ? 'Editar lugar autorizado' : 'Nuevo lugar autorizado'"
      :icon="MapPinIcon" size="2xl">
      <form class="space-y-5" @submit.prevent="save">
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="form.name" label="Nombre" placeholder="Ej: Estación de servicio" required :maxlength="100" />
          <BaseInput :model-value="form.radiusMeters"
            @update:model-value="value => form.radiusMeters = positiveInteger(value, 50)"
            type="number" :min="1" :max="5000" label="Radio autorizado (m)" required />
        </div>

        <GoogleMapsSelector :key="mapKey" v-model="selectedLocation" @location-confirmed="locationConfirmed = true" />

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.active" type="checkbox" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Lugar activo
        </label>

        <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ formError }}</p>
        <div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <BaseButton type="button" variant="secondary" @click="dialogOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving" :disabled="!canSave">Guardar lugar</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { MapPinIcon, NoSymbolIcon, PencilIcon, PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import GoogleMapsSelector from '@/components/ui/GoogleMapsSelector.vue'
import { useToast } from '@/composables/useToast'
import {
  deliveryAuthorizedPlacesApi,
  type DeliveryAuthorizedPlace,
} from '@/services/MainAPI/deliveryAuthorizedPlacesApi'

const props = defineProps<{ branchId: number }>()
const { success, error: showError } = useToast()
const places = ref<DeliveryAuthorizedPlace[]>([])
const loading = ref(false)
const saving = ref(false)
const disablingId = ref<number | null>(null)
const dialogOpen = ref(false)
const editing = ref<DeliveryAuthorizedPlace | null>(null)
const selectedLocation = ref<{ lat: number; lng: number } | null>(null)
const locationConfirmed = ref(false)
const formError = ref('')
const mapKey = ref(0)
const form = reactive({ name: '', radiusMeters: 50, active: true })

const positiveInteger = (value: unknown, fallback: number) => {
  const parsed = Math.round(Number(value))
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 5000) : fallback
}
const canSave = computed(() => form.name.trim().length >= 2 && form.radiusMeters > 0 && !!selectedLocation.value && locationConfirmed.value)

async function load() {
  loading.value = true
  try {
    places.value = (await deliveryAuthorizedPlacesApi.getAll(props.branchId)).data
  } catch (error: unknown) {
    showError('Lugares autorizados', error instanceof Error ? error.message : 'No se pudieron cargar los lugares.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.radiusMeters = 50
  form.active = true
  selectedLocation.value = null
  locationConfirmed.value = false
  formError.value = ''
  mapKey.value += 1
  dialogOpen.value = true
}

function openEdit(place: DeliveryAuthorizedPlace) {
  editing.value = place
  form.name = place.name
  form.radiusMeters = place.radiusMeters
  form.active = place.active
  selectedLocation.value = { lat: place.latitude, lng: place.longitude }
  locationConfirmed.value = true
  formError.value = ''
  mapKey.value += 1
  dialogOpen.value = true
}

async function save() {
  if (!canSave.value || !selectedLocation.value) return
  saving.value = true
  formError.value = ''
  const payload = {
    name: form.name.trim(),
    latitude: selectedLocation.value.lat,
    longitude: selectedLocation.value.lng,
    radiusMeters: form.radiusMeters,
    active: form.active,
  }
  try {
    if (editing.value) {
      await deliveryAuthorizedPlacesApi.update(props.branchId, editing.value.id, payload)
    } else {
      await deliveryAuthorizedPlacesApi.create(props.branchId, payload)
    }
    dialogOpen.value = false
    await load()
    success('Lugar guardado', 3000, 'Las permanencias se reclasificarán automáticamente.')
  } catch (error: unknown) {
    formError.value = error instanceof Error ? error.message : 'No se pudo guardar el lugar.'
  } finally {
    saving.value = false
  }
}

async function disable(place: DeliveryAuthorizedPlace) {
  if (!window.confirm(`¿Desactivar “${place.name}”?`)) return
  disablingId.value = place.id
  try {
    await deliveryAuthorizedPlacesApi.disable(props.branchId, place.id)
    await load()
    success('Lugar desactivado', 3000, 'Las permanencias se reclasificarán automáticamente.')
  } catch (error: unknown) {
    showError('No se pudo desactivar', error instanceof Error ? error.message : 'Intenta nuevamente.')
  } finally {
    disablingId.value = null
  }
}

watch(() => props.branchId, load)
watch(selectedLocation, (next, previous) => {
  if (!next || !previous) return
  if (next.lat !== previous.lat || next.lng !== previous.lng) locationConfirmed.value = false
})
onMounted(load)
</script>

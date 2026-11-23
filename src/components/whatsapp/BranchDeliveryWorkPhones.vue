<template>
  <BaseCard>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Celulares de domicilios</h3>
          <p class="mt-1 text-sm text-gray-500">Inicia una jornada de GPS en el celular, actualiza la lista y vincula su número de WhatsApp.</p>
        </div>
        <BaseButton size="sm" variant="outline" :loading="loading" :disabled="busy" @click="load">Actualizar equipos</BaseButton>
      </div>

      <ul v-if="settings.phones.length" class="divide-y divide-gray-200">
        <li v-for="binding in settings.phones" :key="binding.id" class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="text-sm font-medium">+{{ binding.phone }}</span>
          <div class="flex gap-2">
            <BaseButton size="xs" variant="outline" :disabled="busy" @click="edit(binding)">Cambiar equipo</BaseButton>
            <BaseButton size="xs" variant="ghost" :disabled="busy" @click="remove(binding)">Desvincular</BaseButton>
          </div>
        </li>
      </ul>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="save">
        <BaseInput v-model="phone" class="w-full sm:w-52" label="Número de WhatsApp" type="tel" :maxlength="40" required :disabled="busy" />
        <label class="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-sm font-medium">
          Equipo según el GPS
          <select v-model.number="workSessionId" required :disabled="busy || loading"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
            <option value="" disabled>{{ settings.devices.length ? 'Selecciona el celular' : 'Sin equipos recientes' }}</option>
            <option v-for="device in settings.devices" :key="device.workSessionId" :value="device.workSessionId">
              {{ deviceLabel(device) }}
            </option>
          </select>
        </label>
        <BaseButton type="submit" :loading="busy" :disabled="loading || !phone.trim() || !workSessionId">Vincular</BaseButton>
      </form>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <p v-else-if="saved" role="status" class="text-sm text-emerald-700">{{ saved }}</p>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { createLatestRead } from '@/helpers/latestRead'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { DeliveryWorkPhone, DeliveryWorkPhoneSettings } from '@/types/whatsapp'

const props = defineProps<{ branchId: number }>()
const settings = ref<DeliveryWorkPhoneSettings>({ phones: [], devices: [] })
const phone = ref('')
const workSessionId = ref<number | ''>('')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const saved = ref('')
const read = createLatestRead()
const dateFormat = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota',
})

function deviceLabel(device: DeliveryWorkPhoneSettings['devices'][number]) {
  return [device.description, device.deliverymanName, dateFormat.format(new Date(device.lastCommunicationAt))]
    .filter(Boolean).join(' · ')
}

function edit(binding: DeliveryWorkPhone) {
  phone.value = `+${binding.phone}`
  workSessionId.value = binding.workSessionId ?? ''
}

async function load() {
  const request = read.begin()
  loading.value = true
  error.value = ''
  try {
    const { data } = await whatsappApi.getDeliveryWorkPhones(props.branchId, request.signal)
    if (!request.isCurrent()) return
    settings.value = data
    if (!data.devices.some(device => device.workSessionId === workSessionId.value)) workSessionId.value = ''
  } catch (cause) {
    if (request.isCurrent()) error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los celulares.'
  } finally {
    if (request.isCurrent()) loading.value = false
  }
}

async function change(write: () => Promise<void>, message: string) {
  busy.value = true
  saved.value = ''
  error.value = ''
  try {
    await write()
    phone.value = ''
    workSessionId.value = ''
    saved.value = message
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.'
  } finally {
    busy.value = false
  }
}

async function save() {
  const session = workSessionId.value
  if (!session || !phone.value.trim() || busy.value) return
  await change(() => whatsappApi.saveDeliveryWorkPhone(props.branchId, phone.value, session), 'Celular vinculado.')
}

async function remove(binding: DeliveryWorkPhone) {
  await change(() => whatsappApi.removeDeliveryWorkPhone(props.branchId, binding.id), 'Celular desvinculado.')
}

onMounted(load)
onUnmounted(() => read.invalidate())
</script>

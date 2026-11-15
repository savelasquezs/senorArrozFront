<template>
  <BaseDialog :model-value="modelValue" title="Configurar recordatorios" size="3xl" scroll-body :dismissible="!busy"
    @update:model-value="requestClose">
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><p class="text-sm font-semibold text-slate-800">{{ branchName }}</p><p class="mt-1 text-xs text-slate-500">La configuración del POS también alimenta las tablas del manual.</p></div>
        <BaseButton v-if="!editing" size="sm" :icon="PlusIcon" :disabled="busy || loading" @click="edit()">Nueva tarea</BaseButton>
      </div>
      <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div v-if="syncResult || hasUnpublished" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs"
        :class="syncResult?.status === 'synced' && !hasUnpublished ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-900'">
        <p class="min-w-0 flex-1">{{ syncResult?.message || 'Hay cambios pendientes de sincronizar con el manual.' }}</p>
        <BaseButton size="xs" variant="secondary" :disabled="busy || editing" @click="synchronize">Sincronizar</BaseButton>
      </div>
      <p v-if="loading" role="status" class="py-8 text-center text-sm text-slate-500">Cargando configuración…</p>
      <form v-else-if="editing" id="reminder-editor" class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="form.title" label="Nombre de la tarea" :maxlength="160" required />
        <div>
          <label for="reminder-description" class="mb-1 block text-sm font-medium text-slate-700">Descripción y ayuda</label>
          <textarea id="reminder-description" v-model="form.description" maxlength="2000" rows="3" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          <p class="mt-1 text-xs text-slate-400">El mismo texto aparecerá en el signo de pregunta y en Mintlify.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseSelect v-model="form.period" label="Grupo de recordatorios" :options="periodOptions" :searchable="false" value-key="value" display-key="label" />
          <BaseSelect v-model="form.responsible" label="Responsable" :options="roleOptions" :searchable="false" value-key="value" display-key="label" />
        </div>
        <fieldset><legend class="mb-2 text-sm font-medium text-slate-700">Días</legend>
          <div class="flex flex-wrap gap-2">
            <button v-for="day in days" :key="day.value" type="button" :aria-pressed="form.daysOfWeek.includes(day.value)"
              class="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-emerald-600"
              :class="form.daysOfWeek.includes(day.value) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'"
              @click="toggleDay(day.value)">{{ day.label }}</button>
          </div>
          <p class="mt-2 text-xs text-slate-400">Miércoles es día de descanso y no genera recordatorios.</p>
        </fieldset>
        <label v-if="form.daysOfWeek.length === 1 && form.daysOfWeek[0] === 1" class="flex items-center gap-2 text-sm text-slate-600">
          <input v-model="form.shiftMondayHoliday" type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /> Pasar al martes cuando el lunes sea festivo
        </label>
        <BaseInput v-model="form.condition" label="Condición (opcional)" :maxlength="500" placeholder="Por ejemplo: solamente cuando se necesite apoyo" />
        <BaseInput v-model="form.manualPath" label="Enlace al procedimiento del manual" :maxlength="250" placeholder="/operacion/cajero/..." />
        <div class="grid items-end gap-4 sm:grid-cols-2">
          <BaseInput v-model.number="form.sortOrder" type="number" label="Orden en la lista" :min="0" :max="1000" />
          <label class="flex items-center gap-2 pb-2 text-sm text-slate-600"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /> Tarea activa</label>
        </div>
      </form>
      <div v-else class="space-y-2">
        <div v-for="item in definitions" :key="item.id" class="flex items-center gap-3 rounded-xl border border-slate-100 p-3" :class="{ 'opacity-60': !item.isActive }">
          <span class="rounded-xl p-2.5" :class="item.period === 'morning' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-500'"><component :is="item.period === 'morning' ? SunIcon : MoonIcon" class="h-4 w-4" /></span>
          <div class="min-w-0 flex-1"><p class="text-sm font-medium text-slate-700">{{ item.title }}</p><p class="mt-0.5 text-xs text-slate-400">{{ schedule(item) }} · {{ item.responsible === 'admin' ? 'Administración' : 'Cajero' }}{{ !item.isActive ? ' · Inactiva' : '' }}</p></div>
          <BaseButton variant="ghost" size="sm" icon-only :icon="PencilSquareIcon" :aria-label="`Editar ${item.title}`" @click="edit(item)" />
        </div>
        <div v-if="!definitions.length" class="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center"><p class="text-sm text-slate-500">Todavía no hay tareas configuradas para esta sucursal.</p></div>
      </div>
    </div>
    <template #footer>
      <template v-if="editing"><BaseButton variant="secondary" :disabled="busy" @click="cancelEdit">Volver</BaseButton><BaseButton form="reminder-editor" type="submit" :loading="busy" :disabled="loading || !form.daysOfWeek.length">Guardar cambios</BaseButton></template>
      <template v-else><BaseButton v-if="error" variant="secondary" @click="load">Reintentar</BaseButton><BaseButton variant="secondary" :disabled="busy" @click="requestClose(false)">Cerrar</BaseButton></template>
    </template>
  </BaseDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { MoonIcon, SunIcon, PlusIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useBranchContextStore } from '@/store/branchContext'
import { useDialog } from '@/composables/useDialog'
import { operationalChecklistApi as api } from '@/services/MainAPI/operationalChecklistApi'
import type { ReminderDefinition, ReminderInput, ReminderSyncResult } from '@/types/operationalChecklist'
const props = defineProps<{ modelValue: boolean; branchId: number; branchName: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>()
const branches = useBranchContextStore(), { confirmDialog } = useDialog()
const definitions = ref<ReminderDefinition[]>([]), editing = ref(false), loading = ref(false), busy = ref(false), error = ref('')
const syncResult = ref<ReminderSyncResult | null>(null), initial = ref('')
let generation = 0
const dirtySource = `operational-reminders:${props.branchId}`
const empty = (): ReminderInput => ({ id: null, title: '', description: '', condition: '', period: 'morning', daysOfWeek: [0, 1, 2, 4, 5, 6], shiftMondayHoliday: false, responsible: 'cashier', manualPath: '/operacion/responsable-caja', sortOrder: definitions.value.length + 1, isActive: true, expectedRevision: 0 })
const form = reactive<ReminderInput>(empty())
const periodOptions = [{ value: 'morning', label: 'Mañana · 10:30 a. m.' }, { value: 'evening', label: 'Tarde · 6:00 p. m.' }]
const roleOptions = [{ value: 'cashier', label: 'Cajero' }, { value: 'admin', label: 'Administración' }]
const days = [{ value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' }]
const dirty = computed(() => editing.value && JSON.stringify(form) !== initial.value)
const hasUnpublished = computed(() => definitions.value.some(x => x.revision !== x.syncedRevision))
watch(dirty, value => branches.markDirty(dirtySource, value))
function schedule(item: ReminderDefinition) { return item.shiftMondayHoliday ? 'Lunes; martes si el lunes es festivo' : item.daysOfWeek.length === 6 ? 'Todos los días de operación' : days.filter(x => item.daysOfWeek.includes(x.value)).map(x => x.label).join(', ') }
function edit(item?: ReminderDefinition) {
  Object.assign(form, item ? { id: item.id, title: item.title, description: item.description, condition: item.condition, period: item.period, daysOfWeek: [...item.daysOfWeek], shiftMondayHoliday: item.shiftMondayHoliday, responsible: item.responsible, manualPath: item.manualPath, sortOrder: item.sortOrder, isActive: item.isActive, expectedRevision: item.revision } : empty())
  initial.value = JSON.stringify(form); editing.value = true; error.value = ''
}
function toggleDay(day: number) { form.daysOfWeek = form.daysOfWeek.includes(day) ? form.daysOfWeek.filter(x => x !== day) : [...form.daysOfWeek, day].sort(); if (form.daysOfWeek.length !== 1 || form.daysOfWeek[0] !== 1) form.shiftMondayHoliday = false }
async function allowDiscard() { return !dirty.value || await confirmDialog({ title: 'Descartar cambios', message: 'Hay cambios sin guardar en este recordatorio.', confirmLabel: 'Descartar', cancelLabel: 'Seguir editando' }) }
async function cancelEdit() { if (!busy.value && await allowDiscard()) { editing.value = false; error.value = '' } }
async function requestClose(value: boolean) { if (!value && !busy.value && await allowDiscard()) { editing.value = false; emit('update:modelValue', false) } }
async function load() {
  const ticket = ++generation; loading.value = true; error.value = ''
  try { const result = await api.configuration(); if (ticket === generation) definitions.value = result.items }
  catch (e) { if (ticket === generation) error.value = e instanceof Error ? e.message : 'No se pudo cargar la configuración.' }
  finally { if (ticket === generation) loading.value = false }
}
async function save() {
  if (busy.value) return
  const ticket = generation; busy.value = true; error.value = ''
  try {
    const result = await api.save({ ...form, daysOfWeek: [...form.daysOfWeek] })
    if (ticket !== generation) return
    syncResult.value = result.documentation; editing.value = false; emit('changed'); await load()
  } catch (e) { if (ticket === generation) error.value = e instanceof Error ? e.message : 'No se pudo guardar.' }
  finally { busy.value = false }
}
async function synchronize() {
  if (busy.value) return
  const ticket = generation; busy.value = true; error.value = ''
  try { const result = await api.synchronize(); if (ticket === generation) { syncResult.value = result; await load() } }
  catch (e) { if (ticket === generation) error.value = e instanceof Error ? e.message : 'No se pudo sincronizar.' }
  finally { busy.value = false }
}
watch(() => [props.modelValue, props.branchId], () => {
  generation++; editing.value = false; syncResult.value = null; definitions.value = []
  if (props.modelValue) void load()
}, { immediate: true })
onBeforeUnmount(() => { generation++; branches.markDirty(dirtySource, false) })
</script>

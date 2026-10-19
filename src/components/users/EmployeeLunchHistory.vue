<template>
  <section class="space-y-3 rounded-lg border bg-white p-4">
    <div class="flex flex-wrap items-center gap-3">
      <h3 class="font-semibold">Almuerzos del personal</h3>
      <input v-model="date" aria-label="Fecha de almuerzos" type="date" class="rounded border p-2" />
      <button type="button" :disabled="loading" class="text-sm underline" @click="load">Actualizar</button>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
    <p v-if="loading" class="text-sm">Cargando…</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead><tr><th class="p-2">Empleado</th><th class="p-2">Salida / regreso</th><th class="p-2">Duración</th><th class="p-2"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <template v-for="person in people" :key="person.userId">
            <tr v-if="!person.lunches.length" class="border-t"><td class="p-2">{{ person.name }}</td><td class="p-2 text-gray-500" colspan="3">Sin registro</td></tr>
            <tr v-for="lunch in person.lunches" :key="lunch.id" class="border-t">
              <td class="p-2">{{ person.name }}</td>
              <td class="p-2 whitespace-nowrap">{{ format(lunch.startedAt) }} / {{ lunch.endedAt ? format(lunch.endedAt) : 'En curso' }}</td>
              <td class="p-2 tabular-nums">{{ lunchDuration(lunch, now + offset) }}</td>
              <td class="p-2"><button type="button" class="underline" @click="edit(lunch)">Corregir</button></td>
            </tr>
          </template>
          <tr v-if="!people.length"><td class="p-2 text-gray-500" colspan="4">No hay registros para esta fecha.</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="pages > 1" class="flex gap-4 text-sm">
      <button type="button" :disabled="page <= 1 || loading" @click="page--">Anterior</button>
      <span>{{ page }} / {{ pages }}</span><button type="button" :disabled="page >= pages || loading" @click="page++">Siguiente</button>
    </div>
    <BaseDialog :model-value="!!editing" title="Corregir almuerzo" @update:model-value="close">
      <form class="space-y-4" @submit.prevent="save">
        <p class="text-sm text-gray-600">Horas de Colombia</p>
        <label class="block text-sm">Salida<input v-model="start" type="datetime-local" required class="block w-full rounded border p-2" /></label>
        <label class="block text-sm">Regreso<input v-model="end" type="datetime-local" class="block w-full rounded border p-2" /><span class="text-gray-500">Vacío: sigue almorzando</span></label>
        <label class="block text-sm">Motivo<textarea v-model="reason" required maxlength="500" class="block w-full rounded border p-2" /></label>
        <p v-if="editError" role="alert" class="text-sm text-red-700">{{ editError }}</p>
        <button type="submit" :disabled="saving || !reason.trim()" class="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{{ saving ? 'Guardando…' : 'Guardar corrección' }}</button>
      </form>
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import { employeeLunchApi, lunchDuration, type EmployeeLunch, type EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';
import { useSignalR } from '@/composables/useSignalR';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';
const props = defineProps<{ branchId: number }>();
const date = ref(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' }));
const people = ref<EmployeeLunchState[]>([]), page = ref(1), pages = ref(1), loading = ref(false), error = ref('');
const editing = ref<EmployeeLunch | null>(null), start = ref(''), end = ref(''), reason = ref(''), saving = ref(false), editError = ref('');
const now = ref(Date.now()), offset = ref(0);
const { on, off } = useSignalR(ORDERS_SIGNALR_HUB_URL);
let generation = 0;
let timer: ReturnType<typeof setInterval>;
const format = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
const local = (value: string) => new Date(value).toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).replace(' ', 'T').slice(0, 16);
async function load() {
  const current = ++generation;
  loading.value = true; error.value = '';
  try {
    const result = await employeeLunchApi.branch(date.value, page.value);
    if (current !== generation) return;
    people.value = result.items; pages.value = result.totalPages;
    if (result.items[0]) offset.value = Date.parse(result.items[0].serverTimeUtc) - Date.now();
  } catch (e) { if (current === generation) { people.value = []; error.value = (e as Error).message; } }
  finally { if (current === generation) loading.value = false; }
}
function edit(lunch: EmployeeLunch) { editing.value = lunch; start.value = local(lunch.startedAt); end.value = lunch.endedAt ? local(lunch.endedAt) : ''; reason.value = ''; editError.value = ''; }
function close(value: boolean) { if (!value && !saving.value) editing.value = null; }
async function save() {
  if (!editing.value || saving.value) return;
  saving.value = true; editError.value = '';
  try {
    await employeeLunchApi.correct(editing.value, new Date(start.value + ':00-05:00').toISOString(), end.value ? new Date(end.value + ':00-05:00').toISOString() : null, reason.value.trim());
    editing.value = null; await load();
  } catch (e) { editError.value = (e as Error).message; await load(); }
  finally { saving.value = false; }
}
watch([date, () => props.branchId], () => { editing.value = null; if (page.value !== 1) page.value = 1; else void load(); });
watch(page, load);
onMounted(() => { void load(); on('EmployeeLunchChanged', load); timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { generation++; off('EmployeeLunchChanged', load); clearInterval(timer); });
</script>

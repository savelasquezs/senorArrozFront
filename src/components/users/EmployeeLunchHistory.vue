<template>
  <section class="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Registro de almuerzos" :aria-busy="loading">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-3 py-2.5 sm:px-4">
      <div class="flex items-center gap-1">
        <BaseButton variant="ghost" size="sm" aria-label="Día anterior" :icon="ChevronLeftIcon" @click="shiftDate(-1)" />
        <input v-model="date" aria-label="Fecha de almuerzos" type="date" :max="today" class="min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        <BaseButton variant="ghost" size="sm" aria-label="Día siguiente" :disabled="date >= today" :icon="ChevronRightIcon" @click="shiftDate(1)" />
        <BaseButton v-if="date !== today" variant="ghost" size="sm" @click="date = today">Hoy</BaseButton>
      </div>
      <BaseButton variant="outline" size="sm" :icon="ArrowPathIcon" :loading="loading" aria-label="Actualizar almuerzos" title="Actualizar" @click="load"><span class="hidden sm:inline">Actualizar</span></BaseButton>
    </div>
    <div v-if="error" role="alert" class="m-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      <span>{{ error }}</span><button type="button" class="shrink-0 font-medium underline" @click="load">Reintentar</button>
    </div>
    <div v-if="loading && !people.length" role="status" class="space-y-3 p-4">
      <span class="sr-only">Cargando almuerzos…</span>
      <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded-lg bg-gray-100" />
    </div>
    <table v-else-if="rows.length" class="w-full text-left text-sm">
      <thead class="border-b border-gray-100 text-xs font-medium text-gray-500">
        <tr><th scope="col" class="px-3 py-2 font-medium sm:px-4">Empleado</th><th scope="col" class="hidden px-3 py-2 font-medium sm:table-cell">Salida</th><th scope="col" class="hidden px-3 py-2 font-medium sm:table-cell">Regreso</th><th scope="col" class="px-3 py-2 font-medium">Tiempo</th><th scope="col" class="hidden px-3 py-2 font-medium sm:table-cell">Estado</th><th v-if="canCorrect" scope="col" class="w-10"><span class="sr-only">Acciones</span></th></tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr v-for="row in rows" :key="row.key" class="transition-colors hover:bg-gray-50/70">
          <td class="max-w-0 px-3 py-3 sm:px-4">
            <p class="line-clamp-2 break-words font-medium text-gray-900 sm:block sm:truncate" :title="row.person.name">{{ row.person.name }}</p>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <span>{{ USER_ROLE_LABELS[row.person.role as UserRoleType] || row.person.role }}</span>
              <BaseBadge class="sm:hidden" :variant="row.status.variant" size="sm">{{ row.status.label }}</BaseBadge>
            </div>
            <p v-if="row.lunch" class="mt-1 text-xs tabular-nums text-gray-500 sm:hidden">{{ format(row.lunch.startedAt) }} — {{ row.lunch.endedAt ? format(row.lunch.endedAt) : 'En curso' }}</p>
          </td>
          <td class="hidden whitespace-nowrap px-3 py-3 tabular-nums text-gray-600 sm:table-cell">{{ row.lunch ? format(row.lunch.startedAt) : '—' }}</td>
          <td class="hidden whitespace-nowrap px-3 py-3 tabular-nums text-gray-600 sm:table-cell">{{ row.lunch?.endedAt ? format(row.lunch.endedAt) : '—' }}</td>
          <td class="whitespace-nowrap px-3 py-3 font-medium tabular-nums" :class="row.lunch && !row.lunch.endedAt ? 'text-amber-700' : 'text-gray-700'">{{ row.lunch ? lunchDuration(row.lunch, now + offset) : '—' }}<span v-if="row.lunch" class="ml-1 text-xs font-normal text-gray-400">h</span></td>
          <td class="hidden px-3 py-3 sm:table-cell"><BaseBadge :variant="row.status.variant" size="sm">{{ row.status.label }}</BaseBadge></td>
          <td v-if="canCorrect" class="pr-3 text-right">
            <BaseButton v-if="row.lunch" variant="ghost" size="sm" :icon="PencilSquareIcon" :aria-label="`Corregir almuerzo de ${row.person.name}`" @click="edit(row.lunch, row.person.name, $event)" />
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!error" class="px-4 py-12 text-center">
      <CalendarDaysIcon class="mx-auto h-7 w-7 text-gray-300" />
      <p class="mt-2 text-sm font-medium text-gray-700">Sin registros para esta fecha</p>
      <p class="mt-1 text-xs text-gray-500">Selecciona otro día para consultar los almuerzos.</p>
    </div>
    <footer v-if="!error && !loading" class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2.5 text-xs text-gray-500 sm:px-4">
      <span>{{ total }} {{ total === 1 ? 'empleado' : 'empleados' }} · Horas de Colombia</span>
      <div v-if="pages > 1" class="flex items-center gap-2">
        <BaseButton variant="ghost" size="sm" aria-label="Página anterior" :disabled="page <= 1" :icon="ChevronLeftIcon" @click="page--" />
        <span>{{ page }} / {{ pages }}</span>
        <BaseButton variant="ghost" size="sm" aria-label="Página siguiente" :disabled="page >= pages" :icon="ChevronRightIcon" @click="page++" />
      </div>
    </footer>
    <BaseDialog v-if="canCorrect" :model-value="!!editing" title="Corregir almuerzo" :close-on-backdrop="!saving" @update:model-value="close">
      <form class="space-y-4" @submit.prevent="save" @keydown.esc.stop.prevent="close(false)">
        <p class="text-sm text-gray-500">{{ editingName }} · Horas de Colombia</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <BaseInput ref="startInput" v-model="start" label="Salida" type="datetime-local" required :disabled="saving" />
          <BaseInput v-model="end" label="Regreso" type="datetime-local" hint="Vacío: sigue almorzando" :disabled="saving" />
        </div>
        <label class="block text-sm font-medium text-gray-700">Motivo de la corrección
          <textarea v-model="reason" required maxlength="500" rows="2" :disabled="saving" class="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <p v-if="editError" role="alert" class="text-sm text-red-700">{{ editError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="outline" :disabled="saving" @click="close(false)">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving" :disabled="!reason.trim()">Guardar corrección</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { ArrowPathIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PencilSquareIcon } from '@heroicons/vue/24/outline';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { employeeLunchApi, lunchDuration, type EmployeeLunch, type EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';
import { useSignalR } from '@/composables/useSignalR';
import { useAuthStore } from '@/store/auth';
import { USER_ROLE_LABELS } from '@/types/user';
import type { UserRoleType } from '@/types/auth';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';

const props = defineProps<{ branchId: number }>();
const auth = useAuthStore();
const canCorrect = computed(() => auth.isAdmin || auth.isSuperadmin);
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
const date = ref(today);
const people = ref<EmployeeLunchState[]>([]), page = ref(1), pages = ref(1), total = ref(0), loading = ref(false), error = ref('');
const editing = ref<EmployeeLunch | null>(null), editingName = ref(''), start = ref(''), end = ref(''), reason = ref(''), saving = ref(false), editError = ref('');
const startInput = ref<InstanceType<typeof BaseInput> | null>(null);
const now = ref(Date.now()), offset = ref(0);
const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
const statuses = {
  none: { label: 'Sin registro', variant: 'secondary' as const },
  active: { label: 'Almorzando', variant: 'warning' as const },
  finished: { label: 'Finalizado', variant: 'success' as const },
};
const rows = computed(() => people.value.flatMap(person => (person.lunches.length ? person.lunches : [null]).map(lunch => ({
  person, lunch, key: `${person.userId}-${lunch?.id ?? 0}`,
  status: statuses[!lunch ? 'none' : lunch.endedAt ? 'finished' : 'active'],
}))));
let generation = 0;
let timer: ReturnType<typeof setInterval>;
let returnFocus: HTMLElement | null = null;
const format = (value: string) => new Date(value).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
const local = (value: string) => new Date(value).toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).replace(' ', 'T').slice(0, 16);
function shiftDate(days: number) {
  const day = new Date(`${date.value}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  date.value = day.toISOString().slice(0, 10);
}
async function load() {
  const current = ++generation;
  loading.value = true; error.value = '';
  try {
    const result = await employeeLunchApi.branch(date.value, page.value);
    if (current !== generation) return;
    people.value = result.items; pages.value = result.totalPages; total.value = result.totalCount;
    if (result.items[0]) offset.value = Date.parse(result.items[0].serverTimeUtc) - Date.now();
  } catch (e) { if (current === generation) { people.value = []; error.value = (e as Error).message; } }
  finally { if (current === generation) loading.value = false; }
}
async function edit(lunch: EmployeeLunch, name: string, event: Event) {
  if (!canCorrect.value) return;
  returnFocus = event.currentTarget as HTMLElement;
  editing.value = lunch; editingName.value = name; start.value = local(lunch.startedAt); end.value = lunch.endedAt ? local(lunch.endedAt) : ''; reason.value = ''; editError.value = '';
  await nextTick(); startInput.value?.$el.querySelector('input')?.focus();
}
async function close(value: boolean) {
  if (value || saving.value) return;
  editing.value = null; await nextTick(); returnFocus?.focus();
}
async function save() {
  if (!canCorrect.value || !editing.value || saving.value) return;
  saving.value = true; editError.value = '';
  try {
    await employeeLunchApi.correct(editing.value, new Date(start.value + ':00-05:00').toISOString(), end.value ? new Date(end.value + ':00-05:00').toISOString() : null, reason.value.trim());
    saving.value = false; await close(false); await load();
  } catch (e) { editError.value = (e as Error).message; await load(); }
  finally { saving.value = false; }
}
watch([date, () => props.branchId], () => {
  generation++;
  people.value = []; editing.value = null; total.value = 0;
  if (!date.value) { date.value = today; return; }
  if (page.value !== 1) page.value = 1; else void load();
});
watch(page, load);
watch(connectionState, (state, previous) => { if (state === 'connected' && previous !== state) void load(); });
onMounted(() => { void load(); on('EmployeeLunchChanged', load); timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { generation++; off('EmployeeLunchChanged', load); clearInterval(timer); });
</script>

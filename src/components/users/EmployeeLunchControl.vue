<template>
  <div ref="lunchNavbarRef" class="relative inline-flex shrink-0 items-center gap-1.5">
    <button type="button"
      class="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      @click="open">Almuerzos</button>

    <div v-if="terminal && activeKitchenLunches.length === 1"
      class="inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-xs text-amber-900"
      :title="`${activeKitchenLunches[0]!.name} está almorzando`">
      <ClockIcon class="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span class="sr-only">Almorzando:</span>
      <span class="min-w-0 truncate font-medium">{{ activeKitchenLunches[0]!.name }}</span>
      <span class="shrink-0 font-semibold tabular-nums">{{ kitchenLunchDuration(activeKitchenLunches[0]!.activeLunch!) }}</span>
    </div>

    <div v-else-if="terminal && activeKitchenLunches.length > 1" class="relative" @keydown.esc.stop="showKitchenLunchList = false">
      <button type="button" aria-controls="kitchen-lunch-active-list" :aria-expanded="showKitchenLunchList"
        class="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        @click="showKitchenLunchList = !showKitchenLunchList">
        <ClockIcon class="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        <span>{{ activeKitchenLunches.length }} almorzando</span>
        <ChevronDownIcon class="h-3 w-3 transition-transform" :class="{ 'rotate-180': showKitchenLunchList }" aria-hidden="true" />
      </button>
      <div v-if="showKitchenLunchList" id="kitchen-lunch-active-list"
        class="absolute right-0 top-full z-[70] mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
          <span class="text-xs font-semibold text-gray-800">Personal en almuerzo</span>
          <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{{ activeKitchenLunches.length }}</span>
        </div>
        <ul class="max-h-64 divide-y divide-gray-100 overflow-y-auto py-1">
          <li v-for="person in activeKitchenLunches" :key="person.userId" class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="min-w-0 truncate text-xs font-medium text-gray-800" :title="person.name">{{ person.name }}</span>
            <span class="shrink-0 text-xs font-semibold tabular-nums text-amber-800">{{ kitchenLunchDuration(person.activeLunch!) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <BaseDialog :model-value="blocked || opened" :title="self?.activeLunch && !terminal ? 'Estás almorzando' : 'Almuerzos'"
    :show-close-button="!blocked && !busy" :close-on-backdrop="!blocked && !busy" z-class="z-[100]" @update:model-value="opened = $event">
    <form class="space-y-4" @submit.prevent="submit">
      <template v-if="terminal">
        <label for="lunch-employee" class="block text-sm font-medium">Empleado</label>
        <select id="lunch-employee" v-model="selectedId" class="w-full rounded-md border p-2" required :disabled="busy" @change="password = ''"><option :value="0" disabled>Selecciona tu nombre</option><option v-for="person in people" :key="person.userId" :value="person.userId">{{ person.name }}{{ person.activeLunch ? ' · Almorzando' : '' }}</option></select>
        <p v-if="!people.length && !loading" class="text-sm text-gray-600">No hay cocineros personales activos en esta sucursal.</p>
      </template>
      <p v-if="selected?.activeLunch" class="text-center text-3xl font-semibold tabular-nums">{{ lunchDuration(selected.activeLunch, now + offset) }}</p>
      <p v-if="selected?.activeLunch" class="text-sm text-gray-600">Tiempo de almuerzo · horas:minutos</p>
      <label for="lunch-password" class="block text-sm font-medium">Contraseña personal</label>
      <input id="lunch-password" ref="passwordInput" v-model="password" type="password" autocomplete="current-password" maxlength="256" required class="w-full rounded-md border p-2" :disabled="busy || loading" />
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <button v-if="uncertain || error" type="button" class="text-sm underline" :disabled="busy" @click="reload">Actualizar estado</button>
      <button type="submit" class="w-full rounded-md bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" :disabled="busy || loading || uncertain || !selected || !password">{{ busy ? 'Guardando…' : selected?.activeLunch ? 'Regresé de almorzar' : 'Salir a almorzar' }}</button>
      <button v-if="blocked" type="button" class="w-full text-sm underline" :disabled="busy" @click="openPermissions">Consultar mis permisos</button>
      <button v-if="blocked" type="button" class="w-full text-sm underline" :disabled="busy" @click="logout">Cerrar sesión</button>
    </form>
  </BaseDialog>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import { ClockIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { useEmployeeLunch } from '@/composables/useEmployeeLunch';
import { useSignalR } from '@/composables/useSignalR';
import { isTerminalAccount } from '@/helpers/employeeAccountAccess';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';
import { employeeLunchApi, lunchDuration, type EmployeeLunch, type EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';
const auth = useAuthStore(), branch = useBranchContextStore(), router = useRouter(), route = useRoute();
const { self, error, busy, uncertain, needsReconciliation, offset, refresh, change, reset } = useEmployeeLunch();
const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
const opened = ref(false), password = ref(''), selectedId = ref(0), people = ref<EmployeeLunchState[]>([]);
const loading = ref(false), now = ref(Date.now()), passwordInput = ref<HTMLInputElement>();
const showKitchenLunchList = ref(false), lunchNavbarRef = ref<HTMLElement | null>(null);
const terminal = computed(() => isTerminalAccount(auth.user));
const permissionsPage = computed(() => route.path === '/permisos' || route.path.startsWith('/permisos/'));
const blocked = computed(() => !terminal.value && !permissionsPage.value && (!!self.value?.activeLunch || needsReconciliation.value));
const selected = computed(() => terminal.value ? people.value.find(p => p.userId === selectedId.value) : self.value);
const activeKitchenLunches = computed(() => terminal.value ? people.value.filter(person => person.activeLunch) : []);
let timer: ReturnType<typeof setInterval>, peopleGeneration = 0;

function kitchenLunchDuration(lunch: EmployeeLunch) {
  const elapsed = Math.max(0, Math.floor((now.value + offset.value - Date.parse(lunch.startedAt)) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  return hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

async function loadPeople() {
  const ticket = ++peopleGeneration;
  loading.value = true;
  try {
    // Reutiliza la consulta del selector y abarca todas las páginas, no solo los primeros 50.
    const first = await employeeLunchApi.branch(undefined, 1, 100);
    if (ticket !== peopleGeneration) return false;
    const all = [...first.items];
    for (let next = 2; next <= first.totalPages; next++) {
      const result = await employeeLunchApi.branch(undefined, next, 100);
      if (ticket !== peopleGeneration) return false;
      all.push(...result.items);
    }
    people.value = all;
    if (!all.some(person => person.userId === selectedId.value)) selectedId.value = 0;
    if (activeKitchenLunches.value.length < 2) showKitchenLunchList.value = false;
    if (all[0]) offset.value = Date.parse(all[0].serverTimeUtc) - Date.now();
    uncertain.value = false; error.value = '';
    return true;
  } catch (e) {
    if (ticket === peopleGeneration) {
      people.value = []; showKitchenLunchList.value = false;
      error.value = (e as Error).message; uncertain.value = true;
    }
    return false;
  } finally { if (ticket === peopleGeneration) loading.value = false; }
}
async function reload() {
  if (!auth.user?.id) return;
  if (terminal.value) await loadPeople(); else await refresh();
}
async function open() { showKitchenLunchList.value = false; opened.value = true; await reload(); await nextTick(); passwordInput.value?.focus(); }
async function submit() {
  if (!selected.value) return;
  const value = password.value; password.value = '';
  const saved = await change(selected.value, value, terminal.value, terminal.value ? () => loadPeople() : undefined);
  if (saved) opened.value = false;
}
async function openPermissions() { opened.value = false; password.value = ''; await router.push('/permisos'); }
async function logout() { await auth.logout(); await router.push('/login'); }
function visible() { if (document.visibilityState === 'visible') void reload(); }
function closeLunchListOutside(event: PointerEvent) {
  if (!lunchNavbarRef.value?.contains(event.target as Node)) showKitchenLunchList.value = false;
}
watch([blocked, opened], async () => { password.value = ''; const app = document.getElementById('app'); if (app) app.inert = blocked.value; if (blocked.value || opened.value) { await nextTick(); passwordInput.value?.focus(); } });
watch(() => auth.user?.id, () => { reset(); peopleGeneration++; people.value = []; selectedId.value = 0; opened.value = false; showKitchenLunchList.value = false; if (auth.user) void reload(); });
watch(() => branch.selectedBranchId, () => { peopleGeneration++; people.value = []; selectedId.value = 0; showKitchenLunchList.value = false; if (terminal.value && auth.user) void loadPeople(); });
watch(connectionState, value => { if (value === 'connected') void reload(); });
onMounted(() => { void reload(); on('EmployeeLunchChanged', reload); document.addEventListener('visibilitychange', visible); document.addEventListener('pointerdown', closeLunchListOutside); timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { reset(); peopleGeneration++; password.value = ''; const app = document.getElementById('app'); if (app) app.inert = false; off('EmployeeLunchChanged', reload); document.removeEventListener('visibilitychange', visible); document.removeEventListener('pointerdown', closeLunchListOutside); clearInterval(timer); });
</script>

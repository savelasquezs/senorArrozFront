<template>
  <button type="button" class="rounded-md border px-2.5 py-1.5 text-sm text-gray-700 hover:bg-amber-50" @click="open">Almuerzos</button>
  <BaseDialog :model-value="blocked || opened" :title="self?.activeLunch && !terminal ? 'Estás almorzando' : 'Almuerzos'"
    :show-close-button="!blocked && !busy" :close-on-backdrop="!blocked && !busy" z-class="z-[100]" @update:model-value="opened = $event">
    <form class="space-y-4" @submit.prevent="submit">
      <template v-if="terminal">
        <label for="lunch-employee" class="block text-sm font-medium">Empleado</label>
        <select id="lunch-employee" v-model="selectedId" class="w-full rounded-md border p-2" required :disabled="busy" @change="password = ''"><option :value="0" disabled>Selecciona tu nombre</option><option v-for="person in people" :key="person.userId" :value="person.userId">{{ person.name }}{{ person.activeLunch ? ' · Almorzando' : '' }}</option></select>
        <div v-if="pages > 1" class="flex justify-between text-sm"><button type="button" :disabled="page <= 1 || busy" @click="loadPeople(page - 1)">Anterior</button><span>{{ page }} / {{ pages }}</span><button type="button" :disabled="page >= pages || busy" @click="loadPeople(page + 1)">Siguiente</button></div>
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
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { useEmployeeLunch } from '@/composables/useEmployeeLunch';
import { useSignalR } from '@/composables/useSignalR';
import { isTerminalAccount } from '@/helpers/employeeAccountAccess';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';
import { employeeLunchApi, lunchDuration, type EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';
const auth = useAuthStore(), branch = useBranchContextStore(), router = useRouter(), route = useRoute();
const { self, error, busy, uncertain, needsReconciliation, offset, refresh, change, reset } = useEmployeeLunch();
const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
const opened = ref(false), password = ref(''), selectedId = ref(0), people = ref<EmployeeLunchState[]>([]);
const loading = ref(false), page = ref(1), pages = ref(1), now = ref(Date.now()), passwordInput = ref<HTMLInputElement>();
const terminal = computed(() => isTerminalAccount(auth.user));
const permissionsPage = computed(() => route.path === '/permisos' || route.path.startsWith('/permisos/'));
const blocked = computed(() => !terminal.value && !permissionsPage.value && (!!self.value?.activeLunch || needsReconciliation.value));
const selected = computed(() => terminal.value ? people.value.find(p => p.userId === selectedId.value) : self.value);
let timer: ReturnType<typeof setInterval>, peopleGeneration = 0;
async function loadPeople(next = page.value) {
  const ticket = ++peopleGeneration; loading.value = true;
  try {
    const result = await employeeLunchApi.branch(undefined, next);
    if (ticket !== peopleGeneration) return false;
    people.value = result.items; page.value = result.page; pages.value = result.totalPages;
    if (!people.value.some(x => x.userId === selectedId.value)) selectedId.value = 0;
    if (result.items[0]) offset.value = Date.parse(result.items[0].serverTimeUtc) - Date.now();
    uncertain.value = false; error.value = ''; return true;
  } catch (e) { if (ticket === peopleGeneration) { error.value = (e as Error).message; uncertain.value = true; } return false; }
  finally { if (ticket === peopleGeneration) loading.value = false; }
}
async function reload() {
  if (!auth.user?.id) return;
  if (terminal.value) { if (opened.value) await loadPeople(); } else await refresh();
}
async function open() { opened.value = true; await reload(); await nextTick(); passwordInput.value?.focus(); }
async function submit() {
  if (!selected.value) return;
  const value = password.value; password.value = '';
  const saved = await change(selected.value, value, terminal.value, terminal.value ? () => loadPeople() : undefined);
  if (saved) opened.value = false;
}
async function openPermissions() { opened.value = false; password.value = ''; await router.push('/permisos'); }
async function logout() { await auth.logout(); await router.push('/login'); }
function visible() { if (document.visibilityState === 'visible') void reload(); }
watch([blocked, opened], async () => { password.value = ''; const app = document.getElementById('app'); if (app) app.inert = blocked.value; if (blocked.value || opened.value) { await nextTick(); passwordInput.value?.focus(); } });
watch(() => auth.user?.id, () => { reset(); peopleGeneration++; people.value = []; selectedId.value = 0; opened.value = false; if (auth.user) void reload(); });
watch(() => branch.selectedBranchId, () => { peopleGeneration++; people.value = []; selectedId.value = 0; if (opened.value && terminal.value) void loadPeople(1); });
watch(connectionState, value => { if (value === 'connected') void reload(); });
onMounted(() => { void reload(); on('EmployeeLunchChanged', reload); document.addEventListener('visibilitychange', visible); timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { reset(); peopleGeneration++; password.value = ''; const app = document.getElementById('app'); if (app) app.inert = false; off('EmployeeLunchChanged', reload); document.removeEventListener('visibilitychange', visible); clearInterval(timer); });
</script>

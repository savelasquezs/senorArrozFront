<template>
  <MainLayout page-title="Permisos laborales" hide-quick-order>
    <section class="leaves-page">
      <header class="leave-header">
        <div><p class="leave-eyebrow">Personal / Solicitudes</p><h1 class="leave-title">Permisos laborales</h1>
          <p class="leave-subtitle">{{ review ? 'Revisa las solicitudes y acompaña cada decisión con una respuesta.' : 'Solicita tu permiso y consulta las respuestas en un solo lugar.' }}</p></div>
        <BaseButton @click="formOpen = true"><PlusIcon class="w-4 h-4 mr-2" aria-hidden="true" />Solicitar permiso</BaseButton>
      </header>
      <nav class="leave-tabs" aria-label="Bandejas de permisos">
        <RouterLink to="/permisos" class="leave-tab" :class="{ 'leave-tab--active': !review }"><UserCircleIcon class="h-4 w-4" aria-hidden="true" />Mis permisos
          <span v-if="store.summary.unread" class="leave-badge leave-badge--paid">{{ store.summary.unread }} nuevos</span></RouterLink>
        <RouterLink v-if="store.canReview" :to="{ path: '/permisos', query: { tab: 'review', status: 'pending' } }" class="leave-tab" :class="{ 'leave-tab--active': review }">
          <UserGroupIcon class="h-4 w-4" aria-hidden="true" />Solicitudes del equipo <span class="leave-badge leave-badge--pending">{{ store.summary.pendingReview }}</span></RouterLink>
      </nav>
      <form class="leave-filterbar" @submit.prevent="apply">
        <div v-if="review"><BaseInput v-model="filters.search" size="sm" label="Empleado" placeholder="Buscar por nombre" :maxlength="120" /></div>
        <div><BaseSelect v-model="filters.status" :options="statusOptions" size="sm" label="Estado" :searchable="false" /></div>
        <div><BaseSelect v-model="filters.remuneration" :options="remunerationOptions" size="sm" label="Remuneración" :searchable="false" /></div>
        <div><BaseSelect v-model="filters.support" :options="supportOptions" size="sm" label="Soportes" :searchable="false" /></div>
        <div v-if="review && auth.isSuperadmin"><BaseSelect v-model="filters.branchId" :options="branchOptions" size="sm" label="Sucursal" :searchable="false" /></div>
        <div><BaseDatePicker v-model="filters.from" label="Desde" variant="compact" clearable /></div>
        <div><BaseDatePicker v-model="filters.to" label="Hasta" variant="compact" clearable /></div>
        <BaseButton type="submit" size="sm" variant="secondary" :disabled="loading">Aplicar</BaseButton>
        <button type="button" class="leave-text-button mb-1" @click="clearFilters">Limpiar</button>
      </form>
      <p v-if="error" role="alert" class="leave-alert leave-alert--error mb-4">{{ error }} <button class="underline ml-2" @click="load">Reintentar</button></p>
      <div class="leave-panel" :aria-busy="loading">
        <div class="leave-panel-heading"><h2>{{ review ? 'Bandeja del equipo' : 'Historial de solicitudes' }}</h2><span class="leave-help">{{ total }} {{ total === 1 ? 'solicitud' : 'solicitudes' }}</span></div>
        <div v-if="loading && !items.length" class="leave-empty" role="status"><ArrowPathIcon class="h-7 w-7 text-emerald-500 animate-spin" /><p class="leave-help">Cargando solicitudes…</p></div>
        <div v-else-if="!items.length" class="leave-empty">
          <div class="p-4 rounded-2xl bg-emerald-50"><CalendarDaysIcon class="h-8 w-8 text-emerald-600" aria-hidden="true" /></div>
          <p class="text-sm font-semibold text-gray-800">{{ error ? 'No se pudieron cargar las solicitudes' : 'No hay solicitudes para mostrar' }}</p>
          <p class="leave-help max-w-sm">{{ review ? 'Las solicitudes del personal aparecerán aquí. También puedes cambiar los filtros.' : 'Al enviar un permiso, podrás seguir su estado y consultar la respuesta aquí.' }}</p>
          <BaseButton v-if="!review && !error" variant="secondary" size="sm" @click="formOpen = true">Crear mi primera solicitud</BaseButton>
        </div>
        <template v-else>
          <div class="leave-desktop-table overflow-x-auto"><table class="leave-table"><thead><tr><th>{{ review ? 'Empleado y motivo' : 'Permiso' }}</th><th>Fechas y duración</th><th>Remuneración</th><th>Estado</th><th>Soportes</th><th><span class="sr-only">Abrir detalle</span></th></tr></thead>
            <tbody><tr v-for="item in items" :key="item.publicId">
              <td><RouterLink :to="detailLink(item.publicId)" class="font-semibold text-gray-800 hover:text-emerald-700">{{ review ? item.applicantName : kindName(item.kind) }}</RouterLink>
                <span v-if="item.isUnread" class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2" title="Actualización sin leer" />
                <p class="leave-help mt-1">{{ item.branchName }}{{ review ? ` · ${kindName(item.kind)}` : '' }}</p></td>
              <td><p class="text-xs text-gray-700 max-w-[250px] leading-relaxed">{{ leavePeriod(item) }}</p><p class="leave-help mt-1">{{ leaveDuration(item) }}</p></td>
              <td><LeaveStatusBadge :status="isPaid(item) ? 'paid' : 'unpaid'" :label="isPaid(item) ? 'Remunerado' : 'No remunerado'" /></td>
              <td><LeaveStatusBadge :status="item.status" /></td><td><LeaveStatusBadge v-if="item.supportStatus && item.supportStatus !== 'not_required'" :status="item.supportStatus" /><span v-else class="leave-help">No requerido</span></td>
              <td><RouterLink :to="detailLink(item.publicId)" :aria-label="`Abrir ${kindName(item.kind)}`" class="text-gray-400 hover:text-emerald-600"><ChevronRightIcon class="w-4 h-4" /></RouterLink></td>
            </tr></tbody></table></div>
          <div class="leave-mobile-list"><RouterLink v-for="item in items" :key="item.publicId" :to="detailLink(item.publicId)" class="leave-mobile-card">
            <div class="flex justify-between items-start gap-3"><div class="min-w-0"><p class="text-sm font-semibold">{{ review ? item.applicantName : kindName(item.kind) }}</p><p class="leave-help mt-1">{{ item.branchName }}{{ review ? ` · ${kindName(item.kind)}` : '' }}</p></div><LeaveStatusBadge :status="item.status" /></div>
            <p class="text-xs text-gray-600 leading-relaxed mt-3">{{ leavePeriod(item) }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-3"><span class="leave-help">{{ leaveDuration(item) }}</span><LeaveStatusBadge :status="isPaid(item) ? 'paid' : 'unpaid'" :label="isPaid(item) ? 'Remunerado' : 'No remunerado'" /><span v-if="item.isUnread" class="leave-help text-emerald-700">Nuevo</span></div>
            <p v-if="item.supportStatus && item.supportStatus !== 'not_required'" class="leave-help mt-2">Soportes: {{ supportStatusLabels[item.supportStatus] }}</p>
          </RouterLink></div>
        </template>
        <footer class="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100"><span class="leave-help">Página {{ page }} de {{ Math.max(1, totalPages) }}</span>
          <div class="flex gap-2"><BaseButton variant="secondary" size="sm" :disabled="page <= 1 || loading" @click="goPage(page - 1)">Anterior</BaseButton><BaseButton variant="secondary" size="sm" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">Siguiente</BaseButton></div></footer>
      </div>
      <p class="leave-help mt-4">Las solicitudes no modifican automáticamente nómina, turnos ni almuerzos. Las fechas se muestran en hora de Colombia.</p>
      <EmployeeLeaveForm v-model="formOpen" @saved="openDetail" />
    </section>
  </MainLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, UserCircleIcon, UserGroupIcon, CalendarDaysIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue';
import EmployeeLeaveForm from '@/components/users/EmployeeLeaveForm.vue';
import LeaveStatusBadge from '@/components/users/LeaveStatusBadge.vue';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { useEmployeeLeaveUpdates } from '@/composables/useEmployeeLeaveUpdates';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { addLeaveDays, colombiaUtc, leavePeriod, leaveDuration, leaveStatusLabels, supportStatusLabels, type LeaveItem } from '@/types/employeeLeave';
import '@/assets/employee-leaves.css';
const auth = useAuthStore(), branch = useBranchContextStore(), store = useEmployeeLeavesStore(), route = useRoute(), router = useRouter();
const review = computed(() => store.canReview && route.query.tab === 'review');
const filters = reactive({ status: '', search: '', from: null as string | null, to: null as string | null, branchId: 0, remuneration: '', support: '' });
const statusOptions = [{ id: '', name: 'Todos' }, ...Object.entries(leaveStatusLabels).map(([id, name]) => ({ id, name }))];
const remunerationOptions = [{ id: '', name: 'Todos' }, { id: 'paid', name: 'Remunerado' }, { id: 'unpaid', name: 'No remunerado' }];
const supportOptions = [{ id: '', name: 'Todos' }, ...Object.entries(supportStatusLabels).filter(([id]) => id !== 'missing').map(([id, name]) => ({ id, name }))];
const branchOptions = computed(() => [{ id: 0, name: 'Todas las sucursales' }, ...branch.options]);
const items = ref<LeaveItem[]>([]), error = ref(''), loading = ref(false), formOpen = ref(false);
const total = ref(0), totalPages = ref(0), page = computed(() => Math.max(1, Math.min(100000, Number(route.query.page) || 1)));
let generation = 0;
const kindName = (code: string) => store.kinds.find(k => k.code === code)?.label ?? code;
const isPaid = (item: LeaveItem) => item.isPaid ?? item.requestedIsPaid ?? store.kinds.find(k => k.code === item.kind)?.paidByCompanyPolicy ?? false;
const detailLink = (id: string) => ({ path: `/permisos/${id}`, query: route.query });
function syncFilters() {
  const q = route.query;
  Object.assign(filters, { status: String(q.status ?? ''), search: String(q.search ?? ''), from: q.from ? String(q.from) : null, to: q.to ? String(q.to) : null,
    branchId: Number(q.branchId) || (q.all === '0' ? branch.selectedBranchId ?? 0 : 0), remuneration: String(q.remuneration ?? ''), support: String(q.support ?? '') });
}
async function load() {
  const ticket = ++generation; error.value = ''; loading.value = true;
  if (!auth.isAuthenticated || store.isTerminal) { items.value = []; loading.value = false; return; }
  try {
    const q = route.query;
    const data = await employeeLeaveApi.list({ review: review.value, status: String(q.status ?? '') || undefined, search: review.value ? String(q.search ?? '') || undefined : undefined,
      branchId: review.value && auth.isSuperadmin ? Number(q.branchId) || (q.all === '0' ? branch.selectedBranchId ?? undefined : undefined) : undefined,
      from: q.from ? colombiaUtc(`${q.from}T00:00`) : undefined, to: q.to ? colombiaUtc(`${addLeaveDays(String(q.to), 1)}T00:00`) : undefined,
      remunerated: q.remuneration === 'paid' ? true : q.remuneration === 'unpaid' ? false : undefined,
      support: String(q.support ?? '') || undefined, page: page.value });
    if (ticket !== generation) return;
    items.value = data.items; total.value = data.totalCount; totalPages.value = data.totalPages;
  } catch (e) { if (ticket === generation) { error.value = (e as Error).message; items.value = []; } }
  finally { if (ticket === generation) loading.value = false; }
}
function apply() {
  if (filters.from && filters.to && filters.from > filters.to) { error.value = 'La fecha final no puede ser anterior a la inicial.'; return; }
  void router.replace({ path: '/permisos', query: { tab: review.value ? 'review' : undefined, status: filters.status || undefined,
    search: review.value ? filters.search || undefined : undefined, from: filters.from || undefined, to: filters.to || undefined,
    branchId: review.value && auth.isSuperadmin && filters.branchId ? String(filters.branchId) : undefined,
    remuneration: filters.remuneration || undefined, support: filters.support || undefined } });
}
function clearFilters() { void router.replace({ path: '/permisos', query: { tab: review.value ? 'review' : undefined } }); }
function goPage(value: number) { void router.replace({ query: { ...route.query, page: String(value) } }); }
function openDetail(id: string) { void router.push(detailLink(id)); }
watch(() => route.query, () => { syncFilters(); void load(); });
watch(() => auth.user?.id, () => { items.value = []; void load(); });
useEmployeeLeaveUpdates(async () => { await store.refreshSummary(); if (!formOpen.value) await load(); });
onMounted(async () => { syncFilters(); void load(); void store.refreshSummary(); try { await store.loadKinds(); } catch (e) { error.value = (e as Error).message; } });
onUnmounted(() => { generation++; });
</script>

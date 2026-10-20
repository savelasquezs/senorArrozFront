<template>
  <MainLayout page-title="Permisos laborales" hide-quick-order>
    <section class="mx-auto max-w-5xl space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3"><div><h1 class="text-2xl font-semibold text-gray-900">Permisos laborales</h1><p class="text-sm text-gray-500">Solicitudes y respuestas del equipo.</p></div><BaseButton @click="formOpen = true">Solicitar permiso</BaseButton></header>
      <nav class="flex gap-4 border-b pb-2 text-sm" aria-label="Bandejas de permisos">
        <RouterLink to="/permisos" :class="!review ? 'font-semibold text-emerald-700' : 'text-gray-600'">Mis permisos <span v-if="store.summary.unread">({{ store.summary.unread }})</span></RouterLink>
        <RouterLink v-if="store.canReview" :to="{ path: '/permisos', query: { tab: 'review', status: 'pending' } }" :class="review ? 'font-semibold text-emerald-700' : 'text-gray-600'">Solicitudes del equipo ({{ store.summary.pendingReview }})</RouterLink>
      </nav>
      <form class="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3" @submit.prevent="apply">
        <label class="text-sm">Estado<select v-model="filters.status" class="mt-1 block rounded-md border p-2"><option value="">Todos</option><option v-for="(label, code) in leaveStatusLabels" :key="code" :value="code">{{ label }}</option></select></label>
        <label v-if="review" class="text-sm">Empleado<input v-model="filters.search" maxlength="120" class="mt-1 block rounded-md border p-2" placeholder="Buscar nombre" /></label>
        <label class="text-sm">Desde<input v-model="filters.from" type="date" class="mt-1 block rounded-md border p-2" /></label>
        <label class="text-sm">Hasta<input v-model="filters.to" type="date" class="mt-1 block rounded-md border p-2" /></label>
        <label v-if="review && auth.isSuperadmin" class="flex items-center gap-2 pb-2 text-sm"><input v-model="filters.all" type="checkbox" /> Todas las sucursales</label>
        <BaseButton type="submit" variant="secondary">Aplicar</BaseButton>
      </form>
      <p v-if="error" role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }} <button class="underline" @click="load">Reintentar</button></p>
      <p v-if="loading && !items.length" class="p-5 text-sm text-gray-500" role="status">Cargando solicitudes…</p>
      <p v-else-if="!items.length && !error" class="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">No hay solicitudes con estos filtros.</p>
      <div v-else class="divide-y rounded-lg border bg-white" :aria-busy="loading">
        <RouterLink v-for="item in items" :key="item.publicId" :to="{ path: `/permisos/${item.publicId}`, query: route.query }" class="grid gap-2 p-4 hover:bg-gray-50 md:grid-cols-[1fr_1.2fr_auto] md:items-center">
          <div><p class="font-medium">{{ review ? item.applicantName : kindName(item.kind) }} <span v-if="item.isUnread" class="ml-1 text-xs text-emerald-700">Nuevo</span></p><p class="text-xs text-gray-500">{{ item.branchName }}<span v-if="review"> · {{ kindName(item.kind) }}</span></p></div>
          <p class="text-sm text-gray-600">{{ leaveDate(item.startsAt) }}<br /><span class="text-xs">Hasta {{ leaveDate(item.endsAt) }}</span></p>
          <span class="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium">{{ leaveStatusLabels[item.status] }}</span>
        </RouterLink>
      </div>
      <footer class="flex items-center justify-between text-sm"><span>{{ total }} solicitudes</span><div class="flex items-center gap-3"><BaseButton variant="secondary" :disabled="page <= 1 || loading" @click="goPage(page - 1)">Anterior</BaseButton><span>{{ page }} / {{ Math.max(1, totalPages) }}</span><BaseButton variant="secondary" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">Siguiente</BaseButton></div></footer>
    </section>
    <EmployeeLeaveForm v-model="formOpen" @saved="openDetail" />
  </MainLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmployeeLeaveForm from '@/components/users/EmployeeLeaveForm.vue';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { useEmployeeLeaveUpdates } from '@/composables/useEmployeeLeaveUpdates';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { leaveDate, leaveStatusLabels, type LeaveItem } from '@/types/employeeLeave';
const auth = useAuthStore(), branch = useBranchContextStore(), store = useEmployeeLeavesStore(), route = useRoute(), router = useRouter();
const review = computed(() => store.canReview && route.query.tab === 'review');
const filters = reactive({ status: '', search: '', from: '', to: '', all: true });
const items = ref<LeaveItem[]>([]), error = ref(''), loading = ref(false), formOpen = ref(false);
const total = ref(0), totalPages = ref(0), page = computed(() => Math.max(1, Math.min(100000, Number(route.query.page) || 1)));
let generation = 0;
const kindName = (code: string) => store.kinds.find(k => k.code === code)?.label ?? code;
function syncFilters() { Object.assign(filters, { status: String(route.query.status ?? ''), search: String(route.query.search ?? ''), from: String(route.query.from ?? ''), to: String(route.query.to ?? ''), all: route.query.all !== '0' }); }
async function load() {
  const id = ++generation; error.value = ''; loading.value = true;
  if (!auth.isAuthenticated || store.isTerminal) { items.value = []; loading.value = false; return; }
  try {
    const q = route.query;
    const data = await employeeLeaveApi.list({ review: review.value, status: String(q.status ?? '') || undefined, search: review.value ? String(q.search ?? '') || undefined : undefined,
      branchId: review.value && auth.isSuperadmin && q.all === '0' ? branch.selectedBranchId ?? undefined : undefined,
      from: q.from ? new Date(`${q.from}T00:00:00-05:00`).toISOString() : undefined,
      to: q.to ? new Date(`${q.to}T23:59:59-05:00`).toISOString() : undefined, page: page.value });
    if (id !== generation) return;
    items.value = data.items; total.value = data.totalCount; totalPages.value = data.totalPages;
  } catch (e) { if (id === generation) { error.value = (e as Error).message; items.value = []; } }
  finally { if (id === generation) loading.value = false; }
}
function apply() { void router.replace({ path: '/permisos', query: { tab: review.value ? 'review' : undefined, status: filters.status || undefined, search: filters.search || undefined, from: filters.from || undefined, to: filters.to || undefined, all: filters.all ? undefined : '0' } }); }
function goPage(value: number) { void router.replace({ query: { ...route.query, page: String(value) } }); }
function openDetail(id: string) { void router.push({ path: `/permisos/${id}`, query: route.query }); }
watch(() => route.query, () => { syncFilters(); void load(); });
watch(() => branch.selectedBranchId, () => { if (review.value && route.query.all === '0') void load(); });
watch(() => auth.user?.id, () => { items.value = []; void load(); });
useEmployeeLeaveUpdates(async () => { await store.refreshSummary(); if (!formOpen.value) await load(); });
onMounted(async () => { syncFilters(); void load(); void store.refreshSummary(); try { await store.loadKinds(); } catch (e) { error.value = (e as Error).message; } });
onUnmounted(() => { generation++; });
</script>

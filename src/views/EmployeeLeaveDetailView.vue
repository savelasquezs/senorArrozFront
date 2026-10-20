<template>
  <MainLayout page-title="Detalle de permiso" hide-quick-order>
    <section class="mx-auto max-w-4xl space-y-4">
      <RouterLink :to="{ path: '/permisos', query: route.query }" class="text-sm text-emerald-700">← Volver a permisos</RouterLink>
      <p v-if="error" role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }} <button class="underline" @click="reload">Actualizar</button></p>
      <p v-if="changed" role="status" class="rounded-md bg-amber-50 p-3 text-sm">La solicitud puede tener cambios. Cierra el formulario y actualiza antes de confirmar.</p>
      <p v-if="loading && !detail" class="p-5 text-sm text-gray-500">Cargando solicitud…</p>
      <template v-if="detail">
        <header class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold">{{ kind?.label ?? detail.request.kind }}</h1><p class="text-sm text-gray-500">{{ detail.request.applicantName }} · {{ detail.request.branchName }}</p></div><span class="rounded-full bg-gray-100 px-3 py-1 text-sm">{{ leaveStatusLabels[detail.request.status] }}</span></header>
        <p v-if="!detail.hasReviewer && ['pending','postponed'].includes(detail.request.status)" class="rounded-md bg-amber-50 p-3 text-sm">No hay otro usuario autorizado para revisar esta solicitud. Permanecerá pendiente hasta resolverlo.</p>
        <article class="space-y-4 rounded-lg border bg-white p-4">
          <div class="grid gap-4 sm:grid-cols-2"><div><p class="text-xs text-gray-500">Inicio solicitado</p><p>{{ leaveDate(detail.request.startsAt) }}</p></div><div><p class="text-xs text-gray-500">Regreso previsto</p><p>{{ leaveDate(detail.request.endsAt) }}</p></div></div>
          <p class="text-xs text-gray-500">Fechas en hora de Colombia · Enviada {{ leaveDate(detail.request.createdAt) }}</p>
          <div><h2 class="text-sm font-medium">Justificación</h2><p class="whitespace-pre-wrap break-words text-sm text-gray-700">{{ detail.justification }}</p></div>
          <p v-if="detail.documentNumber" class="text-sm">Documento: {{ detail.documentNumber }}</p>
          <div v-if="detail.decidedAt" class="space-y-1 rounded-md bg-gray-50 p-3 text-sm"><p class="font-medium">{{ detail.decidedByName }} · {{ leaveDate(detail.decidedAt) }}</p><p class="whitespace-pre-wrap">{{ detail.decisionReason }}</p><p v-if="detail.isPaid !== null">{{ detail.isPaid ? 'Permiso remunerado' : 'Permiso no remunerado' }}</p></div>
          <div class="flex flex-wrap gap-2">
            <BaseButton v-if="detail.canEdit" variant="secondary" @click="editing = true">Modificar</BaseButton>
            <template v-if="detail.canReview && ['pending','postponed'].includes(detail.request.status)"><BaseButton @click="prepare('decision', 'approved')">Aprobar</BaseButton><BaseButton variant="danger" @click="prepare('decision', 'denied')">Denegar</BaseButton><BaseButton variant="secondary" @click="prepare('decision', 'postponed')">Aplazar</BaseButton></template>
            <BaseButton v-if="detail.canCancel" variant="secondary" @click="prepare('cancel')">Cancelar solicitud</BaseButton>
          </div>
        </article>
        <article class="space-y-3 rounded-lg border bg-white p-4">
          <div class="flex flex-wrap justify-between gap-2"><h2 class="font-semibold">Soportes</h2><span class="text-sm text-gray-600">{{ supportStatusLabels[detail.supportStatus] ?? detail.supportStatus }}</span></div>
          <p v-if="detail.supportDueAt" class="text-sm">Plazo: {{ leaveDate(detail.supportDueAt) }}</p>
          <p v-if="!detail.attachments.length" class="text-sm text-gray-500">No hay documentos adjuntos.</p>
          <div v-for="file in detail.attachments" :key="file.id" class="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"><button class="min-w-0 truncate text-left text-emerald-700 underline" @click="download(file)">{{ file.fileName }} · {{ (file.size / 1024).toFixed(0) }} KB</button><button v-if="detail.canEdit" class="shrink-0 text-red-700" @click="prepareRemove(file)">Retirar</button></div>
          <label v-if="canUpload && detail.attachments.length < 5" class="block text-sm">Adjuntar soporte privado (PDF, JPG o PNG; máximo 5 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" class="mt-2 block w-full text-sm" @change="chooseFile" /></label>
        </article>
        <article class="space-y-3 rounded-lg border bg-white p-4"><h2 class="font-semibold">Regreso y verificación</h2><p class="text-sm">Regreso registrado: {{ leaveDate(detail.returnedAt) }}</p><p class="text-sm">Verificado: {{ leaveDate(detail.returnVerifiedAt) }}</p><p v-if="detail.verificationReason" class="whitespace-pre-wrap text-sm text-gray-600">{{ detail.verificationReason }}</p><div class="flex flex-wrap gap-2"><BaseButton v-if="detail.canReturn" @click="prepare('return')">Ya regresé</BaseButton><BaseButton v-if="detail.canReview && detail.request.status === 'approved'" variant="secondary" @click="prepare('verify')">Verificar soporte / regreso</BaseButton></div></article>
        <article class="space-y-3 rounded-lg border bg-white p-4"><h2 class="font-semibold">Historial</h2><div v-for="event in history" :key="event.id" class="border-l-2 pl-3 text-sm"><p class="font-medium">{{ leaveHistoryLabels[event.operation] ?? event.operation }}</p><p class="text-xs text-gray-500">{{ event.actorName }} · {{ leaveDate(event.changedAt) }}</p><p class="whitespace-pre-wrap">{{ event.reason }}</p></div><div v-if="historyPages > 1" class="flex items-center justify-end gap-3 text-sm"><button :disabled="historyPage <= 1" @click="loadHistory(historyPage - 1)">Anterior</button><span>{{ historyPage }} / {{ historyPages }}</span><button :disabled="historyPage >= historyPages" @click="loadHistory(historyPage + 1)">Siguiente</button></div></article>
      </template>
    </section>
    <EmployeeLeaveForm v-if="detail" v-model="editing" :detail="detail" @saved="reload" />
    <BaseDialog v-model="actionOpen" :title="actionTitle" size="lg" :show-close-button="!confirming" :close-on-backdrop="!confirming">
      <form class="space-y-4" @submit.prevent="confirming = true">
        <p class="text-sm">{{ detail?.request.applicantName }} · {{ leaveDate(detail?.request.startsAt) }}</p>
        <p v-if="actionType === 'decision' && kind?.paidByCompanyPolicy" class="rounded-md bg-amber-50 p-3 text-sm">Categoría remunerada según el formato interno. Revisa las condiciones aplicables; no se decide únicamente por conveniencia operativa.</p>
        <template v-if="actionType === 'decision' && action.status === 'approved'"><label class="block text-sm">¿Remunerado? <span class="text-red-600">*</span><select v-model="paidChoice" required :disabled="kind?.paidByCompanyPolicy" class="mt-1 w-full rounded-md border p-2"><option value="" disabled>Selecciona</option><option value="yes">Sí</option><option value="no">No</option></select></label><label class="flex items-center gap-2 text-sm"><input v-model="action.supportRequired" type="checkbox" /> Requiere soporte</label><label v-if="action.supportRequired" class="block text-sm">Plazo para entregar soporte<input v-model="supportDue" type="datetime-local" class="mt-1 w-full rounded-md border p-2" /></label></template>
        <template v-if="actionType === 'verify'"><label class="block text-sm">Soporte<select v-model="action.supportStatus" class="mt-1 w-full rounded-md border p-2"><option :value="null">Sin cambiar</option><option value="verified">Verificado</option><option value="rejected">Requiere corrección</option></select></label><label v-if="detail?.returnedAt" class="flex items-center gap-2 text-sm"><input v-model="action.verifyReturn" type="checkbox" /> Confirmar la verificación del regreso</label></template>
        <label class="block text-sm">Motivo / observaciones <span class="text-red-600">*</span><textarea v-model="action.reason" required maxlength="1000" rows="3" class="mt-1 w-full rounded-md border p-2" /></label>
        <div class="flex justify-end gap-2"><BaseButton variant="secondary" :disabled="confirming" @click="actionOpen = false">Cerrar</BaseButton><BaseButton type="submit" :disabled="confirming || changed">Continuar</BaseButton></div>
      </form>
    </BaseDialog>
    <PasswordConfirmation v-model="confirming" :description="confirmationDescription" :action="confirmAction" />
  </MainLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import PasswordConfirmation from '@/components/auth/PasswordConfirmation.vue';
import EmployeeLeaveForm from '@/components/users/EmployeeLeaveForm.vue';
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { useEmployeeLeaveUpdates } from '@/composables/useEmployeeLeaveUpdates';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { colombiaLocal, colombiaUtc, leaveDate, leaveStatusLabels, supportStatusLabels, leaveHistoryLabels, type LeaveAction, type LeaveAttachment, type LeaveDetail, type LeaveHistory, type LeaveStatus } from '@/types/employeeLeave';
const route = useRoute(), auth = useAuthStore(), store = useEmployeeLeavesStore();
const detail = ref<LeaveDetail>(), history = ref<LeaveHistory[]>([]), historyPage = ref(1), historyPages = ref(1);
const error = ref(''), loading = ref(false), editing = ref(false), actionOpen = ref(false), confirming = ref(false), changed = ref(false);
const actionType = ref<'decision' | 'cancel' | 'return' | 'verify' | 'upload' | 'remove'>('decision');
const action = reactive<Omit<LeaveAction, 'password'>>({ version: 0, reason: '' });
const paidChoice = ref(''), supportDue = ref(''), selectedFile = ref<File>(), removeFile = ref<LeaveAttachment>();
let uploadKey = '', generation = 0;
const publicId = computed(() => String(route.params.publicId));
const kind = computed(() => store.kinds.find(x => x.code === detail.value?.request.kind));
const canUpload = computed(() => detail.value?.request.userId === auth.user?.id && ['pending','postponed','approved'].includes(detail.value?.request.status ?? ''));
const actionTitle = computed(() => actionType.value === 'decision' ? `${leaveStatusLabels[action.status ?? 'pending']}: registrar decisión` : ({ cancel: 'Cancelar solicitud', return: 'Registrar mi regreso', verify: 'Verificar soporte / regreso', upload: 'Adjuntar soporte', remove: 'Retirar soporte' } as Record<string, string>)[actionType.value] ?? 'Confirmar');
const confirmationDescription = computed(() => `${actionTitle.value}. ${selectedFile.value?.name ?? removeFile.value?.fileName ?? ''}`);
async function loadHistory(page = 1) {
  const id = publicId.value, ticket = generation;
  try { const data = await employeeLeaveApi.history(id, page); if (id === publicId.value && ticket === generation) { history.value = data.items; historyPage.value = data.page; historyPages.value = data.totalPages; } }
  catch (e) { if (ticket === generation) error.value = (e as Error).message; }
}
async function reload() {
  const ticket = ++generation, id = publicId.value; loading.value = true; error.value = '';
  try {
    const data = await employeeLeaveApi.detail(id);
    if (ticket !== generation) return;
    detail.value = data; changed.value = false; await loadHistory();
    if (data.request.userId === auth.user?.id && data.request.isUnread) { await employeeLeaveApi.read(id, data.request.version); await store.refreshSummary(); }
  } catch (e) { if (ticket === generation) error.value = (e as Error).message; }
  finally { if (ticket === generation) loading.value = false; }
}
function prepare(type: typeof actionType.value, status?: LeaveStatus) {
  if (!detail.value) return;
  if (changed.value) { void reload(); return; }
  actionType.value = type; selectedFile.value = undefined; removeFile.value = undefined;
  Object.assign(action, { version: detail.value.request.version, reason: '', status, isPaid: null, supportRequired: detail.value.supportRequired, supportStatus: null, verifyReturn: false });
  paidChoice.value = kind.value?.paidByCompanyPolicy ? 'yes' : '';
  supportDue.value = detail.value.supportDueAt ? colombiaLocal(detail.value.supportDueAt) : '';
  if (type === 'return' || type === 'upload') confirming.value = true; else actionOpen.value = true;
}
function prepareRemove(file: LeaveAttachment) { prepare('remove'); removeFile.value = file; }
function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  if (file.size <= 0 || file.size > 5 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png'].includes(file.type)) { error.value = 'Adjunta un PDF, JPG o PNG de máximo 5 MB.'; return; }
  prepare('upload'); selectedFile.value = file; uploadKey = crypto.randomUUID();
}
async function confirmAction(password: string) {
  if (!detail.value || changed.value) throw new Error('Actualiza la solicitud antes de confirmar.');
  const id = publicId.value;
  try {
    if (actionType.value === 'upload') {
      if (!selectedFile.value) throw new Error('Selecciona el soporte.');
      await employeeLeaveApi.upload(id, action.version, uploadKey, selectedFile.value, password);
    } else if (actionType.value === 'remove') {
      if (!removeFile.value) throw new Error('Selecciona el soporte.');
      await employeeLeaveApi.removeAttachment(id, removeFile.value.id, { ...action, password });
    } else await employeeLeaveApi.change(id, actionType.value, { ...action, password, isPaid: paidChoice.value ? paidChoice.value === 'yes' : null, supportDueAt: supportDue.value ? colombiaUtc(supportDue.value) : null });
    actionOpen.value = false; selectedFile.value = undefined; removeFile.value = undefined; store.invalidate(); await reload();
  } catch (e: any) {
    if (e.status === 409) { confirming.value = false; actionOpen.value = false; await reload(); error.value = 'La solicitud cambió. Revisa los datos actualizados y confirma de nuevo.'; }
    throw e;
  }
}
async function download(file: LeaveAttachment) { try { await employeeLeaveApi.download(publicId.value, file); } catch (e) { error.value = (e as Error).message; } }
useEmployeeLeaveUpdates(async () => { await store.refreshSummary(); if (editing.value || actionOpen.value || confirming.value) changed.value = true; else await reload(); });
watch(publicId, () => { detail.value = undefined; history.value = []; editing.value = false; actionOpen.value = false; confirming.value = false; void reload(); });
watch(() => auth.user?.id, () => { generation++; detail.value = undefined; history.value = []; editing.value = false; actionOpen.value = false; confirming.value = false; });
onMounted(() => { void reload(); void store.loadKinds().catch(e => { error.value = (e as Error).message; }); });
onUnmounted(() => { generation++; selectedFile.value = undefined; removeFile.value = undefined; });
</script>

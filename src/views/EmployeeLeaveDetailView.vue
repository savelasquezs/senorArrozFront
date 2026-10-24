<template>
  <MainLayout page-title="Detalle de permiso" hide-quick-order>
    <section class="leaves-page">
      <RouterLink :to="{ path: '/permisos', query: route.query }" class="leave-text-button inline-flex items-center gap-2 mb-5"><ArrowLeftIcon class="w-4 h-4" />Volver a permisos</RouterLink>
      <p v-if="error" role="alert" class="leave-alert leave-alert--error mb-4">{{ error }} <button class="underline ml-2" @click="reload">Actualizar</button></p>
      <p v-if="changed" role="status" class="leave-alert leave-alert--warning mb-4">La solicitud cambió. Cierra la operación y actualiza antes de confirmar.</p>
      <div v-if="loading && !detail" class="leave-panel leave-empty" role="status"><ArrowPathIcon class="h-7 w-7 animate-spin text-emerald-600" /><p class="leave-help">Cargando solicitud…</p></div>
      <template v-if="detail">
        <header class="leave-header"><div><p class="leave-eyebrow">Solicitud de permiso</p><h1 class="leave-title">{{ kind?.label ?? detail.request.kind }}</h1>
          <p class="leave-subtitle">{{ detail.request.applicantName }} <span class="mx-1">·</span> {{ detail.request.branchName }}</p></div>
          <div class="flex flex-wrap items-center gap-2"><LeaveStatusBadge :status="detail.request.status" /><LeaveStatusBadge :status="recognizedPaid ? 'paid' : 'unpaid'" :label="recognizedPaid ? 'Remunerado' : 'No remunerado'" /></div></header>
        <p v-if="!detail.hasReviewer && ['pending','postponed'].includes(detail.request.status)" class="leave-alert leave-alert--warning mb-5">No hay otro usuario autorizado para revisar esta solicitud. No es posible aprobar solicitudes propias.</p>
        <div class="leave-detail-grid">
          <div class="leave-detail-stack">
            <article class="leave-panel">
              <div class="leave-panel-heading"><h2 class="flex items-center gap-2"><CalendarDaysIcon class="w-4 h-4 text-emerald-600" />Datos de la solicitud</h2><span class="leave-help">{{ leaveDuration(detail.request) }}</span></div>
              <div class="leave-panel-body space-y-5">
                <p v-if="detail.request.isPeriodRecord" class="leave-alert">Período de pausas de lactancia. No representa ausencia durante todos estos días ni requiere solicitudes por cada pausa.</p>
                <dl class="leave-data-grid"><div><dt>{{ detail.request.isAllDay ? 'Fechas solicitadas' : 'Inicio solicitado' }}</dt><dd>{{ detail.request.isAllDay ? leavePeriod(detail.request) : leaveDate(detail.request.startsAt) }}</dd></div>
                  <div><dt>{{ detail.request.isAllDay ? 'Modalidad' : 'Fin previsto' }}</dt><dd>{{ detail.request.isAllDay ? detail.request.isPeriodRecord ? 'Período de pausas' : 'Días completos' : leaveDate(detail.request.endsAt) }}</dd></div>
                  <div><dt>Remuneración solicitada</dt><dd>{{ requestedPaid ? 'Remunerado' : 'No remunerado' }}</dd></div><div><dt>Fecha de envío</dt><dd>{{ leaveDate(detail.request.createdAt) }}</dd></div></dl>
                <div class="border-t border-gray-100 pt-5"><h3 class="leave-label">Justificación</h3><p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{{ detail.justification }}</p></div>
                <p class="leave-help">Hora de Colombia · No modifica automáticamente nómina ni turnos.</p>
              </div>
            </article>
            <article class="leave-panel">
              <div class="leave-panel-heading"><h2 class="flex items-center gap-2"><DocumentTextIcon class="w-4 h-4 text-emerald-600" />Documentos de soporte</h2><LeaveStatusBadge :status="detail.supportStatus" /></div>
              <div class="leave-panel-body space-y-4">
                <div v-if="requirements.length" class="grid gap-2">
                  <div v-for="rule in requirements" :key="rule.code" class="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3">
                    <div><p class="text-xs font-semibold text-gray-700">{{ rule.label }}</p><p class="leave-help">{{ rule.required ? rule.stage === 'before' ? 'Obligatorio antes de enviar' : 'Se entrega después del evento' : 'Opcional' }}</p></div>
                    <LeaveStatusBadge :status="rule.status" />
                  </div>
                </div>
                <p v-if="detail.supportDueAt" class="leave-alert leave-alert--warning">Plazo acordado para los soportes: {{ leaveDate(detail.supportDueAt) }}</p>
                <p v-if="!activeFiles.length" class="leave-help py-2">Todavía no hay documentos adjuntos. Los soportes posteriores pueden entregarse desde aquí.</p>
                <div v-for="file in activeFiles" :key="file.id" class="leave-file">
                  <div class="leave-file-top"><DocumentTextIcon class="w-5 h-5 shrink-0 text-emerald-600" /><button class="leave-file-name text-left hover:text-emerald-700" :title="file.fileName" @click="download(file)">{{ file.fileName }}</button><LeaveStatusBadge :status="file.reviewStatus ?? 'submitted'" /></div>
                  <p class="leave-help mt-1">{{ evidenceLabel(file.evidenceCode) }} · {{ Math.max(1, Math.round(file.size / 1024)) }} KB</p>
                  <p v-if="file.reviewReason" class="leave-alert mt-2" :class="{ 'leave-alert--warning': file.reviewStatus === 'rejected' }">{{ file.reviewReason }}</p>
                  <div class="leave-file-actions"><button class="leave-text-button" @click="download(file)">Descargar</button>
                    <template v-if="canReviewDocuments"><button class="leave-text-button" @click="reviewFile(file, 'verified')">Verificar documento</button><button class="leave-text-button" @click="reviewFile(file, 'rejected')">Solicitar corrección</button></template>
                    <button v-if="canUpload && file.reviewStatus === 'rejected'" class="leave-text-button" @click="prepareUpload(file)">Reemplazar</button>
                    <button v-if="detail.canEdit && !requiredBefore(file)" class="leave-text-button text-red-700" @click="prepareRemove(file)">Retirar</button>
                  </div>
                </div>
                <BaseButton v-if="canUpload && activeFiles.length < 5" variant="secondary" size="sm" @click="prepareUpload()"><PaperClipIcon class="w-4 h-4 mr-2" />Adjuntar soporte</BaseButton>
                <details v-if="archivedFiles.length" class="text-xs border-t border-gray-100 pt-3"><summary class="cursor-pointer text-gray-500">Documentos reemplazados ({{ archivedFiles.length }})</summary><div v-for="file in archivedFiles" :key="file.id" class="py-2"><button class="leave-text-button" @click="download(file)">{{ file.fileName }}</button><p class="leave-help">{{ file.reviewReason }} · Reemplazado {{ leaveDate(file.supersededAt) }}</p></div></details>
                <p class="leave-help flex items-start gap-2"><LockClosedIcon class="w-3.5 h-3.5 shrink-0 mt-0.5" />Solo el solicitante y sus revisores autorizados pueden descargar estos documentos.</p>
              </div>
            </article>
            <article v-if="!detail.request.isPeriodRecord" class="leave-panel">
              <div class="leave-panel-heading"><h2>Regreso al trabajo</h2></div><div class="leave-panel-body">
                <dl class="leave-data-grid"><div><dt>Regreso registrado</dt><dd>{{ leaveDate(detail.returnedAt) }}</dd></div><div><dt>Verificación del regreso</dt><dd>{{ leaveDate(detail.returnVerifiedAt) }}</dd></div></dl>
                <div class="flex flex-wrap gap-2 mt-4"><BaseButton v-if="detail.canReturn" size="sm" @click="prepare('return')">Ya regresé</BaseButton><BaseButton v-if="detail.canReview && detail.request.status === 'approved' && detail.returnedAt && !detail.returnVerifiedAt" variant="secondary" size="sm" @click="verifyReturn">Verificar regreso</BaseButton></div>
              </div>
            </article>
          </div>
          <aside class="leave-detail-stack">
            <article class="leave-panel"><div class="leave-panel-heading"><h2>{{ detail.decidedAt ? 'Respuesta registrada' : detail.canReview ? 'Tu revisión' : 'Seguimiento' }}</h2></div>
              <div class="leave-panel-body space-y-4">
                <template v-if="detail.decidedAt"><LeaveStatusBadge :status="detail.request.status" /><p class="text-sm text-gray-700 whitespace-pre-wrap">{{ detail.decisionReason }}</p><p class="leave-help">{{ detail.decidedByName }}<br />{{ leaveDate(detail.decidedAt) }}</p><p v-if="detail.isPaid !== null" class="text-xs font-semibold">{{ detail.isPaid ? 'Remuneración reconocida' : 'Permiso sin remuneración' }}</p></template>
                <p v-else class="leave-help">{{ detail.canReview ? 'Consulta el motivo y verifica los soportes previos. Los posteriores pueden quedar pendientes.' : 'La solicitud está pendiente de respuesta. Te avisaremos cuando tenga una actualización.' }}</p>
                <template v-if="detail.canReview && ['pending','postponed'].includes(detail.request.status)">
                  <p v-if="approvalBlocked" class="leave-alert leave-alert--warning">Antes de aprobar: verifica {{ unverifiedPrior.map(x => x.label).join(', ') }}.</p>
                  <BaseButton class="w-full" :disabled="approvalBlocked || changed" @click="prepare('decision', 'approved')">Aprobar permiso</BaseButton>
                  <div class="grid grid-cols-2 gap-2"><BaseButton variant="secondary" size="sm" @click="prepare('decision', 'postponed')">Pedir ajuste</BaseButton><BaseButton variant="danger" size="sm" @click="prepare('decision', 'denied')">Denegar</BaseButton></div>
                  <p class="leave-help">Los derechos legales no se rechazan por conveniencia operativa. La decisión requiere motivo y tu contraseña.</p>
                </template>
                <div v-if="detail.canEdit || detail.canCancel" class="flex flex-wrap gap-3 border-t border-gray-100 pt-3"><button v-if="detail.canEdit" class="leave-text-button" @click="editing = true">Modificar solicitud</button><button v-if="detail.canCancel" class="leave-text-button text-gray-500" @click="prepare('cancel')">Cancelar solicitud</button></div>
              </div>
            </article>
            <article class="leave-panel"><div class="leave-panel-heading"><h2>Historial</h2></div><div class="leave-panel-body"><div class="leave-timeline">
              <div v-for="event in history" :key="event.id" class="leave-timeline-item"><p class="text-xs font-semibold text-gray-700">{{ leaveHistoryLabels[event.operation] ?? event.operation }}</p><p class="leave-help mt-1">{{ event.actorName }}<br />{{ leaveDate(event.changedAt) }}</p><p class="leave-help whitespace-pre-wrap mt-2">{{ event.reason }}</p></div>
              </div><div v-if="historyPages > 1" class="flex justify-between gap-2 mt-4"><button class="leave-text-button" :disabled="historyPage <= 1" @click="loadHistory(historyPage - 1)">Anterior</button><span class="leave-help">{{ historyPage }} / {{ historyPages }}</span><button class="leave-text-button" :disabled="historyPage >= historyPages" @click="loadHistory(historyPage + 1)">Siguiente</button></div></div></article>
          </aside>
        </div>
      </template>
    </section>
    <EmployeeLeaveForm v-if="detail" v-model="editing" :detail="detail" @saved="reload" />
    <BaseDialog v-model="actionOpen" :title="actionTitle" size="xl" scroll-body :show-close-button="!confirming" :close-on-backdrop="!confirming">
      <form :id="actionFormId" class="space-y-4" @submit.prevent="confirmPreparedAction">
        <p class="leave-help">{{ detail?.request.applicantName }} · {{ kind?.label }}</p>
        <template v-if="actionType === 'upload'"><p v-if="replacement" class="leave-alert">Reemplazarás {{ replacement.fileName }}. La aprobación y el documento anterior se conservan.</p>
          <LeaveAttachmentsPicker v-model="pendingFiles" :requirements="kind?.evidence ?? []" :max-files="1" :disabled="confirming"
            :fixed-evidence-code="replacement?.evidenceCode" :show-requirements="false" /></template>
        <template v-else>
          <p v-if="selectedFile" class="leave-alert">Documento: {{ selectedFile.fileName }}</p>
          <template v-if="actionType === 'decision' && action.status === 'approved'">
            <BaseSelect v-model="paidChoice" :options="paidOptions" label="Remuneración reconocida" :disabled="kind?.paidByCompanyPolicy || confirming" :searchable="false" required teleport-dropdown />
            <p v-if="kind?.paidByCompanyPolicy" class="leave-help">Esta categoría no puede convertirse en permiso no remunerado.</p>
            <template v-if="detail?.supportRequired"><label class="flex gap-2 text-xs items-center text-gray-600"><input v-model="setDue" type="checkbox" :disabled="confirming" class="accent-emerald-600" />Definir plazo para los soportes pendientes</label>
              <BaseDateTimePicker v-if="setDue" v-model="supportDue" label="Plazo acordado" :disabled="confirming" /></template>
          </template>
          <div><label :for="`${actionFormId}-reason`" class="leave-label">Motivo / observaciones <span class="text-red-500">*</span></label>
            <textarea :id="`${actionFormId}-reason`" v-model="action.reason" class="leave-input" required maxlength="1000" rows="3" :disabled="confirming" placeholder="Escribe una respuesta clara para el trabajador…" /></div>
        </template>
        <p v-if="actionError" class="leave-error" role="alert">{{ actionError }}</p>
      </form>
      <template #footer><BaseButton variant="secondary" :disabled="confirming" @click="actionOpen = false">Cancelar</BaseButton><BaseButton :form="actionFormId" type="submit" :disabled="confirming || changed">Confirmar con contraseña</BaseButton></template>
    </BaseDialog>
    <PasswordConfirmation v-model="confirming" :description="confirmationDescription" :action="confirmAction" />
  </MainLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, useId, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeftIcon, CalendarDaysIcon, DocumentTextIcon, LockClosedIcon, PaperClipIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseDateTimePicker from '@/components/ui/BaseDateTimePicker.vue';
import PasswordConfirmation from '@/components/auth/PasswordConfirmation.vue';
import EmployeeLeaveForm from '@/components/users/EmployeeLeaveForm.vue';
import LeaveStatusBadge from '@/components/users/LeaveStatusBadge.vue';
import LeaveAttachmentsPicker from '@/components/users/LeaveAttachmentsPicker.vue';
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { useEmployeeLeaveUpdates, type EmployeeLeaveRefreshContext } from '@/composables/useEmployeeLeaveUpdates';
import type { RefreshContext } from '@/utils/serialRefresh';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { colombiaLocal, colombiaUtc, leaveDate, leaveDuration, leavePeriod, leaveStatusLabels, leaveHistoryLabels,
  type LeaveAction, type LeaveAttachment, type LeaveDetail, type LeaveHistory, type LeavePendingFile, type LeaveStatus } from '@/types/employeeLeave';
import '@/assets/employee-leaves.css';
const route = useRoute(), auth = useAuthStore(), store = useEmployeeLeavesStore(), actionFormId = useId();
const detail = ref<LeaveDetail>(), history = ref<LeaveHistory[]>([]), historyPage = ref(1), historyPages = ref(1);
const error = ref(''), actionError = ref(''), loading = ref(false), editing = ref(false), actionOpen = ref(false), confirming = ref(false), changed = ref(false);
const actionType = ref<'decision' | 'cancel' | 'return' | 'verify' | 'upload' | 'remove'>('decision');
const action = reactive<Omit<LeaveAction, 'password'>>({ version: 0, reason: '' });
const paidChoice = ref('no'), setDue = ref(false), supportDue = ref(''), selectedFile = ref<LeaveAttachment>(), replacement = ref<LeaveAttachment>();
const pendingFiles = ref<LeavePendingFile[]>([]);
const paidOptions = [{ id: 'yes', name: 'Remunerado' }, { id: 'no', name: 'No remunerado' }];
let generation = 0, historyGeneration = 0, actionOwner: number | undefined;
let historyController: AbortController | undefined;
const publicId = computed(() => String(route.params.publicId));
const busy = computed(() => editing.value || actionOpen.value || confirming.value);
const kind = computed(() => store.kinds.find(x => x.code === detail.value?.request.kind));
const requestedPaid = computed(() => detail.value?.request.requestedIsPaid ?? kind.value?.paidByCompanyPolicy ?? false);
const recognizedPaid = computed(() => detail.value?.isPaid ?? requestedPaid.value);
const activeFiles = computed(() => detail.value?.attachments.filter(x => !x.supersededAt) ?? []);
const archivedFiles = computed(() => detail.value?.attachments.filter(x => !!x.supersededAt) ?? []);
const requirements = computed(() => detail.value?.evidenceRequirements ?? []);
const unverifiedPrior = computed(() => requirements.value.filter(x => x.required && x.stage === 'before' && x.status !== 'verified'));
const approvalBlocked = computed(() => unverifiedPrior.value.length > 0);
const mutable = computed(() => ['pending','postponed','approved'].includes(detail.value?.request.status ?? ''));
const canUpload = computed(() => detail.value?.request.userId === auth.user?.id && mutable.value);
const canReviewDocuments = computed(() => detail.value?.canReview && mutable.value);
const evidenceLabel = (code?: string) => kind.value?.evidence?.find(x => x.code === code)?.label ?? 'Información adicional';
const requiredBefore = (file: LeaveAttachment) => requirements.value.some(x => x.code === file.evidenceCode && x.required && x.stage === 'before');
const actionTitle = computed(() => actionType.value === 'decision' ? `${leaveStatusLabels[action.status ?? 'pending']}: registrar respuesta`
  : ({ cancel: 'Cancelar solicitud', return: 'Registrar mi regreso', verify: action.attachmentId ? action.supportStatus === 'verified' ? 'Verificar documento' : 'Solicitar corrección' : 'Verificar regreso', upload: replacement.value ? 'Reemplazar soporte' : 'Adjuntar soporte', remove: 'Retirar documento' })[actionType.value]);
const confirmationDescription = computed(() => `${actionTitle.value}. ${selectedFile.value?.fileName ?? pendingFiles.value[0]?.file.name ?? ''}`);
async function loadHistory(page = 1, context?: RefreshContext) {
  if (context && !context.isCurrent()) return;
  historyController?.abort();
  const controller = new AbortController(); historyController = controller;
  const id = publicId.value, ticket = generation, historyTicket = ++historyGeneration;
  const abort = () => controller.abort();
  context?.signal.addEventListener('abort', abort, { once: true });
  const current = () => id === publicId.value && ticket === generation && historyTicket === historyGeneration
    && !controller.signal.aborted && (!context || context.isCurrent());
  try {
    const data = await employeeLeaveApi.history(id, page, controller.signal);
    if (current()) { history.value = data.items; historyPage.value = data.page; historyPages.value = data.totalPages; }
  } catch (e) { if (current()) error.value = (e as Error).message; }
  finally { context?.signal.removeEventListener('abort', abort); if (historyController === controller) historyController = undefined; }
}
async function refreshDetail(context: EmployeeLeaveRefreshContext) {
  const ticket = generation, id = publicId.value;
  const current = () => ticket === generation && id === publicId.value && context.isCurrent();
  if (!auth.isAuthenticated || store.isTerminal) return;
  if (context.change && (context.change.publicId !== id || context.change.version <= (detail.value?.request.version ?? 0))) return;
  if (context.reason === 'change' && busy.value && detail.value) { changed.value = true; return; }
  loading.value = true; error.value = '';
  try {
    const data = await employeeLeaveApi.detail(id, context.signal);
    if (!current()) return;
    // Visibility/reconnection is not proof of a conflict. Preserve an open form and compare versions.
    if (context.reason !== 'manual' && busy.value && detail.value) {
      if (data.request.version > detail.value.request.version) changed.value = true;
      return;
    }
    detail.value = data; changed.value = false;
    await loadHistory(1, context);
    if (!current()) return;
    if (data.request.userId === auth.user?.id && data.request.isUnread) {
      await employeeLeaveApi.read(id, data.request.version, context.signal);
      if (!current()) return;
      if (detail.value?.request.version === data.request.version) detail.value.request.isUnread = false;
      store.invalidate();
    }
  } catch (e) { if (current()) error.value = (e as Error).message; }
  finally { if (ticket === generation) loading.value = false; }
}
const updates = useEmployeeLeaveUpdates(refreshDetail, {
  acceptChange: change => change.publicId === publicId.value && change.version > (detail.value?.request.version ?? 0),
});
function reload() { return updates.refresh(); }
function prepare(type: typeof actionType.value, status?: LeaveStatus) {
  if (!detail.value) return;
  if (changed.value) { void reload(); return; }
  actionOwner = auth.user?.id; actionType.value = type; selectedFile.value = undefined; replacement.value = undefined; pendingFiles.value = []; actionError.value = '';
  Object.assign(action, { version: detail.value.request.version, reason: '', status, isPaid: null, supportRequired: detail.value.supportRequired,
    supportStatus: null, verifyReturn: false, attachmentId: null });
  paidChoice.value = requestedPaid.value ? 'yes' : 'no'; setDue.value = !!detail.value.supportDueAt;
  supportDue.value = colombiaLocal(detail.value.supportDueAt ?? new Date(Date.now() + 86400000).toISOString());
  if (type === 'return') confirming.value = true; else actionOpen.value = true;
}
function reviewFile(file: LeaveAttachment, status: 'verified' | 'rejected') { prepare('verify'); selectedFile.value = file; action.attachmentId = file.id; action.supportStatus = status; }
function verifyReturn() { prepare('verify'); action.verifyReturn = true; }
function prepareUpload(file?: LeaveAttachment) { prepare('upload'); replacement.value = file; }
function prepareRemove(file: LeaveAttachment) { prepare('remove'); selectedFile.value = file; }
function confirmPreparedAction() {
  actionError.value = '';
  if (confirming.value || changed.value) return;
  if (actionType.value === 'upload' && pendingFiles.value.length !== 1) { actionError.value = 'Selecciona el documento que deseas enviar.'; return; }
  if (actionType.value !== 'upload' && !action.reason.trim()) { actionError.value = 'Escribe el motivo de la operación.'; return; }
  if (setDue.value) { try { colombiaUtc(supportDue.value); } catch { actionError.value = 'Revisa la fecha del plazo.'; return; } }
  confirming.value = true;
}
async function confirmAction(password: string) {
  if (!detail.value || changed.value || actionOwner !== auth.user?.id) throw new Error('Actualiza la solicitud antes de confirmar.');
  const id = publicId.value, ticket = generation;
  try {
    if (actionType.value === 'upload') {
      const file = pendingFiles.value[0]; if (!file) throw new Error('Selecciona el soporte.');
      await employeeLeaveApi.upload(id, action.version, file.uploadKey, file.file, password, file.evidenceCode, replacement.value?.id);
    } else if (actionType.value === 'remove') {
      if (!selectedFile.value) throw new Error('Selecciona el soporte.');
      await employeeLeaveApi.removeAttachment(id, selectedFile.value.id, { ...action, password });
    } else await employeeLeaveApi.change(id, actionType.value, { ...action, password, isPaid: paidChoice.value === 'yes', supportDueAt: setDue.value ? colombiaUtc(supportDue.value) : null });
    if (ticket !== generation || actionOwner !== auth.user?.id) return;
    actionOpen.value = false; pendingFiles.value = []; selectedFile.value = undefined; replacement.value = undefined; store.invalidate(); await reload();
  } catch (e: any) {
    if (e.status === 409 && ticket === generation) { confirming.value = false; actionOpen.value = false; await reload(); error.value = 'La solicitud cambió. Revisa la versión actual antes de confirmar nuevamente.'; }
    throw e;
  }
}
async function download(file: LeaveAttachment) { try { await employeeLeaveApi.download(publicId.value, file); } catch (e) { error.value = (e as Error).message; } }
function clearPrivateState() {
  generation++; updates.cancel(); historyGeneration++; historyController?.abort(); historyController = undefined;
  detail.value = undefined; history.value = []; historyPage.value = 1; historyPages.value = 1;
  editing.value = false; actionOpen.value = false; confirming.value = false; changed.value = false; loading.value = false;
  error.value = ''; actionError.value = ''; actionOwner = undefined;
  pendingFiles.value = []; selectedFile.value = undefined; replacement.value = undefined;
}
watch(publicId, () => { clearPrivateState(); void reload(); }, { flush: 'sync' });
watch(() => store.sessionKey, () => { clearPrivateState(); void reload(); }, { flush: 'sync' });
watch(actionOpen, open => { if (!open) pendingFiles.value = []; });
watch(busy, value => { if (!value && changed.value) void reload(); });
onMounted(() => {
  const ticket = generation;
  void store.loadKinds().catch(e => { if (ticket === generation) error.value = (e as Error).message; });
});
onUnmounted(clearPrivateState);
</script>

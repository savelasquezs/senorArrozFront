<template>
  <BaseDialog :model-value="modelValue" :title="detail ? 'Modificar solicitud' : 'Solicitar permiso'" :icon="CalendarDaysIcon"
    size="4xl" scroll-body mobile-full-screen panel-class="leave-form-shell" :show-close-button="!confirming && !sending"
    :close-on-backdrop="!confirming && !sending" @update:model-value="close">
    <form :id="formId" class="leave-form-columns" novalidate @submit.prevent="prepare">
      <div>
        <div class="flex items-center gap-3 mb-6">
          <span class="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold" aria-hidden="true">{{ auth.userName?.slice(0, 1) }}</span>
          <div><p class="text-sm font-semibold text-gray-800">{{ auth.userName }}</p><p class="leave-help">{{ auth.branchName }} · Solicitud personal</p></div>
        </div>
        <section class="leave-section">
          <h4 class="leave-section-title"><span class="leave-step">1</span> Tipo de permiso</h4>
          <div class="leave-choice-grid" role="radiogroup" aria-label="Remuneración del permiso">
            <label class="leave-choice"><input v-model="group" type="radio" :name="`${formId}-group`" value="paid" :disabled="confirming || sending" />
              <span><strong>Remunerado</strong><small>Según ley o política interna</small></span></label>
            <label class="leave-choice"><input v-model="group" type="radio" :name="`${formId}-group`" value="unpaid" :disabled="confirming || sending" />
              <span><strong>No remunerado</strong><small>Permiso personal sin pago</small></span></label>
          </div>
          <p v-if="fieldErrors.group" class="leave-error" role="alert">{{ fieldErrors.group }}</p>
          <BaseSelect v-if="group" v-model="form.kind" :options="kindOptions" value-key="code" display-key="label" label="Motivo del permiso"
            placeholder="Selecciona el motivo" required teleport-dropdown :disabled="loading || confirming || sending" :error="fieldErrors.kind" />
          <p v-else class="leave-help">Elige una categoría para ver sus opciones.</p>
          <div v-if="kind?.description" class="leave-alert">{{ kind.description }}</div>
        </section>
        <section v-if="kind" class="leave-section">
          <h4 class="leave-section-title"><span class="leave-step">2</span> {{ kind.isPeriodRecord ? 'Período de las pausas' : '¿Cuándo lo necesitas?' }}</h4>
          <BaseRadioGroup v-if="!kind.isPeriodRecord" v-model="mode" :name="`${formId}-duration`" :options="durationOptions"
            :disabled="confirming || sending" size="sm" full-width label="Duración" />
          <div v-if="allDay" class="grid grid-cols-2 gap-4">
            <div><label class="leave-label">Desde <span class="text-red-500">*</span></label><BaseDatePicker v-model="startDay" :disabled="confirming || sending" /></div>
            <div><label class="leave-label">Hasta <span class="text-red-500">*</span></label><BaseDatePicker v-model="endDay" :disabled="confirming || sending" /></div>
          </div>
          <div v-else class="grid gap-3">
            <BaseDateTimePicker v-model="form.startsAt" label="Inicio" required :disabled="confirming || sending" />
            <BaseDateTimePicker v-model="form.endsAt" label="Fin previsto" required :disabled="confirming || sending" />
          </div>
          <p v-if="fieldErrors.interval" class="leave-error" role="alert">{{ fieldErrors.interval }}</p>
          <div class="flex items-center gap-2 text-xs text-emerald-800"><ClockIcon class="w-4 h-4 shrink-0" aria-hidden="true" /><strong>{{ duration }}</strong><span class="text-gray-400">· Hora de Colombia</span></div>
          <p v-if="allDay && !kind.isPeriodRecord" class="leave-help">Incluye ambas fechas. Se registran días completos, no horas laborales ni descuentos.</p>
        </section>
        <section v-if="kind" class="leave-section">
          <h4 class="leave-section-title"><span class="leave-step">3</span> Motivo y documentos</h4>
          <div><label :for="`${formId}-reason`" class="leave-label">Justificación <span class="text-red-500">*</span></label>
            <textarea :id="`${formId}-reason`" v-model="form.justification" class="leave-input resize-y" rows="3" maxlength="2000"
              placeholder="Explica brevemente por qué necesitas ausentarte…" :aria-invalid="!!fieldErrors.justification" :disabled="confirming || sending" />
            <div class="flex justify-between gap-3 mt-1"><p v-if="fieldErrors.justification" class="leave-error" role="alert">{{ fieldErrors.justification }}</p><span class="leave-help ml-auto">{{ form.justification.length }}/2000</span></div>
          </div>
          <LeaveAttachmentsPicker v-model="files" :requirements="kind.evidence ?? []" :existing="existingEvidence" :disabled="confirming || sending" />
          <p v-if="fieldErrors.files" class="leave-error" role="alert">{{ fieldErrors.files }}</p>
        </section>
        <p v-if="detail" class="leave-alert leave-alert--warning mt-4">Al modificarla, vuelve a revisión. La decisión y los documentos anteriores permanecen en el historial.</p>
        <p v-if="error" class="leave-alert leave-alert--error mt-4" role="alert">{{ error }}</p>
      </div>
      <aside class="leave-summary" aria-label="Resumen de la solicitud">
        <p class="leave-eyebrow mb-5">Tu solicitud</p>
        <dl><div><dt>Categoría</dt><dd>{{ group ? group === 'paid' ? 'Remunerado' : 'No remunerado' : 'Sin seleccionar' }}</dd></div>
          <div><dt>Motivo</dt><dd>{{ kind?.label || 'Selecciona una opción' }}</dd></div>
          <div><dt>Tiempo solicitado</dt><dd>{{ duration }}</dd></div>
          <div><dt>Documentos por enviar</dt><dd>{{ files.length }} {{ files.length === 1 ? 'archivo' : 'archivos' }}</dd></div>
        </dl>
        <div class="border-t border-gray-200 mt-5 pt-4"><ShieldCheckIcon class="w-5 h-5 text-emerald-600 mb-2" aria-hidden="true" /><p class="leave-help">Confirmarás con tu contraseña actual. Tu sesión permanece abierta.</p></div>
      </aside>
    </form>
    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-3 w-full">
        <p class="leave-help hidden sm:block">{{ sending ? uploadProgress < 100 ? `Enviando documentos… ${uploadProgress}%` : 'Guardando solicitud…' : 'Los soportes se envían junto con la solicitud.' }}</p>
        <div class="flex gap-2 ml-auto"><BaseButton variant="secondary" :disabled="confirming || sending" @click="close(false)">Cancelar</BaseButton>
          <BaseButton type="submit" :form="formId" :disabled="loading || confirming || sending" :loading="loading">Revisar y enviar</BaseButton></div>
      </div>
    </template>
  </BaseDialog>
  <PasswordConfirmation v-model="confirming" :description="confirmationDescription" :action="save" />
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { CalendarDaysIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue';
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue';
import BaseDateTimePicker from '@/components/ui/BaseDateTimePicker.vue';
import PasswordConfirmation from '@/components/auth/PasswordConfirmation.vue';
import LeaveAttachmentsPicker from './LeaveAttachmentsPicker.vue';
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { addLeaveDays, colombiaLocal, leaveDuration, leaveInterval, leavePeriod, missingPriorEvidence, type LeaveDetail, type LeaveInput, type LeavePendingFile } from '@/types/employeeLeave';
import '@/assets/employee-leaves.css';
const props = defineProps<{ modelValue: boolean; detail?: LeaveDetail }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [string] }>();
const auth = useAuthStore(), store = useEmployeeLeavesStore(), formId = useId();
const confirming = ref(false), sending = ref(false), loading = ref(false), error = ref(''), uploadProgress = ref(0);
const group = ref(''), mode = ref<string | number>('hours'), files = ref<LeavePendingFile[]>([]);
const form = reactive({ requestKey: '', kind: '', startsAt: '', endsAt: '', justification: '' });
const fieldErrors = reactive<Record<string, string>>({});
const durationOptions = [{ value: 'hours', label: 'Por horas' }, { value: 'days', label: 'Días completos' }];
const kind = computed(() => store.kinds.find(x => x.code === form.kind));
const kindOptions = computed(() => store.kinds.filter(x => x.paidByCompanyPolicy === (group.value === 'paid')).map(x => ({ code: x.code, label: x.label })));
const allDay = computed(() => mode.value === 'days' || !!kind.value?.isPeriodRecord);
const startDay = computed({ get: () => form.startsAt.slice(0, 10) || null, set: (v: string | null) => { form.startsAt = `${v ?? ''}T${form.startsAt.slice(11, 16) || '09:00'}`; } });
const endDay = computed({ get: () => form.endsAt.slice(0, 10) || null, set: (v: string | null) => { form.endsAt = `${v ?? ''}T${form.endsAt.slice(11, 16) || '10:00'}`; } });
const existingEvidence = computed(() => (props.detail?.attachments ?? []).map(x => props.detail?.request.kind === form.kind ? x : { ...x, evidenceCode: 'additional' }));
const duration = computed(() => { try { return leaveDuration({ ...leaveInterval(form.startsAt, form.endsAt, allDay.value), isPeriodRecord: kind.value?.isPeriodRecord }); } catch { return 'Selecciona el intervalo'; } });
let generation = 0, initializing = false, owner: number | undefined;
let submission: { id?: string; input: Omit<LeaveInput, 'password'>; files: LeavePendingFile[] } | undefined;
const confirmationDescription = computed(() => sending.value ? uploadProgress.value < 100 ? `Enviando documentos… ${uploadProgress.value}%` : 'Guardando solicitud y documentos…'
  : submission ? `${kind.value?.label}. ${leavePeriod(submission.input)} · ${duration.value}. Se enviarán ${submission.files.length} documentos.` : 'Enviar solicitud de permiso.');
function clearErrors() { Object.keys(fieldErrors).forEach(key => delete fieldErrors[key]); error.value = ''; }
watch(group, () => { if (!initializing) { form.kind = ''; files.value = []; clearErrors(); } });
watch(() => form.kind, () => { if (!initializing) { files.value = []; clearErrors(); } });
watch(() => props.modelValue, async open => {
  const ticket = ++generation; files.value = []; confirming.value = false; submission = undefined; clearErrors();
  if (!open) return;
  owner = auth.user?.id; initializing = true; loading.value = true;
  const d = props.detail;
  Object.assign(form, { requestKey: crypto.randomUUID(), kind: d?.request.kind ?? '', justification: d?.justification ?? '',
    startsAt: colombiaLocal(d?.request.startsAt ?? new Date().toISOString()), endsAt: colombiaLocal(d?.request.endsAt ?? new Date(Date.now() + 3600000).toISOString()) });
  mode.value = d?.request.isAllDay ? 'days' : 'hours';
  if (d?.request.isAllDay) form.endsAt = `${addLeaveDays(form.endsAt.slice(0, 10), -1)}T00:00`;
  group.value = '';
  try { await store.loadKinds(); if (ticket === generation && d) group.value = kind.value?.paidByCompanyPolicy ? 'paid' : 'unpaid'; }
  catch (e) { if (ticket === generation) error.value = (e as Error).message; }
  finally { await nextTick(); if (ticket === generation) { initializing = false; loading.value = false; } }
});
function prepare() {
  if (confirming.value || sending.value || loading.value) return;
  clearErrors();
  if (!group.value) fieldErrors.group = 'Selecciona remunerado o no remunerado.';
  if (!kind.value || kind.value.paidByCompanyPolicy !== (group.value === 'paid')) fieldErrors.kind = 'Selecciona el motivo del permiso.';
  if (!form.justification.trim()) fieldErrors.justification = 'Explica brevemente el motivo de la solicitud.';
  const missing = missingPriorEvidence(kind.value?.evidence ?? [], files.value, existingEvidence.value);
  if (missing.length) fieldErrors.files = `Adjunta antes de enviar: ${missing.map(x => x.label).join(', ')}.`;
  try {
    const interval = leaveInterval(form.startsAt, form.endsAt, allDay.value);
    if (Object.keys(fieldErrors).length) return;
    submission = { id: props.detail?.request.publicId, files: [...files.value], input: {
      ...interval, requestKey: form.requestKey, version: props.detail?.request.version ?? 0, kind: form.kind,
      requestedIsPaid: group.value === 'paid', documentNumber: props.detail?.documentNumber ?? null,
      justification: form.justification.trim(), supportRequired: false,
    } };
    confirming.value = true;
  } catch (e) { fieldErrors.interval = (e as Error).message; }
}
async function save(password: string) {
  if (!submission || owner !== auth.user?.id || !props.modelValue) throw new Error('La sesión cambió. Abre nuevamente la solicitud.');
  const ticket = generation, snapshot = submission; sending.value = true; uploadProgress.value = 0;
  try {
    const result = await employeeLeaveApi.save(snapshot.id, { ...snapshot.input, password }, snapshot.files, value => { if (ticket === generation) uploadProgress.value = value; });
    if (ticket !== generation || owner !== auth.user?.id) return;
    store.invalidate(); files.value = []; emit('update:modelValue', false); emit('saved', result.publicId);
  } finally { sending.value = false; }
}
function close(value: boolean) { if (!sending.value && !confirming.value) emit('update:modelValue', value); }
watch(() => auth.user?.id, () => { generation++; files.value = []; submission = undefined; confirming.value = false; emit('update:modelValue', false); });
onBeforeUnmount(() => { generation++; files.value = []; submission = undefined; });
</script>

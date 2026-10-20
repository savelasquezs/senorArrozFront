<template>
  <BaseDialog :model-value="modelValue" :title="detail ? 'Modificar solicitud' : 'Solicitar permiso'" size="xl"
    :show-close-button="!confirming" :close-on-backdrop="!confirming" @update:model-value="emit('update:modelValue', $event)">
    <form class="space-y-4" @submit.prevent="prepare">
      <p class="text-sm text-gray-600">{{ auth.userName }} · {{ auth.branchName }}</p>
      <label class="block text-sm">Tipo de permiso <span class="text-red-600">*</span>
        <select v-model="form.kind" required class="mt-1 w-full rounded-md border p-2">
          <option value="" disabled>Selecciona un motivo</option>
          <option v-for="kind in store.kinds" :key="kind.code" :value="kind.code">{{ kind.label }}</option>
        </select>
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">Inicio <span class="text-red-600">*</span><input v-model="form.startsAt" type="datetime-local" required class="mt-1 w-full rounded-md border p-2" /></label>
        <label class="block text-sm">Fin previsto <span class="text-red-600">*</span><input v-model="form.endsAt" type="datetime-local" required class="mt-1 w-full rounded-md border p-2" /></label>
      </div>
      <p class="text-xs text-gray-500">Hora de Colombia. {{ duration }} No calcula días laborales ni descuentos.</p>
      <label class="block text-sm">Documento de identidad<input v-model="form.documentNumber" maxlength="32" class="mt-1 w-full rounded-md border p-2" autocomplete="off" /></label>
      <label class="block text-sm">Justificación <span class="text-red-600">*</span><textarea v-model="form.justification" required maxlength="2000" rows="3" class="mt-1 w-full rounded-md border p-2" /></label>
      <label class="flex items-center gap-2 text-sm"><input v-model="form.supportRequired" type="checkbox" /> Presentaré un documento de soporte</label>
      <p class="text-xs text-gray-500">Podrás adjuntar el soporte desde el detalle. No es necesario aportar una historia clínica completa.</p>
      <p v-if="detail" class="rounded-md bg-amber-50 p-3 text-sm">La modificación vuelve a enviar la solicitud como pendiente; conserva el historial anterior.</p>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <div class="flex justify-end gap-2"><BaseButton variant="secondary" :disabled="confirming" @click="emit('update:modelValue', false)">Cancelar</BaseButton><BaseButton type="submit" :disabled="!store.kinds.length || confirming">Continuar</BaseButton></div>
    </form>
  </BaseDialog>
  <PasswordConfirmation v-model="confirming" :description="`Enviar la solicitud desde ${form.startsAt.replace('T', ' ')} hasta ${form.endsAt.replace('T', ' ')} (Colombia).`" :action="save" />
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import PasswordConfirmation from '@/components/auth/PasswordConfirmation.vue';
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import { colombiaLocal, colombiaUtc, type LeaveDetail } from '@/types/employeeLeave';
const props = defineProps<{ modelValue: boolean; detail?: LeaveDetail }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [string] }>();
const auth = useAuthStore(), store = useEmployeeLeavesStore();
const confirming = ref(false), error = ref('');
const form = reactive({ requestKey: '', version: 0, kind: '', documentNumber: '', startsAt: '', endsAt: '', justification: '', supportRequired: false });
const duration = computed(() => {
  try { const hours = (Date.parse(colombiaUtc(form.endsAt)) - Date.parse(colombiaUtc(form.startsAt))) / 3600000; return hours > 0 ? `${hours.toLocaleString('es-CO', { maximumFractionDigits: 1 })} horas entre las fechas.` : ''; }
  catch { return ''; }
});
watch(() => props.modelValue, async open => {
  if (!open) { confirming.value = false; return; }
  error.value = '';
  const d = props.detail;
  Object.assign(form, { requestKey: crypto.randomUUID(), version: d?.request.version ?? 0, kind: d?.request.kind ?? '',
    documentNumber: d?.documentNumber ?? '', startsAt: colombiaLocal(d?.request.startsAt ?? new Date().toISOString()),
    endsAt: colombiaLocal(d?.request.endsAt ?? new Date(Date.now() + 3600000).toISOString()),
    justification: d?.justification ?? '', supportRequired: d?.supportRequired ?? false });
  try { await store.loadKinds(); } catch (e) { error.value = (e as Error).message; }
});
function prepare() {
  error.value = '';
  try {
    if (Date.parse(colombiaUtc(form.endsAt)) <= Date.parse(colombiaUtc(form.startsAt))) throw new Error('El fin debe ser posterior al inicio.');
    if (!form.justification.trim()) throw new Error('Escribe la justificación.');
    confirming.value = true;
  } catch (e) { error.value = (e as Error).message; }
}
async function save(password: string) {
  const result = await employeeLeaveApi.save(props.detail?.request.publicId, { ...form, password,
    startsAt: colombiaUtc(form.startsAt), endsAt: colombiaUtc(form.endsAt), documentNumber: form.documentNumber.trim() || null,
    justification: form.justification.trim() });
  store.invalidate(); emit('update:modelValue', false); emit('saved', result.publicId);
}
</script>

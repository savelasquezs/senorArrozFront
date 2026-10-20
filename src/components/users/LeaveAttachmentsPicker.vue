<template>
  <div class="space-y-3">
    <div v-if="showRequirements && requirements.length" class="space-y-2">
      <div v-for="rule in requirements" :key="rule.code" class="flex items-start gap-2 text-xs">
        <CheckCircleIcon v-if="covered(rule.code)" class="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
        <DocumentTextIcon v-else class="w-4 h-4 shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
        <div class="min-w-0"><span class="font-medium text-gray-700">{{ rule.label }}</span>
          <span class="ml-1" :class="rule.required && rule.stage === 'before' ? 'text-amber-700' : 'text-gray-400'">
            · {{ rule.required ? rule.stage === 'before' ? 'Antes de enviar' : 'Después del evento' : 'Opcional' }}</span>
          <p v-if="rule.required && rule.stage === 'after'" class="leave-help">No necesitas este documento para avisar ahora.</p>
        </div>
      </div>
    </div>
    <label v-if="modelValue.length + activeExisting < maxFiles" class="leave-dropzone" :class="{ 'opacity-50': disabled }"
      @dragover.prevent @drop.prevent="drop">
      <ArrowUpTrayIcon class="w-6 h-6 text-emerald-600" aria-hidden="true" />
      <span class="text-sm font-medium text-gray-700">Selecciona o arrastra tus documentos</span>
      <span class="leave-help">PDF, JPG o PNG · 5 MB por archivo · máximo {{ maxFiles }}</span>
      <input type="file" :multiple="maxFiles > 1" :disabled="disabled" accept="application/pdf,image/jpeg,image/png"
        aria-label="Adjuntar documentos de soporte" @change="choose" />
    </label>
    <div v-for="item in modelValue" :key="item.uploadKey" class="leave-file">
      <div class="leave-file-top">
        <DocumentTextIcon class="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <span class="leave-file-name" :title="item.file.name">{{ item.file.name }}</span>
        <span class="leave-help whitespace-nowrap">{{ Math.max(1, Math.round(item.file.size / 1024)) }} KB</span>
        <button type="button" class="p-1 text-gray-400 hover:text-red-600" :disabled="disabled"
          :aria-label="`Retirar ${item.file.name}`" @click="remove(item.uploadKey)"><XMarkIcon class="h-4 w-4" /></button>
      </div>
      <BaseSelect v-if="!fixedEvidenceCode" class="mt-3" size="sm" label="Este documento acredita" :model-value="item.evidenceCode"
        :options="options" value-key="code" display-key="label" :disabled="disabled" :searchable="false" teleport-dropdown
        @update:model-value="setCode(item.uploadKey, String($event))" />
    </div>
    <p v-if="error" class="leave-error" role="alert">{{ error }}</p>
    <p class="leave-help flex gap-1.5 items-start"><LockClosedIcon class="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      Acceso privado. Adjunta constancias; no necesitas compartir una historia clínica ni un diagnóstico.</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { validateLeaveFile, type LeavePendingFile, type LeaveEvidenceRule, type LeaveAttachment } from '@/types/employeeLeave';
import '@/assets/employee-leaves.css';
const props = withDefaults(defineProps<{ modelValue: LeavePendingFile[]; requirements?: LeaveEvidenceRule[]; existing?: LeaveAttachment[];
  disabled?: boolean; maxFiles?: number; fixedEvidenceCode?: string; showRequirements?: boolean }>(),
  { requirements: () => [], existing: () => [], maxFiles: 5, disabled: false, showRequirements: true });
const emit = defineEmits<{ 'update:modelValue': [LeavePendingFile[]] }>();
const error = ref('');
const activeExisting = computed(() => props.existing.filter(x => !x.supersededAt).length);
const options = computed(() => [...props.requirements.map(x => ({ code: x.code, label: x.label })), { code: 'additional', label: 'Información adicional' }]);
function covered(code: string) { return props.modelValue.some(x => x.evidenceCode === code)
  || props.existing.some(x => x.evidenceCode === code && !x.supersededAt && x.reviewStatus !== 'rejected'); }
function append(files: File[]) {
  if (props.disabled) return;
  error.value = '';
  try {
    if (activeExisting.value + props.modelValue.length + files.length > props.maxFiles) throw new Error(`Se permiten hasta ${props.maxFiles} documentos vigentes.`);
    files.forEach(validateLeaveFile);
    const result = [...props.modelValue];
    for (const file of files) {
      if (result.some(x => x.file.name === file.name && x.file.size === file.size && x.file.lastModified === file.lastModified))
        throw new Error('Este archivo ya está seleccionado.');
      const rule = props.requirements.find(x => x.required && x.stage === 'before' && !covered(x.code) && !result.some(y => y.evidenceCode === x.code));
      result.push({ file, uploadKey: crypto.randomUUID(), evidenceCode: props.fixedEvidenceCode || rule?.code || props.requirements[0]?.code || 'additional' });
    }
    emit('update:modelValue', result);
  } catch (e) { error.value = (e as Error).message; }
}
function choose(event: Event) { const input = event.target as HTMLInputElement; append(Array.from(input.files ?? [])); input.value = ''; }
function drop(event: DragEvent) { append(Array.from(event.dataTransfer?.files ?? [])); }
function remove(key: string) { emit('update:modelValue', props.modelValue.filter(x => x.uploadKey !== key)); error.value = ''; }
function setCode(key: string, code: string) { emit('update:modelValue', props.modelValue.map(x => x.uploadKey === key ? { ...x, evidenceCode: code } : x)); }
watch(() => props.requirements, () => { error.value = ''; });
</script>

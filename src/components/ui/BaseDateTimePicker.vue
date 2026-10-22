<template>
  <div class="leave-datetime">
    <label :id="labelId" class="leave-label">{{ label }} <span v-if="required" class="text-red-500">*</span></label>
    <div class="leave-datetime-fields" :aria-labelledby="labelId">
      <BaseDatePicker :model-value="day || null" :disabled="disabled" :teleport="true" @update:model-value="setDay" />
      <VueDatePicker :model-value="time" time-picker :is-24="true" :enable-seconds="false" :locale="es" :teleport="true"
        :disabled="disabled" :clearable="false" :auto-apply="true" placeholder="Hora" :aria-labels="{ input: `${label}: hora` }"
        class="leave-time-picker" @update:model-value="setTime" />
    </div>
    <p v-if="error" class="leave-error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import { es } from 'date-fns/locale';
import BaseDatePicker from './BaseDatePicker.vue';
import '@vuepic/vue-datepicker/dist/main.css';
import '@/assets/employee-leaves.css';
const props = defineProps<{ modelValue: string; label: string; required?: boolean; disabled?: boolean; error?: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
const labelId = useId();
const day = computed(() => props.modelValue.slice(0, 10));
const time = computed(() => ({ hours: Number(props.modelValue.slice(11, 13)) || 0, minutes: Number(props.modelValue.slice(14, 16)) || 0, seconds: 0 }));
function setDay(value: string | null) { emit('update:modelValue', `${value ?? ''}T${props.modelValue.slice(11, 16) || '09:00'}`); }
function setTime(value: { hours: number; minutes: number; seconds?: number } | null) {
  if (value) emit('update:modelValue', `${day.value}T${String(value.hours).padStart(2, '0')}:${String(value.minutes).padStart(2, '0')}`);
}
</script>

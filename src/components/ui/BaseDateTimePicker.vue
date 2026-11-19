<template>
  <div class="leave-datetime">
    <label :id="labelId" class="leave-label">{{ label }} <span v-if="required" class="text-red-500">*</span></label>
    <div class="leave-datetime-fields" :aria-labelledby="labelId">
      <BaseDatePicker :model-value="day || null" :disabled="disabled" :teleport="true" @update:model-value="setDay" />
      <BaseTimePicker :model-value="time" teleport :disabled="disabled" :required="required" placeholder="Hora" :label="`${label}: hora`"
        class="leave-time-picker" @update:model-value="setTime" />
    </div>
    <p v-if="error" class="leave-error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import BaseDatePicker from './BaseDatePicker.vue';
import BaseTimePicker from './BaseTimePicker.vue';
import '@/assets/employee-leaves.css';
const props = defineProps<{ modelValue: string; label: string; required?: boolean; disabled?: boolean; error?: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
const labelId = useId();
const day = computed(() => props.modelValue.slice(0, 10));
const time = computed(() => props.modelValue.slice(11, 16));
function setDay(value: string | null) { emit('update:modelValue', `${value ?? ''}T${props.modelValue.slice(11, 16) || '09:00'}`); }
function setTime(value: string) {
  emit('update:modelValue', value ? `${day.value}T${value}` : '');
}
</script>

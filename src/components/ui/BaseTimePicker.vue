<template>
  <VueDatePicker
    class="base-time-picker min-w-0"
    :class="{ 'base-time-picker--compact': compact }"
    :model-value="pickerValue"
    :time-picker="!withDate"
    :time-config="{ is24: false, enableSeconds: false }"
    :formats="{ input: inputFormat }"
    :text-input="{ format: inputFormat }"
    :dark="theme === 'dark'"
    :locale="es"
    :teleport="teleport"
    :floating="{ strategy: 'fixed' }"
    :input-attrs="{ id: inputId, required, clearable: !required, state: invalid ? false : undefined }"
    :aria-labels="{ input: label, amPmButton: 'Cambiar a. m. o p. m.' }"
    :disabled="disabled"
    :placeholder="placeholder || 'Seleccionar hora'"
    auto-apply
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker, type ModelValue } from '@vuepic/vue-datepicker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { injectWhatsAppTheme } from '@/composables/useWhatsAppTheme'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps<{
  modelValue: string; label?: string; inputId?: string; placeholder?: string
  disabled?: boolean; required?: boolean; invalid?: boolean; withDate?: boolean; compact?: boolean
  teleport?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const theme = injectWhatsAppTheme()
const inputFormat = computed(() => props.withDate ? 'dd/MM/yyyy h:mm a' : 'h:mm a')

const pickerValue = computed(() => {
  if (props.withDate) {
    if (!props.modelValue) return null
    const date = new Date(props.modelValue)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(props.modelValue)
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null
})

function onUpdate(value: ModelValue) {
  if (value instanceof Date) {
    emit('update:modelValue', format(value, props.withDate ? "yyyy-MM-dd'T'HH:mm" : 'HH:mm'))
  } else if (value && typeof value === 'object' && 'hours' in value && 'minutes' in value) {
    emit('update:modelValue', `${String(value.hours).padStart(2, '0')}:${String(value.minutes).padStart(2, '0')}`)
  } else if (!value) {
    emit('update:modelValue', '')
  }
}
</script>

<style scoped>
.base-time-picker :deep(.dp__input) { min-height: 38px; border-color: var(--wa-line, #d1d5db); border-radius: .5rem; font-size: .875rem; }
.base-time-picker--compact :deep(.dp__input) { min-height: 32px; padding-block: .25rem; font-size: .75rem; }
@media (pointer: coarse) {
  .base-time-picker--compact :deep(.dp__input) { min-height: 40px; font-size: 1rem; }
}
</style>

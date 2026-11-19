<template>
    <div class="space-y-2">
        <div class="grid grid-cols-2 gap-2">
            <BaseDatePicker class="schedule-date-picker col-span-2" label="Fecha" :model-value="day" :min-date="minimumDate"
                :disabled="disabled" :teleport="false" :floating="{ strategy: 'fixed' }" @update:model-value="changeDate" />
            <div class="min-w-0">
                <label class="mb-1 block text-xs font-medium text-gray-600">Hora de preparación</label>
                <BaseTimePicker :model-value="preparationTime" :disabled="disabled" placeholder="Hora preparación"
                    label="Hora de preparación" @update:model-value="changePreparation" />
            </div>
            <div class="min-w-0">
                <label class="mb-1 block text-xs font-medium text-gray-600">Hora de entrega</label>
                <BaseTimePicker :model-value="deliveryTime" :disabled="disabled" placeholder="Hora entrega"
                    label="Hora de entrega" @update:model-value="changeDelivery" />
            </div>
        </div>
        <p v-if="validationError" role="alert" class="text-xs text-red-700">{{ validationError }}</p>
        <p v-else class="text-xs text-gray-500">Entrega sugerida una hora después; puedes ajustarla.</p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseTimePicker from '@/components/ui/BaseTimePicker.vue'
import { defaultBusinessCalendar as calendar } from '@/utils/datetime'
import { orderScheduleDate, orderScheduleError, suggestedOrderDelivery } from '@/helpers/orderSchedule'

const props = defineProps<{ prepareAt: Date | null; reservedFor: Date | null; disabled?: boolean }>()
const emit = defineEmits<{
    change: [schedule: { prepareAt: Date | null; reservedFor: Date | null }]
    validation: [message: string]
}>()
const day = ref(calendar.formatYmd(props.prepareAt ?? props.reservedFor ?? new Date()))
const minimumDate = computed(() => {
    const [year, month, date] = calendar.todayYmd().split('-').map(Number)
    return new Date(year!, month! - 1, date!)
})
const preparationTime = computed(() => props.prepareAt ? calendar.formatTime(props.prepareAt) : '')
const deliveryTime = computed(() => props.reservedFor ? calendar.formatTime(props.reservedFor) : '')
const validationError = computed(() => orderScheduleError(props.prepareAt, props.reservedFor))
watch(validationError, message => emit('validation', message), { immediate: true })
watch(() => [props.prepareAt, props.reservedFor], () => {
    const value = props.prepareAt ?? props.reservedFor
    if (value) day.value = calendar.formatYmd(value)
})

function changeDate(value: string | null) {
    day.value = value ?? ''
    emit('change', { prepareAt: orderScheduleDate(day.value, preparationTime.value), reservedFor: orderScheduleDate(day.value, deliveryTime.value) })
}

function changePreparation(value: string) {
    const prepareAt = orderScheduleDate(day.value, value)
    emit('change', { prepareAt, reservedFor: prepareAt ? suggestedOrderDelivery(prepareAt) : null })
}

function changeDelivery(value: string) {
    const reservedFor = orderScheduleDate(day.value, value)
    const fallback = reservedFor ? new Date(reservedFor.getTime() - 60 * 60 * 1000) : null
    const prepareAt = orderScheduleDate(day.value, preparationTime.value)
        ?? (fallback && calendar.formatYmd(fallback) === day.value ? fallback : null)
    emit('change', { prepareAt, reservedFor })
}
</script>

<style scoped>
:deep(.schedule-date-picker) { max-width: none; }
@media (pointer: coarse) { :deep(.dp__input) { min-height: 44px; font-size: 16px; } }
</style>

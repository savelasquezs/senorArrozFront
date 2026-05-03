<template>
    <div class="relative z-50 rounded-lg border border-gray-200 bg-white shadow-sm mb-2 overflow-visible">
        <!-- Una sola barra densa: controles principales -->
        <div class="flex flex-wrap items-center gap-2 p-2">
            <div class="w-[7.25rem] shrink-0 expenses-compact-select">
                <BaseSelect :model-value="presetId" :options="presetOptions" value-key="value" display-key="label"
                    teleport-dropdown placeholder="Periodo" @update:model-value="onPresetChange" />
            </div>

            <div v-if="presetId === 'custom'" class="min-w-[200px] max-w-[260px] flex-1 expenses-compact-dp">
                <VueDatePicker :model-value="customRangeModel" range :enable-time-picker="false" format="dd/MM/yyyy"
                    auto-apply :clearable="false" :teleport="true" :locale="esLocale"
                    class="w-full expenses-date-range" @update:model-value="onCustomRangeUpdate" />
            </div>

            <div class="flex-1 min-w-[160px] max-w-xl expenses-compact-input">
                <BaseInput :model-value="localFilters.expenseName" placeholder="Buscar gasto…"
                    @update:model-value="updateLocal('expenseName', $event)">
                    <template #icon>
                        <MagnifyingGlassIcon class="w-3.5 h-3.5" />
                    </template>
                </BaseInput>
            </div>

            <div class="w-[7rem] sm:w-[7.5rem] shrink-0 expenses-compact-select">
                <BaseSelect :model-value="localFilters.categoryNames" :options="categoryOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Categorías" multiple
                    @update:model-value="updateLocal('categoryNames', $event)" />
            </div>
            <div class="w-[7rem] sm:w-[7.5rem] shrink-0 expenses-compact-select">
                <BaseSelect :model-value="localFilters.bankNames" :options="bankOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Pago" multiple
                    @update:model-value="updateLocal('bankNames', $event)" />
            </div>
            <div class="w-[7rem] sm:w-[7.5rem] shrink-0 expenses-compact-select">
                <BaseSelect :model-value="localFilters.supplierIds" :options="supplierOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Prov." multiple
                    @update:model-value="updateLocal('supplierIds', $event)" />
            </div>

            <div class="flex items-center gap-1.5 shrink-0 border-l border-gray-200 pl-2 ml-auto sm:ml-0">
                <span class="text-[10px] uppercase tracking-wide text-gray-400 hidden lg:inline">Orden</span>
                <div class="w-[6.5rem] expenses-compact-select">
                    <BaseSelect :model-value="sortBy" :options="sortFieldOptions" value-key="value" display-key="label"
                        teleport-dropdown @update:model-value="$emit('update:sortBy', $event)" />
                </div>
                <BaseButton variant="secondary" size="sm" class="!px-2 !py-1 text-xs min-w-0"
                    :title="sortOrder === 'asc' ? 'Ascendente' : 'Descendente'" @click="$emit('toggle-sort-order')">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </BaseButton>
                <BaseButton v-if="hasActiveFilters" variant="ghost" size="sm" class="!px-2 !py-1 text-xs"
                    title="Limpiar filtros de lista" @click="$emit('clear-filters')">
                    <XMarkIcon class="w-3.5 h-3.5" />
                </BaseButton>
                <BaseButton variant="secondary" size="sm" class="!px-2 !py-1" :loading="loading" title="Actualizar"
                    @click="$emit('refresh')">
                    <ArrowPathIcon class="w-3.5 h-3.5" />
                </BaseButton>
            </div>
        </div>

        <!-- Estado del listado servidor: una línea mínima -->
        <div class="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50/90 border-t border-gray-100">
            <div class="text-xs text-gray-500 truncate min-w-0">
                <slot name="result-hint" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'
import { MagnifyingGlassIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { DASHBOARD_PERIOD_PRESET_OPTIONS } from '@/utils/dashboardPeriodPresets'
import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'
import type { ExpenseFilterState } from '@/composables/useExpenseFilters'
import { toNumberFilterList, toStringFilterList } from '@/utils/filterNormalization'
import { zonedDayFromPickerLocalDate } from '@/utils/datetime'

const esLocale = es

const presetOptions = DASHBOARD_PERIOD_PRESET_OPTIONS.map(o => ({
    value: o.id as DashboardPeriodPresetId,
    label: o.label,
}))

const sortFieldOptions = [
    { value: 'id' as const, label: 'Factura' },
    { value: 'createdAt' as const, label: 'Fecha' },
    { value: 'total' as const, label: 'Total' },
]

interface Props {
    presetId: DashboardPeriodPresetId
    customRange: [Date, Date] | null
    localFilters: ExpenseFilterState
    categoryOptions: { value: string; label: string }[]
    bankOptions: { value: string; label: string }[]
    supplierOptions: { value: number; label: string }[]
    sortBy: 'id' | 'total' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    loading?: boolean
    hasActiveFilters?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    hasActiveFilters: false,
})

const emit = defineEmits<{
    'update:presetId': [v: DashboardPeriodPresetId]
    'update:customRange': [v: [Date, Date] | null]
    'update:localFilters': [v: ExpenseFilterState]
    'clear-filters': []
    refresh: []
    'update:sortBy': [v: 'id' | 'total' | 'createdAt']
    'toggle-sort-order': []
}>()

const customRangeModel = computed(() => props.customRange)

function onPresetChange(v: unknown) {
    const id = v as DashboardPeriodPresetId
    emit('update:presetId', id)
    if (id !== 'custom') {
        emit('update:customRange', null)
    }
}

function onCustomRangeUpdate(v: Date[] | Date | null) {
    if (!v || !Array.isArray(v) || v.length !== 2 || !v[0] || !v[1]) return
    const a = zonedDayFromPickerLocalDate(new Date(v[0]))
    const b = zonedDayFromPickerLocalDate(new Date(v[1]))
    const range: [Date, Date] = a <= b ? [a, b] : [b, a]
    emit('update:customRange', range)
}

function updateLocal<K extends keyof ExpenseFilterState>(key: K, value: ExpenseFilterState[K] | string | number | null) {
    let normalized: ExpenseFilterState[K]

    if (key === 'expenseName') {
        normalized = (value === null || value === undefined ? '' : String(value)) as ExpenseFilterState[K]
    } else if (key === 'supplierIds') {
        normalized = toNumberFilterList(value) as ExpenseFilterState[K]
    } else {
        normalized = toStringFilterList(value) as ExpenseFilterState[K]
    }

    emit('update:localFilters', { ...props.localFilters, [key]: normalized as ExpenseFilterState[K] })
}
</script>

<style scoped>
:deep(.expenses-date-range .dp__input) {
    min-height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid rgb(229 231 235);
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}

/* Controles más bajos solo en esta barra */
.expenses-compact-input :deep(input) {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
    border-radius: 0.375rem;
}

.expenses-compact-input :deep(.pl-10) {
    padding-left: 2rem;
}

.expenses-compact-select :deep(button) {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    padding-left: 0.5rem;
    padding-right: 1.75rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
    border-radius: 0.375rem;
}
</style>

<template>
    <div class="relative z-50 mb-2 overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center gap-2 p-2">
            <div class="w-[8.5rem] shrink-0 expenses-compact-select">
                <BaseSelect :model-value="presetId" :options="presetOptions" value-key="value" display-key="label"
                    teleport-dropdown placeholder="Periodo" @update:model-value="onPresetChange" />
            </div>

            <BaseDateRangePicker :model-value="visibleRange" variant="compact" @update:model-value="onRangeChange" />

            <div class="min-w-[220px] flex-1 expenses-compact-input">
                <BaseInput :model-value="localFilters.expenseName" placeholder="Buscar gasto…"
                    @update:model-value="updateLocal('expenseName', $event)">
                    <template #icon>
                        <MagnifyingGlassIcon class="h-3.5 w-3.5" />
                    </template>
                </BaseInput>
            </div>

            <BaseButton variant="outline" size="sm" class="shrink-0 !px-3 !py-2 text-xs"
                :class="showAdvanced ? '!border-emerald-500 !text-emerald-700' : ''" @click="toggleAdvanced">
                {{ showAdvanced ? 'Ocultar filtros' : 'Ver filtros avanzados' }}
            </BaseButton>

            <div class="ml-auto flex shrink-0 items-center gap-1.5 border-l border-gray-200 pl-2 sm:ml-0">
                <BaseButton v-if="hasActiveFilters" variant="ghost" size="sm" class="!px-2 !py-1 text-xs"
                    title="Limpiar filtros de lista" @click="$emit('clear-filters')">
                    <XMarkIcon class="h-3.5 w-3.5" />
                </BaseButton>
                <BaseButton variant="secondary" size="sm" class="!px-2 !py-1" :loading="loading" title="Actualizar"
                    @click="$emit('refresh')">
                    <ArrowPathIcon class="h-3.5 w-3.5" />
                </BaseButton>
            </div>
        </div>

        <div v-if="showAdvanced"
            class="grid grid-cols-1 gap-2 border-t border-gray-100 bg-gray-50/90 px-2 py-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div class="expenses-compact-select">
                <BaseSelect :model-value="localFilters.categoryNames" :options="categoryOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Categorías" multiple
                    @update:model-value="updateLocal('categoryNames', $event)" />
            </div>
            <div class="expenses-compact-select">
                <BaseSelect :model-value="localFilters.bankNames" :options="bankOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Pago" multiple
                    @update:model-value="updateLocal('bankNames', $event)" />
            </div>
            <div class="expenses-compact-select">
                <BaseSelect :model-value="localFilters.supplierIds" :options="supplierOptions" value-key="value"
                    display-key="label" teleport-dropdown placeholder="Proveedor" multiple
                    @update:model-value="updateLocal('supplierIds', $event)" />
            </div>
            <div class="flex items-center gap-1.5 xl:justify-end">
                <span class="hidden text-[10px] uppercase tracking-wide text-gray-400 lg:inline">Orden</span>
                <div class="w-[6.5rem] expenses-compact-select">
                    <BaseSelect :model-value="sortBy" :options="sortFieldOptions" value-key="value" display-key="label"
                        teleport-dropdown @update:model-value="$emit('update:sortBy', $event)" />
                </div>
                <BaseButton variant="secondary" size="sm" class="min-w-0 !px-2 !py-1 text-xs"
                    :title="sortOrder === 'asc' ? 'Ascendente' : 'Descendente'" @click="$emit('toggle-sort-order')">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </BaseButton>
            </div>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/90 px-2 py-1">
            <div class="min-w-0 truncate text-xs text-gray-500">
                <slot name="result-hint" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MagnifyingGlassIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDateRangePicker from '@/components/ui/BaseDateRangePicker.vue'
import {
    DASHBOARD_PERIOD_PRESET_OPTIONS,
    getDateRangeForPreset,
} from '@/utils/dashboardPeriodPresets'
import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'
import type { ExpenseFilterState } from '@/composables/useExpenseFilters'
import { toNumberFilterList, toStringFilterList } from '@/utils/filterNormalization'

const presetOptions = [
    ...DASHBOARD_PERIOD_PRESET_OPTIONS.map(o => ({
        value: o.id as DashboardPeriodPresetId,
        label: o.label,
    })),
    { value: 'custom' as DashboardPeriodPresetId, label: 'Rango personalizado' },
]

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

const showAdvanced = ref(false)

const hasAdvancedFiltersActive = computed(
    () =>
        props.localFilters.categoryNames.length > 0 ||
        props.localFilters.bankNames.length > 0 ||
        props.localFilters.supplierIds.length > 0,
)

const visibleRange = computed<[Date, Date]>(() => {
    if (props.presetId === 'custom' && props.customRange) {
        return props.customRange
    }
    const [from, to] = getDateRangeForPreset(props.presetId, new Date())
    return [from, to]
})

watch(
    hasAdvancedFiltersActive,
    active => {
        if (active) {
            showAdvanced.value = true
        }
    },
    { immediate: true },
)

function toggleAdvanced() {
    showAdvanced.value = !showAdvanced.value
}

function onPresetChange(v: unknown) {
    const id = v as DashboardPeriodPresetId
    emit('update:presetId', id)
    if (id === 'custom' && !props.customRange) {
        emit('update:customRange', visibleRange.value)
        return
    }
    if (id !== 'custom') {
        emit('update:customRange', null)
    }
}

function onRangeChange(v: [Date, Date]) {
    emit('update:presetId', 'custom')
    emit('update:customRange', v)
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
.expenses-compact-input :deep(input) {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
}

.expenses-compact-input :deep(.pl-10) {
    padding-left: 2rem;
}

.expenses-compact-select :deep(button) {
    padding-top: 0.375rem;
    padding-right: 1.75rem;
    padding-bottom: 0.375rem;
    padding-left: 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
}
</style>

<template>
	<div class="space-y-3">
		<!-- Catálogo nómina: compacto -->
		<div v-if="canEditPayroll || insights?.linkedExpense" class="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2">
			<p class="text-[11px] text-gray-600 leading-snug mb-2">
				Ítem de catálogo propio por usuario; solo cuentan líneas con ese gasto en esta sucursal.
			</p>
			<div class="flex flex-wrap items-center gap-2 min-h-[2rem]">
				<template v-if="!insights?.linkedExpense && canEditPayroll">
					<BaseSelect
						v-model="payrollExpenseIdDraft"
						:options="expenseSelectOptions"
						placeholder="Elegir ítem…"
						value-key="value"
						display-key="label"
						class="min-w-[180px] max-w-[260px] flex-1" />
					<BaseButton variant="secondary" size="sm" :loading="savingPayroll" @click="savePayrollExpense">
						Guardar vínculo
					</BaseButton>
				</template>
				<template v-else-if="insights?.linkedExpense && !editingPayrollLink">
					<span class="text-sm text-gray-800">
						<span class="text-gray-500">Gasto asociado:</span>
						<strong class="ml-1">{{ insights.linkedExpense.name }}</strong>
					</span>
					<button
						v-if="canEditPayroll"
						type="button"
						class="p-1 rounded-md text-gray-500 hover:text-emerald-700 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
						title="Cambiar gasto asociado"
						@click="startEditPayrollLink">
						<PencilIcon class="w-4 h-4" />
					</button>
				</template>
				<template v-else-if="editingPayrollLink && canEditPayroll">
					<BaseSelect
						v-model="payrollExpenseIdDraft"
						:options="expenseSelectOptions"
						placeholder="Ítem de gasto"
						value-key="value"
						display-key="label"
						class="min-w-[180px] max-w-[260px] flex-1" />
					<BaseButton variant="secondary" size="sm" :loading="savingPayroll" @click="savePayrollExpense">
						Guardar
					</BaseButton>
					<BaseButton variant="outline" size="sm" :disabled="savingPayroll" @click="cancelEditPayrollLink">
						Cancelar
					</BaseButton>
				</template>
			</div>
		</div>

		<!-- Periodo: una línea -->
		<div class="flex flex-wrap items-end gap-2">
			<button
				type="button"
				class="px-2.5 py-1 text-xs font-medium rounded-md border transition-colors shrink-0"
				:class="periodPreset === 'biweek' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
				@click="applyPresetBiweek">
				Quincena actual
			</button>
			<button
				type="button"
				class="px-2.5 py-1 text-xs font-medium rounded-md border transition-colors shrink-0"
				:class="periodPreset === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
				@click="applyPresetMonth">
				Mes actual
			</button>
			<DashboardDateRangeFilter
				:model-value="pickerRange"
				label="Periodo"
				class="min-w-[200px] flex-1 max-w-md"
				:teleport="true"
				@update:model-value="onPickerRange" />
		</div>

		<p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

		<p
			v-if="refreshing"
			class="text-xs text-gray-500 flex items-center gap-2 py-1"
			aria-live="polite">
			<BaseLoading size="sm" />
			Actualizando datos del periodo…
		</p>

		<template v-if="insights">
			<div v-if="!insights.linkedExpense" class="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
				Sin gasto de nómina asignado: no hay totales ni líneas hasta vincular un ítem del catálogo.
			</div>

			<p v-if="insights.linkedExpense" class="text-sm text-gray-800">
				<strong>Total gastos del periodo:</strong>
				{{ formatCurrency(tableLinesTotal) }}
			</p>

			<div v-if="insights.period.expenseLines.length" class="border border-gray-200 rounded-md overflow-hidden max-h-52 overflow-y-auto">
				<table class="min-w-full text-xs table-fixed">
					<thead class="bg-gray-50 text-left text-[10px] text-gray-500 uppercase tracking-wide">
						<tr>
							<th class="px-2 py-1.5 w-[4.5rem]">Comp.</th>
							<th class="px-2 py-1.5 w-[6.5rem]">Fecha</th>
							<th class="px-2 py-1.5 w-[5rem] text-right">Monto</th>
							<th class="px-2 py-1.5">Notas</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="row in insights.period.expenseLines" :key="row.detailId">
							<td class="px-2 py-1.5 text-gray-900 tabular-nums">#{{ row.headerId }}</td>
							<td class="px-2 py-1.5 text-gray-600 whitespace-nowrap">{{ formatDt(row.headerCreatedAt) }}</td>
							<td class="px-2 py-1.5 text-right font-medium tabular-nums">{{ formatCurrency(row.lineTotal) }}</td>
							<td class="px-2 py-1.5 text-gray-700 align-top break-words min-w-0">
								{{ row.notes?.trim() || '—' }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<template v-if="insights.period.isDeliveryman">
				<div class="border-t border-gray-100 pt-3 space-y-2">
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estadísticas del periodo</p>
					<div class="flex flex-wrap gap-2">
						<div class="rounded border border-violet-100 bg-violet-50/90 px-2.5 py-1.5 min-w-[7rem]">
							<p class="text-[10px] font-medium text-violet-800">Líneas nómina</p>
							<p class="text-sm font-bold text-violet-950 tabular-nums">{{ formatCurrency(insights.period.expenseLinesTotal) }}</p>
						</div>
						<div class="rounded border border-sky-100 bg-sky-50/90 px-2.5 py-1.5 min-w-[7rem]">
							<p class="text-[10px] font-medium text-sky-800">Entregas</p>
							<p class="text-sm font-bold text-sky-950 tabular-nums">{{ insights.period.deliveredOrdersCount }}</p>
						</div>
						<div class="rounded border border-amber-100 bg-amber-50/90 px-2.5 py-1.5 min-w-[7rem]">
							<p class="text-[10px] font-medium text-amber-800">Suma delivery</p>
							<p class="text-sm font-bold text-amber-950 tabular-nums">{{ formatCurrency(insights.period.sumDeliveryFee) }}</p>
						</div>
						<div class="rounded border border-emerald-100 bg-emerald-50/90 px-2.5 py-1.5 min-w-[8rem]">
							<p class="text-[10px] font-medium text-emerald-800">Pagable ({{ payRatePercent }}%)</p>
							<p class="text-sm font-bold text-emerald-950 tabular-nums">{{ formatCurrency(insights.period.payableDeliveryFee) }}</p>
						</div>
					</div>

					<div v-if="chartLabels.length" class="flex flex-wrap items-end gap-2 pt-1">
						<BaseSelect
							v-model="seriesGranularity"
							:options="granularityOptions"
							label="Agrupación del gráfico"
							value-key="value"
							display-key="label"
							class="w-44" />
					</div>

					<div v-if="chartLabels.length" class="pt-1">
						<p class="text-xs text-gray-600 mb-1">Entregas por {{ seriesGranularityLabel }}</p>
						<DashboardLineChart
							:labels="chartLabels"
							:datasets="chartDatasets"
							y-format="number"
							variant="area" />
					</div>
				</div>
			</template>
		</template>

		<div v-else-if="initialLoading" class="flex justify-center py-6">
			<BaseLoading size="md" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { UserPayrollInsights, UserPayrollSeriesGranularity } from '@/types/userPayroll'
import { userApi } from '@/services/MainAPI/userApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/store/auth'
import { currentBiweekRangeYmd, currentMonthRangeYmd } from '@/utils/colombiaPayrollPeriod'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import DashboardDateRangeFilter from '@/components/dashboard/DashboardDateRangeFilter.vue'
import DashboardLineChart from '@/components/dashboard/DashboardLineChart.vue'
import type { LineChartDataset } from '@/components/dashboard/lineChart.types'
import { PencilIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
	userId: number
}>()

const emit = defineEmits<{
	'payroll-saved': []
}>()

const { formatCurrency } = useFormatting()
const { success, error } = useToast()
const authStore = useAuthStore()

const canEditPayroll = computed(
	() => authStore.user?.role === 'Admin' || authStore.user?.role === 'Superadmin'
)

const _initialRange = currentBiweekRangeYmd()
const periodPreset = ref<'biweek' | 'month' | 'custom'>('biweek')
const fromStr = ref(_initialRange.from)
const toStr = ref(_initialRange.to)
const seriesGranularity = ref<UserPayrollSeriesGranularity>('biweek')
const editingPayrollLink = ref(false)

const granularityOptions = [
	{ value: 'day' as const, label: 'Por día' },
	{ value: 'biweek' as const, label: 'Por quincena' },
	{ value: 'month' as const, label: 'Por mes' },
]

const seriesGranularityLabel = computed(() => {
	const g = seriesGranularity.value
	if (g === 'day') return 'día'
	if (g === 'month') return 'mes'
	return 'quincena'
})

/** Primera carga sin datos aún: spinner centrado. */
const initialLoading = ref(false)
/** Refetch con datos previos visibles: aviso discreto arriba. */
const refreshing = ref(false)
const errorMsg = ref('')
const insights = ref<UserPayrollInsights | null>(null)

const expenseSelectOptions = ref<Array<{ value: number; label: string }>>([{ value: 0, label: 'Sin asignar' }])
const payrollExpenseIdDraft = ref(0)
const savingPayroll = ref(false)

let loadDebounce: ReturnType<typeof setTimeout> | null = null

const payRatePercent = computed(() =>
	insights.value ? Math.round((insights.value.deliveryFeePayRate ?? 0.7) * 100) : 70
)

const tableLinesTotal = computed(() => {
	if (!insights.value?.period.expenseLines.length) return insights.value?.period.expenseLinesTotal ?? 0
	return insights.value.period.expenseLines.reduce((s, r) => s + Number(r.lineTotal), 0)
})

const pickerRange = computed<[Date, Date]>(() => [ymdToLocalDate(fromStr.value), ymdToLocalDate(toStr.value)])

const chartLabels = computed(() => insights.value?.series.map((s) => s.label) ?? [])

const chartDatasets = computed((): LineChartDataset[] => {
	const s = insights.value?.series
	if (!s?.length) return []
	return [
		{
			label: 'Entregas',
			data: s.map((x) => x.deliveredOrdersCount),
			borderColor: 'rgb(14, 165, 233)',
			backgroundColor: 'rgba(14, 165, 233, 0.12)',
		},
	]
})

function ymdToLocalDate(ymd: string): Date {
	if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return new Date()
	const [y, m, d] = ymd.split('-').map(Number)
	return new Date(y, m - 1, d)
}

function toYmd(d: Date): string {
	const y = d.getFullYear()
	const mo = String(d.getMonth() + 1).padStart(2, '0')
	const da = String(d.getDate()).padStart(2, '0')
	return `${y}-${mo}-${da}`
}

function onPickerRange(v: [Date, Date]) {
	fromStr.value = toYmd(v[0])
	toStr.value = toYmd(v[1])
	periodPreset.value = 'custom'
}

function formatDt(iso: string) {
	return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function scheduleLoad() {
	if (!fromStr.value || !toStr.value) return
	if (loadDebounce) clearTimeout(loadDebounce)
	loadDebounce = setTimeout(() => {
		loadDebounce = null
		void load()
	}, 280)
}

function applyPresetBiweek() {
	periodPreset.value = 'biweek'
	const r = currentBiweekRangeYmd()
	fromStr.value = r.from
	toStr.value = r.to
	seriesGranularity.value = 'biweek'
	scheduleLoad()
}

function applyPresetMonth() {
	periodPreset.value = 'month'
	const r = currentMonthRangeYmd()
	fromStr.value = r.from
	toStr.value = r.to
	seriesGranularity.value = 'month'
	scheduleLoad()
}

async function load() {
	errorMsg.value = ''
	const hadData = insights.value != null
	if (hadData) refreshing.value = true
	else initialLoading.value = true
	try {
		insights.value = await userApi.getPayrollInsights(props.userId, {
			from: fromStr.value,
			to: toStr.value,
			seriesGranularity: seriesGranularity.value,
		})
		if (!editingPayrollLink.value) {
			payrollExpenseIdDraft.value = insights.value.linkedExpense?.id ?? 0
		}
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'No se pudo cargar el resumen'
		errorMsg.value = msg
		error(msg)
		if (!hadData) insights.value = null
	} finally {
		initialLoading.value = false
		refreshing.value = false
	}
}

async function loadExpenseCatalog() {
	try {
		const res = await expenseApi.getAllExpenses()
		const list = res.data ?? []
		expenseSelectOptions.value = [
			{ value: 0, label: 'Sin asignar' },
			...list.map((ex) => ({ value: ex.id, label: ex.name })),
		]
	} catch {
		/* selector opcional */
	}
}

function startEditPayrollLink() {
	editingPayrollLink.value = true
	payrollExpenseIdDraft.value = insights.value?.linkedExpense?.id ?? 0
}

function cancelEditPayrollLink() {
	editingPayrollLink.value = false
	payrollExpenseIdDraft.value = insights.value?.linkedExpense?.id ?? 0
}

async function savePayrollExpense() {
	savingPayroll.value = true
	try {
		const u = await userApi.getUserById(props.userId)
		await userApi.updateUser(props.userId, {
			name: u.name,
			email: u.email,
			phone: u.phone,
			role: u.role,
			active: u.active,
			payrollExpenseId: payrollExpenseIdDraft.value > 0 ? payrollExpenseIdDraft.value : null,
		})
		success('Gasto de nómina actualizado', 5000)
		editingPayrollLink.value = false
		emit('payroll-saved')
		await load()
	} catch (e: unknown) {
		error('No se pudo guardar', e instanceof Error ? e.message : undefined)
	} finally {
		savingPayroll.value = false
	}
}

onMounted(async () => {
	await loadExpenseCatalog()
	await load()
})

watch(
	() => props.userId,
	() => {
		editingPayrollLink.value = false
		insights.value = null
		applyPresetBiweek()
	}
)

watch(seriesGranularity, () => {
	scheduleLoad()
})

watch([fromStr, toStr], () => {
	scheduleLoad()
})
</script>

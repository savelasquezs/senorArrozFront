<template>
	<div class="space-y-4">
		<div class="flex flex-wrap items-end gap-2">
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
				:class="periodPreset === 'biweek' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
				@click="applyPresetBiweek">
				Quincena actual
			</button>
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
				:class="periodPreset === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
				@click="applyPresetMonth">
				Mes actual
			</button>
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
				:class="periodPreset === 'custom' ? 'ring-2 ring-gray-400' : ''"
				@click="periodPreset = 'custom'">
				Rango libre
			</button>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
			<BaseInput v-model="fromStr" type="date" label="Desde" @change="periodPreset = 'custom'" />
			<BaseInput v-model="toStr" type="date" label="Hasta" @change="periodPreset = 'custom'" />
			<BaseSelect
				v-model="seriesGranularity"
				:options="granularityOptions"
				label="Agrupación del gráfico"
				value-key="value"
				display-key="label" />
			<BaseButton variant="primary" :loading="loading" @click="load">Actualizar</BaseButton>
		</div>

		<div v-if="canEditPayroll" class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
			<p class="text-sm font-medium text-gray-800">Gasto de catálogo para nómina / préstamos</p>
			<p class="text-xs text-gray-600">
				Cada usuario debe tener su propio ítem en el catálogo (ej. &quot;Quincena Maikol&quot;). Solo se suman líneas de comprobantes con ese
				<code class="text-[11px] bg-white px-1 rounded">expense_id</code> en esta sucursal.
			</p>
			<div class="flex flex-wrap items-end gap-2">
				<BaseSelect
					v-model="payrollExpenseIdDraft"
					:options="expenseSelectOptions"
					label="Ítem de gasto"
					placeholder="Sin asignar…"
					value-key="value"
					display-key="label"
					class="min-w-[220px]" />
				<BaseButton variant="secondary" size="sm" :loading="savingPayroll" @click="savePayrollExpense">
					Guardar vínculo
				</BaseButton>
			</div>
		</div>

		<p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

		<template v-if="insights && !loading">
			<div v-if="!insights.linkedExpense" class="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
				Este usuario no tiene asignado un gasto de nómina. Configúralo arriba para ver totales de préstamos/gastos de quincena.
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<div class="rounded-lg border border-gray-100 bg-violet-50 p-3">
					<p class="text-xs font-medium text-violet-800">Total líneas nómina (periodo)</p>
					<p class="text-xl font-bold text-violet-950">{{ formatCurrency(insights.period.expenseLinesTotal) }}</p>
				</div>
				<template v-if="insights.period.isDeliveryman">
					<div class="rounded-lg border border-gray-100 bg-sky-50 p-3">
						<p class="text-xs font-medium text-sky-800">Entregas (periodo)</p>
						<p class="text-xl font-bold text-sky-950">{{ insights.period.deliveredOrdersCount }}</p>
					</div>
					<div class="rounded-lg border border-gray-100 bg-amber-50 p-3">
						<p class="text-xs font-medium text-amber-800">Suma delivery</p>
						<p class="text-xl font-bold text-amber-950">{{ formatCurrency(insights.period.sumDeliveryFee) }}</p>
					</div>
					<div class="rounded-lg border border-gray-100 bg-emerald-50 p-3">
						<p class="text-xs font-medium text-emerald-800">
							Pagable domiciliario ({{ payRatePercent }}%)
						</p>
						<p class="text-xl font-bold text-emerald-950">{{ formatCurrency(insights.period.payableDeliveryFee) }}</p>
					</div>
				</template>
			</div>

			<div v-if="insights.period.expenseLines.length" class="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
				<table class="min-w-full text-sm">
					<thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase">
						<tr>
							<th class="px-3 py-2">Comprobante</th>
							<th class="px-3 py-2">Fecha</th>
							<th class="px-3 py-2 text-right">Monto</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="row in insights.period.expenseLines" :key="row.detailId">
							<td class="px-3 py-2 text-gray-900">#{{ row.headerId }}</td>
							<td class="px-3 py-2 text-gray-600">{{ formatDt(row.headerCreatedAt) }}</td>
							<td class="px-3 py-2 text-right font-medium">{{ formatCurrency(row.lineTotal) }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="insights.period.isDeliveryman && chartLabels.length" class="pt-2">
				<p class="text-sm font-medium text-gray-700 mb-2">Histórico en el rango ({{ seriesGranularityLabel }})</p>
				<DashboardLineChart
					:labels="chartLabels"
					:datasets="chartDatasets"
					y-format="number"
					variant="line" />
			</div>
		</template>

		<div v-else-if="loading" class="flex justify-center py-8">
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
import {
	currentBiweekRangeYmd,
	currentMonthRangeYmd,
} from '@/utils/colombiaPayrollPeriod'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import DashboardLineChart from '@/components/dashboard/DashboardLineChart.vue'
import type { LineChartDataset } from '@/components/dashboard/lineChart.types'

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

const periodPreset = ref<'biweek' | 'month' | 'custom'>('biweek')
const fromStr = ref('')
const toStr = ref('')
const seriesGranularity = ref<UserPayrollSeriesGranularity>('biweek')

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

const loading = ref(false)
const errorMsg = ref('')
const insights = ref<UserPayrollInsights | null>(null)

const expenseSelectOptions = ref<Array<{ value: number; label: string }>>([{ value: 0, label: 'Sin asignar' }])
const payrollExpenseIdDraft = ref(0)
const savingPayroll = ref(false)

const payRatePercent = computed(() =>
	insights.value ? Math.round((insights.value.deliveryFeePayRate ?? 0.7) * 100) : 70
)

const chartLabels = computed(() => insights.value?.series.map((s) => s.label) ?? [])

const chartDatasets = computed((): LineChartDataset[] => {
	const s = insights.value?.series
	if (!s?.length) return []
	return [
		{
			label: 'Entregas',
			data: s.map((x) => x.deliveredOrdersCount),
			borderColor: 'rgb(14, 165, 233)',
		},
		{
			label: 'Delivery pagable',
			data: s.map((x) => x.payableDeliveryFee),
			borderColor: 'rgb(16, 185, 129)',
		},
	]
})

function formatDt(iso: string) {
	return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function applyPresetBiweek() {
	periodPreset.value = 'biweek'
	const r = currentBiweekRangeYmd()
	fromStr.value = r.from
	toStr.value = r.to
	seriesGranularity.value = 'biweek'
	void load()
}

function applyPresetMonth() {
	periodPreset.value = 'month'
	const r = currentMonthRangeYmd()
	fromStr.value = r.from
	toStr.value = r.to
	seriesGranularity.value = 'month'
	void load()
}

async function load() {
	errorMsg.value = ''
	loading.value = true
	try {
		insights.value = await userApi.getPayrollInsights(props.userId, {
			from: fromStr.value,
			to: toStr.value,
			seriesGranularity: seriesGranularity.value,
		})
		payrollExpenseIdDraft.value = insights.value.linkedExpense?.id ?? 0
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'No se pudo cargar el resumen'
		errorMsg.value = msg
		error(msg)
		insights.value = null
	} finally {
		loading.value = false
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
		emit('payroll-saved')
		await load()
	} catch (e: unknown) {
		error('No se pudo guardar', e instanceof Error ? e.message : undefined)
	} finally {
		savingPayroll.value = false
	}
}

onMounted(async () => {
	const r = currentBiweekRangeYmd()
	fromStr.value = r.from
	toStr.value = r.to
	await loadExpenseCatalog()
	await load()
})

watch(
	() => props.userId,
	() => {
		applyPresetBiweek()
	}
)
</script>

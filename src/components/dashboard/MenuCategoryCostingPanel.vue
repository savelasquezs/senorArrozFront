<template>
	<BaseCard title="Costeo por categoría de menú" :padding="'md'">
		<p class="text-[11px] text-gray-500 pb-3 border-b border-gray-100 leading-relaxed">
			Mismo <strong>periodo</strong> que el panel lateral. Solo categorías y productos con <strong>gramos vendidos</strong>
			(productos con peso en catálogo). El costo de categoría se reparte entre esos productos por proporción de gramos.
			El margen es <code class="text-[10px]">(ingreso − costo) / ingreso</code> en el periodo.
		</p>

		<div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
			{{ error }}
		</div>

		<div
			v-else-if="loading && !payload"
			class="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500"
		>
			Cargando costeo por categoría…
		</div>

		<div v-else-if="payload && !payload.categories.length" class="text-sm text-gray-500 py-4">
			No hay categorías con gramos vendidos en este rango (productos sin peso configurado no entran). Configura
			destinos de menú en los gastos de catálogo para ver imputaciones cuando haya ventas con peso.
		</div>

		<div v-else-if="payload" class="space-y-6 mt-4">
			<section
				v-for="cat in payload.categories"
				:key="cat.categoryId"
				class="rounded-xl border border-gray-200 bg-white overflow-hidden"
			>
				<div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-gray-900">{{ cat.categoryName }}</h3>
					<div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
						<span
							>Gramos vendidos (periodo):
							<strong class="text-gray-900 tabular-nums">{{ formatGrams(cat.totalWeightGramsSold) }}</strong></span
						>
						<span
							>Costo imputado:
							<strong class="text-gray-900 tabular-nums">{{ formatCop(cat.totalAllocatedCostCop) }}</strong></span
						>
						<span v-if="cat.blendedCostPerGramCop != null"
							>Costo / g (mezcla):
							<strong class="text-gray-900 tabular-nums">{{
								formatCop(Math.round(cat.blendedCostPerGramCop))
							}}</strong></span
						>
						<span v-else class="text-gray-400">Costo / g: — (sin gramos en categoría)</span>
						<span
							>Ingresos ventas:
							<strong class="text-gray-900 tabular-nums">{{ formatCop(cat.totalRevenueCop) }}</strong></span
						>
					</div>
				</div>

				<div class="px-4 py-3 border-b border-gray-100">
					<h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Gastos involucrados</h4>
					<ul v-if="cat.expenseBreakdown.length" class="text-sm space-y-1">
						<li
							v-for="(ex, i) in cat.expenseBreakdown"
							:key="i"
							class="flex justify-between gap-4 tabular-nums"
						>
							<span class="text-gray-800">{{ ex.expenseName }}</span>
							<span class="text-gray-900 font-medium shrink-0">{{ formatCop(ex.allocatedCop) }}</span>
						</li>
					</ul>
					<p v-else class="text-sm text-gray-400">Ningún gasto imputado a esta categoría en el periodo.</p>
				</div>

				<div class="px-4 py-3 overflow-x-auto">
					<h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Productos</h4>
					<table class="min-w-full text-sm">
						<thead>
							<tr class="text-left text-xs text-gray-500 border-b border-gray-200">
								<th class="py-2 pr-3 font-medium">Producto</th>
								<th class="py-2 pr-3 font-medium text-right">Ingreso</th>
								<th class="py-2 pr-3 font-medium text-right">Gramos</th>
								<th class="py-2 pr-3 font-medium text-right">$/g venta</th>
								<th class="py-2 pr-3 font-medium text-right">Costo atrib.</th>
								<th class="py-2 font-medium text-right">Margen %</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100">
							<tr v-for="p in cat.products" :key="p.productId" class="text-gray-800">
								<td class="py-2 pr-3">{{ p.productName }}</td>
								<td class="py-2 pr-3 text-right tabular-nums">{{ formatCop(p.revenueCop) }}</td>
								<td class="py-2 pr-3 text-right tabular-nums">{{ p.gramsSold > 0 ? formatGrams(p.gramsSold) : '—' }}</td>
								<td class="py-2 pr-3 text-right tabular-nums">
									{{ p.avgPricePerGramCop != null ? formatCop(Math.round(p.avgPricePerGramCop)) : '—' }}
								</td>
								<td class="py-2 pr-3 text-right tabular-nums">
									{{
										p.allocatedCostPerGramCop != null
											? formatCop(Math.round(p.allocatedCostPerGramCop))
											: '—'
									}}
								</td>
								<td class="py-2 pr-3 text-right tabular-nums">{{ formatCop(p.allocatedCostCop) }}</td>
								<td class="py-2 text-right tabular-nums font-medium">
									<span v-if="p.marginPercent != null" :class="marginClass(p.marginPercent)">
										{{ p.marginPercent.toFixed(1) }}%
									</span>
									<span v-else class="text-gray-400">—</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { encodeDashboardRangeToApi } from '@/services/MainAPI/dashboardSectionApi'
import type { MenuCategoryCostingDashboardResponse } from '@/types/expense'

const props = defineProps<{
	branchId: number | null
	dateRange: [Date, Date]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const payload = ref<MenuCategoryCostingDashboardResponse | null>(null)

function formatCop(n: number) {
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n)
}

function formatGrams(g: number): string {
	if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(2)} t`
	if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`
	return `${g} g`
}

function marginClass(p: number) {
	if (p >= 40) return 'text-emerald-700'
	if (p >= 15) return 'text-amber-700'
	return 'text-red-700'
}

async function load() {
	error.value = null
	loading.value = true
	try {
		const { from, to } = encodeDashboardRangeToApi(props.dateRange)
		const res = await expenseApi.getMenuCategoryCostingDashboard({
			fromUtc: from,
			toUtc: to,
			branchId: props.branchId && props.branchId > 0 ? props.branchId : null,
		})
		if (!res.isSuccess) {
			error.value = res.message || 'No se pudo cargar el costeo'
			payload.value = null
			return
		}
		payload.value = res.data ?? null
	} catch (e: any) {
		error.value = e?.message || 'Error al cargar'
		payload.value = null
	} finally {
		loading.value = false
	}
}

watch(
	() => [props.branchId, props.dateRange[0]?.getTime(), props.dateRange[1]?.getTime()] as const,
	() => {
		void load()
	},
	{ deep: true, immediate: true },
)
</script>

import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchVentasDashboard,
	fetchVentasProductsOnly,
	USE_VENTAS_MOCK,
	type VentasDashboardPayload,
	type VentasProductsGroupBy,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

/**
 * Carga Ventas: comparativa, evolución temporal y productos/categorías para el rango del `TimeEvolutionPanel`.
 * Cambiar Productos ↔ Categorías solo vuelve a pedir `/sales/products` y no muestra el estado de carga de toda la sección.
 */
export function useDashboardVentasSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
	productsGroupBy: Ref<VentasProductsGroupBy>,
) {
	const data = ref<VentasDashboardPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'ventas');

	let fullLoadSeq = 0;
	let productsOnlySeq = 0;

	async function loadFull() {
		if (!isActive.value) return;
		const seq = ++fullLoadSeq;
		loading.value = true;
		error.value = null;
		const groupByForThisFetch = productsGroupBy.value;
		try {
			const result = await fetchVentasDashboard(
				branchId.value,
				dateRange.value,
				groupByForThisFetch,
			);
			if (seq !== fullLoadSeq) return;
			data.value = result;
		} catch (e) {
			if (seq !== fullLoadSeq) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar Ventas';
			data.value = null;
		} finally {
			if (seq === fullLoadSeq) loading.value = false;
		}
		// Tras quitar el loading: si el agrupamiento cambió durante la petición, actualizar solo gráficas de productos.
		if (seq === fullLoadSeq && data.value && productsGroupBy.value !== groupByForThisFetch) {
			void refreshProductsOnly();
		}
	}

	async function refreshProductsOnly() {
		if (!isActive.value || USE_VENTAS_MOCK) return;
		if (!data.value) return;
		const seq = ++productsOnlySeq;
		try {
			const products = await fetchVentasProductsOnly(
				branchId.value,
				dateRange.value,
				productsGroupBy.value,
			);
			if (seq !== productsOnlySeq) return;
			if (!data.value) return;
			data.value = { ...data.value, products };
		} catch {
			// Mantener gráficas anteriores; no bloquear la sección.
		}
	}

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value)],
		() => void loadFull(),
		{ immediate: true },
	);

	watch(productsGroupBy, () => void refreshProductsOnly());

	return {
		data,
		loading,
		error,
		refresh: loadFull,
	};
}

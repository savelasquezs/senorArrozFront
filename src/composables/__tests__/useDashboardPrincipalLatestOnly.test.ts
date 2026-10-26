import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useDashboardPrincipalSection } from '@/composables/dashboard/useDashboardPrincipalSection';
import { useDashboardPrincipalSalesVsExpenses } from '@/composables/dashboard/useDashboardPrincipalSalesVsExpenses';
import { fetchPrincipalDashboard, type PrincipalDashboardPayload } from '@/services/MainAPI/dashboardSectionApi';
import { dashboardApi, type DashboardPrincipalSalesVsExpensesApiResponse } from '@/services/MainAPI/dashboardApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { DashboardTimeGranularity } from '@/views/dashboard/dashboardGlobalFilters';

vi.mock('@/services/MainAPI/dashboardSectionApi', () => ({
	fetchPrincipalDashboard: vi.fn(),
	encodeDashboardRangeToApi: () => ({
		from: '2026-10-23T05:00:00.000Z',
		to: '2026-10-24T04:59:59.999Z',
	}),
}));

vi.mock('@/services/MainAPI/dashboardApi', () => ({
	dashboardApi: { getPrincipalSalesVsExpenses: vi.fn() },
}));

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((success, failure) => {
		resolve = success;
		reject = failure;
	});
	return { promise, resolve, reject };
}

function principal(totalSales: number): PrincipalDashboardPayload {
	return { kpis: { totalSales } } as unknown as PrincipalDashboardPayload;
}

function salesVsExpenses(marker: number): DashboardPrincipalSalesVsExpensesApiResponse {
	return { granularity: 'day', marker } as unknown as DashboardPrincipalSalesVsExpensesApiResponse;
}

function state() {
	return {
		active: ref<DashboardSectionId>('principal'),
		branch: ref<number | null>(1),
		range: ref<[Date, Date]>([
			new Date('2026-10-23T12:00:00Z'),
			new Date('2026-10-23T12:00:00Z'),
		]),
		granularity: ref<DashboardTimeGranularity>('day'),
	};
}

let scope: EffectScope | null = null;

beforeEach(() => {
	vi.mocked(fetchPrincipalDashboard).mockReset();
	vi.mocked(dashboardApi.getPrincipalSalesVsExpenses).mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	scope?.stop();
	scope = null;
});

describe('M29-F01 dashboard principal: última solicitud vigente', () => {
	it('conserva la sección al volver dentro del TTL y revalida cuando vence', async () => {
		const fetch = vi.mocked(fetchPrincipalDashboard).mockResolvedValue(principal(100));
		const refs = state();
		scope = effectScope();
		const dashboard = scope.run(() => useDashboardPrincipalSection(refs.active, refs.branch, refs.range))!;
		await flushPromises();
		refs.active.value = 'ventas'; await nextTick();
		expect(dashboard.data.value?.kpis.totalSales).toBe(100);
		refs.active.value = 'principal'; await flushPromises();
		expect(fetch).toHaveBeenCalledOnce();
		const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 31_000);
		refs.active.value = 'ventas'; await nextTick();
		refs.active.value = 'principal'; await flushPromises();
		expect(fetch).toHaveBeenCalledTimes(2);
		refs.branch.value = 2; await flushPromises();
		expect(fetch).toHaveBeenCalledTimes(3);
	});
	it('cancela la consulta anterior y no permite que los KPI viejos reemplacen los nuevos', async () => {
		const first = deferred<PrincipalDashboardPayload>();
		const second = deferred<PrincipalDashboardPayload>();
		const fetch = vi.mocked(fetchPrincipalDashboard)
			.mockImplementationOnce(() => first.promise)
			.mockImplementationOnce(() => second.promise);
		const refs = state();
		scope = effectScope();
		const dashboard = scope.run(() => useDashboardPrincipalSection(refs.active, refs.branch, refs.range))!;
		expect(fetch).toHaveBeenCalledTimes(1);
		const firstSignal = fetch.mock.calls[0]![1]!.signal;

		refs.branch.value = 2;
		await nextTick();
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(firstSignal?.aborted).toBe(true);

		second.resolve(principal(200));
		await flushPromises();
		expect(dashboard.data.value?.kpis.totalSales).toBe(200);
		expect(dashboard.loading.value).toBe(false);

		first.resolve(principal(100));
		await flushPromises();
		expect(dashboard.data.value?.kpis.totalSales).toBe(200);
		expect(dashboard.error.value).toBeNull();
	});

	it('ignora el error de una consulta obsoleta y deja de cargar al salir de Principal', async () => {
		const first = deferred<PrincipalDashboardPayload>();
		const second = deferred<PrincipalDashboardPayload>();
		vi.mocked(fetchPrincipalDashboard)
			.mockImplementationOnce(() => first.promise)
			.mockImplementationOnce(() => second.promise);
		const refs = state();
		scope = effectScope();
		const dashboard = scope.run(() => useDashboardPrincipalSection(refs.active, refs.branch, refs.range))!;

		refs.branch.value = 2;
		await nextTick();
		first.reject(new Error('Fallo de la sucursal anterior'));
		await flushPromises();
		expect(dashboard.error.value).toBeNull();
		expect(dashboard.loading.value).toBe(true);

		const secondSignal = vi.mocked(fetchPrincipalDashboard).mock.calls[1]![1]!.signal;
		refs.active.value = 'ventas';
		await nextTick();
		expect(secondSignal?.aborted).toBe(true);
		expect(dashboard.loading.value).toBe(false);
		second.resolve(principal(999));
		await flushPromises();
		expect(dashboard.data.value).toBeNull();
	});

	it('el gráfico tampoco admite una respuesta antigua después de cambiar de sucursal', async () => {
		const first = deferred<DashboardPrincipalSalesVsExpensesApiResponse>();
		const second = deferred<DashboardPrincipalSalesVsExpensesApiResponse>();
		const fetch = vi.mocked(dashboardApi.getPrincipalSalesVsExpenses)
			.mockImplementationOnce(() => first.promise)
			.mockImplementationOnce(() => second.promise);
		const refs = state();
		scope = effectScope();
		const dashboard = scope.run(() => useDashboardPrincipalSalesVsExpenses(
			refs.active, refs.branch, refs.range, refs.granularity,
		))!;

		expect(fetch).toHaveBeenCalledTimes(1);
		const firstSignal = fetch.mock.calls[0]![4];
		refs.branch.value = 2;
		await nextTick();
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(firstSignal?.aborted).toBe(true);

		second.resolve(salesVsExpenses(200));
		await flushPromises();
		expect((dashboard.data.value as unknown as { marker: number }).marker).toBe(200);
		first.resolve(salesVsExpenses(100));
		await flushPromises();
		expect((dashboard.data.value as unknown as { marker: number }).marker).toBe(200);
		expect(dashboard.loading.value).toBe(false);
	});

	it('invalida el gráfico al destruir el alcance de la vista', async () => {
		const response = deferred<DashboardPrincipalSalesVsExpensesApiResponse>();
		const fetch = vi.mocked(dashboardApi.getPrincipalSalesVsExpenses)
			.mockImplementationOnce(() => response.promise);
		const refs = state();
		scope = effectScope();
		const dashboard = scope.run(() => useDashboardPrincipalSalesVsExpenses(
			refs.active, refs.branch, refs.range, refs.granularity,
		))!;
		const signal = fetch.mock.calls[0]![4];
		scope.stop();
		expect(signal?.aborted).toBe(true);
		response.resolve(salesVsExpenses(123));
		await flushPromises();
		expect(dashboard.data.value).toBeNull();
	});
    it('reutiliza una respuesta diaria al alternar entre Día y Quincena', async () => {
        const fetch = vi.mocked(dashboardApi.getPrincipalSalesVsExpenses).mockResolvedValue({
            granularity: 'day',
            labels: ['vie 23 oct'],
            salesCop: [100],
            expenseCategories: [],
        });
        const refs = state();
        scope = effectScope();
        const dashboard = scope.run(() => useDashboardPrincipalSalesVsExpenses(
            refs.active, refs.branch, refs.range, refs.granularity,
        ))!;
        await flushPromises();
        expect(fetch).toHaveBeenCalledTimes(1);
        refs.granularity.value = 'fortnight';
        await nextTick();
        await flushPromises();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(dashboard.data.value?.granularity).toBe('fortnight');
    });

});

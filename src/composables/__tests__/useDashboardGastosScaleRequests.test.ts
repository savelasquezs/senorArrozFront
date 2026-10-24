import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useDashboardGastosSection } from '@/composables/dashboard/useDashboardGastosSection';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { DashboardTimeGranularity } from '@/views/dashboard/dashboardGlobalFilters';

const { api } = vi.hoisted(() => ({ api: {
  getExpenseSummary: vi.fn(),
  getExpenseByCategory: vi.fn(),
  getExpenseTimeSeries: vi.fn(),
  getExpenseTopLines: vi.fn(),
} }));
vi.mock('@/services/MainAPI/dashboardApi', () => ({ dashboardApi: api }));

let scope: EffectScope | null = null;
beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.getExpenseSummary.mockResolvedValue({
    totalCop: 300, headerCount: 2, lineCount: 3, avgDailyCop: 300,
    avgTicketCop: 150, previousPeriodTotalCop: 0, previousPeriodHeaderCount: 0,
    totalChangeFromPreviousPercent: 100,
  });
  api.getExpenseByCategory.mockResolvedValue({ slices: [] });
  api.getExpenseTimeSeries.mockResolvedValue({
    labels: ['2026-10-23'], amountsCop: [300], granularity: 'day', seriesLabel: 'Total',
  });
});
afterEach(() => { scope?.stop(); scope = null; });

describe('Dashboard Gastos: no consultar nuevamente datos independientes de la escala', () => {
  it('reutiliza la serie diaria para quincenas y al ir a mes solo actualiza timeseries', async () => {
    const granularity = ref<DashboardTimeGranularity>('day');
    scope = effectScope();
    const result = scope.run(() => useDashboardGastosSection(
      ref<DashboardSectionId>('gastos'), ref<number | null>(1),
      ref<[Date, Date]>([new Date('2026-10-23T12:00:00Z'), new Date('2026-10-23T12:00:00Z')]),
      granularity,
    ))!;
    await flushPromises();
    expect(api.getExpenseSummary).toHaveBeenCalledTimes(1);
    expect(api.getExpenseByCategory).toHaveBeenCalledTimes(1);
    expect(api.getExpenseTimeSeries).toHaveBeenCalledTimes(1);

    granularity.value = 'fortnight';
    await nextTick();
    await flushPromises();
    expect(api.getExpenseTimeSeries).toHaveBeenCalledTimes(1);
    expect(result.data.value?.timeSeries?.granularity).toBe('fortnight');

    granularity.value = 'month';
    await nextTick();
    await flushPromises();
    expect(api.getExpenseSummary).toHaveBeenCalledTimes(1);
    expect(api.getExpenseByCategory).toHaveBeenCalledTimes(1);
    expect(api.getExpenseTimeSeries).toHaveBeenCalledTimes(2);
  });
});

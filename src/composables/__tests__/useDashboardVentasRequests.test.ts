import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { VentasDashboardPayload, VentasProductsGroupBy } from '@/services/MainAPI/dashboardSectionApi';

const { full, products } = vi.hoisted(() => ({ full: vi.fn(), products: vi.fn() }));
vi.mock('@/services/MainAPI/dashboardSectionApi', () => ({
  fetchVentasDashboard: full,
  fetchVentasProductsOnly: products,
  USE_VENTAS_MOCK: false,
}));
import { useDashboardVentasSection } from '@/composables/dashboard/useDashboardVentasSection';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(ok => { resolve = ok; });
  return { resolve, promise };
}
const payload = (name: string): VentasDashboardPayload =>
  ({ comparisonRows: [{ id: 1, name }], evolution: null, hourly: null, products: null } as unknown as VentasDashboardPayload);
let scope: EffectScope | null = null;
beforeEach(() => { full.mockReset(); products.mockReset(); });
afterEach(() => { scope?.stop(); scope = null; });

describe('dashboard ventas: evita respuestas y solicitudes antiguas', () => {
  it('cancela carga anterior y no sobrescribe datos con una respuesta atrasada', async () => {
    const first = deferred<VentasDashboardPayload>();
    const second = deferred<VentasDashboardPayload>();
    full.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const branch = ref<number | null>(1);
    scope = effectScope();
    const model = scope.run(() => useDashboardVentasSection(
      ref<DashboardSectionId>('ventas'), branch,
      ref<[Date, Date]>([new Date('2026-10-23T12:00:00Z'), new Date('2026-10-23T12:00:00Z')]),
      ref<VentasProductsGroupBy>('product'),
    ))!;
    expect(full).toHaveBeenCalledTimes(1);
    const signal = full.mock.calls[0]![3] as AbortSignal;
    branch.value = 2;
    await nextTick();
    expect(signal.aborted).toBe(true);
    expect(full).toHaveBeenCalledTimes(2);
    second.resolve(payload('Sucursal vigente'));
    await flushPromises();
    first.resolve(payload('Respuesta vieja'));
    await flushPromises();
    expect(model.data.value?.comparisonRows[0]?.name).toBe('Sucursal vigente');
  });

  it('al alternar Productos y Categorías solo actualiza el ranking', async () => {
    full.mockResolvedValue(payload('Principal'));
    products.mockResolvedValue(null);
    const mode = ref<VentasProductsGroupBy>('product');
    scope = effectScope();
    scope.run(() => useDashboardVentasSection(
      ref<DashboardSectionId>('ventas'), ref<number | null>(1),
      ref<[Date, Date]>([new Date('2026-10-23T12:00:00Z'), new Date('2026-10-23T12:00:00Z')]),
      mode,
    ));
    await flushPromises();
    mode.value = 'category';
    await nextTick();
    await flushPromises();
    expect(full).toHaveBeenCalledTimes(1);
    expect(products).toHaveBeenCalledTimes(1);
  });
});

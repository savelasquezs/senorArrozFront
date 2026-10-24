import { ref, watch, computed, onScopeDispose, type Ref } from 'vue';
import { fetchVentasDashboard, fetchVentasProductsOnly, USE_VENTAS_MOCK,
  type VentasDashboardPayload, type VentasProductsGroupBy } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

function rangeKey(range: [Date, Date]) {
  return `${range[0].getTime()}-${range[1].getTime()}`;
}

export function useDashboardVentasSection(
  activeSection: Ref<DashboardSectionId>,
  branchId: Ref<number | null>,
  dateRange: Ref<[Date, Date]>,
  productsGroupBy: Ref<VentasProductsGroupBy>,
) {
  const data = ref<VentasDashboardPayload | null>(null);
  const loading = ref(false);
  const refreshBusy = ref(false);
  const error = ref<string | null>(null);
  const isActive = computed(() => activeSection.value === 'ventas');
  const scopeKey = () => `${branchId.value ?? 'all'}|${rangeKey(dateRange.value)}`;
  let fullLoadSeq = 0, productsOnlySeq = 0;
  let fullController: AbortController | null = null;
  let productsController: AbortController | null = null;
  let lastScope = '';

  function cancelPending() {
    fullLoadSeq++;
    productsOnlySeq++;
    fullController?.abort();
    productsController?.abort();
    fullController = null;
    productsController = null;
  }
  onScopeDispose(cancelPending);

  async function loadFull() {
    if (!isActive.value) return;
    cancelPending();
    const seq = fullLoadSeq;
    const controller = new AbortController();
    fullController = controller;
    const key = scopeKey();
    if (key !== lastScope) {
      data.value = null;
      lastScope = key;
    }
    const hadData = data.value !== null;
    if (hadData) refreshBusy.value = true;
    else loading.value = true;
    error.value = null;
    const groupForFetch = productsGroupBy.value;
    try {
      const result = await fetchVentasDashboard(
        branchId.value, [dateRange.value[0], dateRange.value[1]], groupForFetch, controller.signal,
      );
      if (seq !== fullLoadSeq || !isActive.value || key !== scopeKey()) return;
      data.value = result;
    } catch (e) {
      if (seq !== fullLoadSeq || !isActive.value) return;
      error.value = e instanceof Error ? e.message : 'Error al cargar Ventas';
      data.value = null;
    } finally {
      if (seq === fullLoadSeq) {
        fullController = null;
        loading.value = false;
        refreshBusy.value = false;
      }
    }
    if (seq === fullLoadSeq && isActive.value && data.value && productsGroupBy.value !== groupForFetch) {
      void refreshProductsOnly();
    }
  }

  async function refreshProductsOnly() {
    if (!isActive.value || USE_VENTAS_MOCK || !data.value) return;
    productsController?.abort();
    const controller = new AbortController();
    productsController = controller;
    const seq = ++productsOnlySeq;
    const parentSeq = fullLoadSeq;
    const key = scopeKey();
    const group = productsGroupBy.value;
    try {
      const products = await fetchVentasProductsOnly(
        branchId.value, [dateRange.value[0], dateRange.value[1]], group, controller.signal,
      );
      if (seq !== productsOnlySeq || parentSeq !== fullLoadSeq || !isActive.value
          || key !== scopeKey() || productsGroupBy.value !== group || !data.value) return;
      data.value = { ...data.value, products };
    } catch {
      // A ranking-only error does not hide the remaining sales charts.
    } finally {
      if (seq === productsOnlySeq) productsController = null;
    }
  }

  watch([isActive, branchId, () => rangeKey(dateRange.value)], () => {
    if (isActive.value) void loadFull();
    else {
      cancelPending();
      data.value = null;
      loading.value = false;
      refreshBusy.value = false;
    }
  }, { immediate: true });
  watch(productsGroupBy, () => void refreshProductsOnly());
  return { data, loading, refreshBusy, error, refresh: loadFull };
}

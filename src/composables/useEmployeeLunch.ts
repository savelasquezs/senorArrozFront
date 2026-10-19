import { ref } from 'vue';
import { employeeLunchApi, type EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';

export function useEmployeeLunch() {
  const self = ref<EmployeeLunchState | null>(null);
  const error = ref('');
  const busy = ref(false);
  const uncertain = ref(false);
  const needsReconciliation = ref(false);
  const offset = ref(0);
  let generation = 0;
  async function refresh() {
    const current = ++generation;
    try {
      const result = await employeeLunchApi.me();
      if (current !== generation) return false;
      self.value = result;
      offset.value = Date.parse(result.serverTimeUtc) - Date.now();
      uncertain.value = false;
      error.value = '';
      if (!busy.value) needsReconciliation.value = false;
      return true;
    } catch (e) {
      if (current === generation) { error.value = (e as Error).message; uncertain.value = true; }
      return false;
    }
  }
  async function change(state: EmployeeLunchState, password: string, kitchen = false) {
    if (busy.value || uncertain.value) return false;
    busy.value = true;
    needsReconciliation.value = true;
    error.value = '';
    let saved = false;
    try { await employeeLunchApi.change(state, password, kitchen); saved = true; }
    catch (e) { error.value = (e as Error).message; }
    const failure = error.value;
    const confirmed = await refresh();
    if (confirmed) needsReconciliation.value = false;
    if (failure) error.value = failure;
    busy.value = false;
    return saved;
  }
  return { self, error, busy, uncertain, needsReconciliation, offset, refresh, change };
}

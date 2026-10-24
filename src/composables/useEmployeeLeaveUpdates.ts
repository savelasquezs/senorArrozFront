import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useSignalR } from './useSignalR';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { createSerialRefresh, type RefreshContext } from '@/utils/serialRefresh';

export interface EmployeeLeaveChange { publicId: string; version: number }
export interface EmployeeLeaveRefreshContext extends RefreshContext {
  reason: 'initial' | 'resync' | 'change' | 'manual';
  change?: EmployeeLeaveChange;
}
type Notice = Pick<EmployeeLeaveRefreshContext, 'reason' | 'change'>;

function parseChange(value: unknown): EmployeeLeaveChange | undefined {
  if (!value || typeof value !== 'object') return;
  const { publicId, version } = value as Partial<EmployeeLeaveChange>;
  if (typeof publicId === 'string' && publicId.length > 0
      && typeof version === 'number' && Number.isSafeInteger(version) && version > 0)
    return { publicId, version };
}

/** Owns initial loading and resynchronization; callers must not load again on mount. */
export function useEmployeeLeaveUpdates(
  refresh: (context: EmployeeLeaveRefreshContext) => void | Promise<void> = () => {},
  options: { acceptChange?: (change: EmployeeLeaveChange) => boolean } = {},
) {
  const store = useEmployeeLeavesStore();
  const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
  let alive = true, mounted = false;
  let next: Notice | undefined, lastChange: EmployeeLeaveChange | undefined;
  const queue = createSerialRefresh(async context => {
    const notice = next ?? { reason: 'resync' as const };
    next = undefined;
    await refresh({ ...context, ...notice });
  });
  function schedule(notice: Notice) {
    if (!alive) return Promise.resolve();
    // A pending full/manual read also covers intervening events; do not downgrade it to a hint.
    if (!next || notice.reason === 'manual'
        || next.reason !== 'manual' && notice.reason !== 'change'
        || next.reason === 'change') next = notice;
    return queue.request(true);
  }
  function background(notice: Notice) {
    void schedule(notice).catch(() => {
      // Views display their own errors. A failed callback must remain retryable.
      lastChange = undefined;
    });
  }
  function resync() {
    if (!alive || !mounted) return;
    void store.refreshSummary({ invalidate: true });
    background({ reason: 'resync' });
  }
  function changed(payload: unknown) {
    if (!alive || !mounted) return;
    const change = parseChange(payload);
    // Counters concern all authorized requests, even if the open detail is unrelated.
    void store.refreshSummary({ invalidate: true, change });
    if (change) {
      if (options.acceptChange && !options.acceptChange(change)) return;
      if (lastChange?.publicId === change.publicId && lastChange.version >= change.version) return;
      lastChange = change;
    }
    background(change ? { reason: 'change', change } : { reason: 'resync' });
  }
  const visible = () => { if (document.visibilityState === 'visible') resync(); };

  // Register during setup, BEFORE useSignalR's onMounted starts the shared connection.
  on('EmployeeLeaveChanged', changed);
  watch(connectionState, (value, previous) => {
    if (value === 'connected' && previous !== value) resync();
  }, { flush: 'sync' });
  onMounted(() => {
    mounted = true;
    document.addEventListener('visibilitychange', visible);
    void store.refreshSummary();
    background({ reason: 'initial' });
  });
  // If connection finishes before the queued initial read starts, both signals coalesce.
  // Otherwise keep a trailing read: the HTTP snapshot may predate the subscription.
  function cancel() { next = undefined; lastChange = undefined; queue.cancel(); }
  onBeforeUnmount(() => {
    alive = false;
    queue.dispose();
    off('EmployeeLeaveChanged', changed);
    document.removeEventListener('visibilitychange', visible);
  });
  return {
    refresh: () => { lastChange = undefined; return schedule({ reason: 'manual' }); },
    cancel,
  };
}

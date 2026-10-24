import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useAuthStore } from './auth';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import type { LeaveKind, LeaveSummary } from '@/types/employeeLeave';
import type { EmployeeLeaveChange } from '@/composables/useEmployeeLeaveUpdates';
import { createSerialRefresh } from '@/utils/serialRefresh';

export const useEmployeeLeavesStore = defineStore('employeeLeaves', () => {
  const auth = useAuthStore();
  const summary = ref<LeaveSummary>({ unread: 0, pendingReview: 0 });
  const kinds = ref<LeaveKind[]>([]), revision = ref(0);
  const isTerminal = computed(() => auth.user?.accountType === 'terminal');
  const canReview = computed(() => !isTerminal.value && (auth.isAdmin || auth.isSuperadmin));
  const sessionKey = computed(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.user?.accountType].join(':'));
  let generation = 0;
  let kindsPending: Promise<void> | undefined, kindsController: AbortController | undefined;
  // Bound event deduplication to the current session and a small recent working set.
  const eventVersions = new Map<string, number>();
  const summaryQueue = createSerialRefresh(async context => {
    if (!auth.isAuthenticated || isTerminal.value) return;
    const owner = sessionKey.value;
    const value = await employeeLeaveApi.summary(context.signal);
    if (context.isCurrent() && owner === sessionKey.value) summary.value = value;
  });
  function refreshSummary(options: { invalidate?: boolean; change?: EmployeeLeaveChange } = {}): Promise<void> {
    if (!auth.isAuthenticated || isTerminal.value) return Promise.resolve();
    if (options.change) {
      const { publicId, version } = options.change;
      if ((eventVersions.get(publicId) ?? 0) >= version)
        return (summaryQueue.pending ?? Promise.resolve()).catch(() => {});
      eventVersions.delete(publicId);
      eventVersions.set(publicId, version);
      if (eventVersions.size > 256) eventVersions.delete(eventVersions.keys().next().value!);
    }
    return summaryQueue.request(options.invalidate === true).catch(() => {
      eventVersions.clear(); // A failed request must not turn notifications into a permanent cache hit.
      // The counter never blocks navigation; visibility/manual refresh can retry.
    });
  }
  function loadKinds(): Promise<void> {
    if (kinds.value.length || !auth.isAuthenticated || isTerminal.value) return Promise.resolve();
    if (kindsPending) return kindsPending;
    const version = generation, controller = new AbortController();
    kindsController = controller;
    kindsPending = employeeLeaveApi.catalog(controller.signal).then(result => {
      if (version === generation && !controller.signal.aborted) kinds.value = result;
    }).finally(() => {
      if (version === generation) { kindsPending = undefined; kindsController = undefined; }
    });
    return kindsPending;
  }
  function invalidate() { revision.value++; void refreshSummary({ invalidate: true }); }
  watch(sessionKey, () => {
    const reloadCatalog = kinds.value.length > 0 || kindsPending !== undefined;
    generation++;
    summaryQueue.cancel();
    kindsController?.abort(); kindsController = undefined; kindsPending = undefined;
    eventVersions.clear();
    summary.value = { unread: 0, pendingReview: 0 }; kinds.value = []; revision.value++;
    void refreshSummary();
    // A mounted view still needs labels after a role/session change. Navigation alone does not load the catalog.
    if (reloadCatalog) void loadKinds().catch(() => {});
  }, { flush: 'sync' });
  onScopeDispose(() => { generation++; summaryQueue.dispose(); kindsController?.abort(); });
  return { summary, kinds, revision, isTerminal, canReview, sessionKey, refreshSummary, loadKinds, invalidate };
});

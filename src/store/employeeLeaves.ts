import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAuthStore } from './auth';
import { employeeLeaveApi } from '@/services/MainAPI/employeeLeaveApi';
import type { LeaveKind, LeaveSummary } from '@/types/employeeLeave';

export const useEmployeeLeavesStore = defineStore('employeeLeaves', () => {
  const auth = useAuthStore();
  const summary = ref<LeaveSummary>({ unread: 0, pendingReview: 0 });
  const kinds = ref<LeaveKind[]>([]), revision = ref(0);
  const isTerminal = computed(() => auth.user?.accountType === 'terminal');
  const canReview = computed(() => !isTerminal.value && (auth.isAdmin || auth.isSuperadmin));
  let pending: Promise<void> | undefined;
  let generation = 0;
  async function refreshSummary() {
    if (!auth.isAuthenticated || isTerminal.value) return;
    if (pending) return pending;
    const owner = auth.user?.id, version = generation;
    pending = employeeLeaveApi.summary().then(value => {
      if (version === generation && owner === auth.user?.id) summary.value = value;
    }).catch(() => { /* El contador no bloquea la navegación. */ })
      .finally(() => { if (version === generation) pending = undefined; });
    return pending;
  }
  async function loadKinds() {
    const version = generation;
    if (!kinds.value.length) { const result = await employeeLeaveApi.catalog(); if (version === generation) kinds.value = result; }
  }
  function invalidate() { revision.value++; void refreshSummary(); }
  watch(() => auth.user?.id, () => { generation++; pending = undefined; summary.value = { unread: 0, pendingReview: 0 }; kinds.value = []; revision.value++; });
  return { summary, kinds, revision, isTerminal, canReview, refreshSummary, loadKinds, invalidate };
});

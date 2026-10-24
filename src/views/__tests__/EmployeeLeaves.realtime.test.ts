import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick, type Ref } from 'vue';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/auth';
import type { LeaveDetail } from '@/types/employeeLeave';

const mocks = vi.hoisted(() => ({
  state: null as unknown as Ref<string>,
  route: null as unknown as { params: { publicId: string }; query: Record<string, string>; path: string },
  handlers: new Set<(payload: unknown) => void>(),
  api: { list: vi.fn(), detail: vi.fn(), history: vi.fn(), summary: vi.fn(), catalog: vi.fn(), read: vi.fn() },
}));
vi.mock('@/composables/useSignalR', async () => {
  const { ref } = await import('vue'); mocks.state = ref('connected');
  return { useSignalR: () => ({ connectionState: mocks.state,
    on: (_: string, handler: (value: unknown) => void) => mocks.handlers.add(handler),
    off: (_: string, handler: (value: unknown) => void) => mocks.handlers.delete(handler),
  }) };
});
vi.mock('vue-router', async () => {
  const original = await vi.importActual<typeof import('vue-router')>('vue-router');
  const { reactive } = await import('vue');
  mocks.route = reactive({ params: { publicId: 'A' }, query: {} as Record<string, string>, path: '/permisos' });
  return { ...original, useRoute: () => mocks.route, useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) };
});
vi.mock('@/store/auth', async () => {
  const { defineStore } = await import('pinia'); const { ref, computed } = await import('vue');
  return { useAuthStore: defineStore('test-view-leave-auth', () => {
    const user = ref<User | null>(null);
    return { user, isAuthenticated: computed(() => !!user.value), isAdmin: computed(() => user.value?.role === 'Admin'), isSuperadmin: computed(() => false) };
  }) };
});
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ options: [], selectedBranchId: 1 }) }));
vi.mock('@/services/MainAPI/employeeLeaveApi', () => ({ employeeLeaveApi: mocks.api }));
vi.mock('@/components/layout/MainLayout.vue', () => ({ default: { name: 'MainLayout', template: '<main><slot /></main>' } }));
vi.mock('@/components/users/EmployeeLeaveForm.vue', () => ({ default: { name: 'EmployeeLeaveForm', props: ['modelValue', 'detail'], emits: ['update:modelValue', 'saved'], template: '<div />' } }));
vi.mock('@/components/auth/PasswordConfirmation.vue', () => ({ default: { name: 'PasswordConfirmation', props: ['modelValue', 'description', 'action'], emits: ['update:modelValue'], template: '<div />' } }));
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import List from '../EmployeeLeavesView.vue';
import Detail from '../EmployeeLeaveDetailView.vue';
import Navigation from '@/components/layout/EmployeeLeaveNavigation.vue';

function snapshot(version = 1, id = 'A'): LeaveDetail {
  return { request: { publicId: id, version, userId: 8, branchId: 1, branchName: 'Test', applicantName: `Version ${version}`,
    applicantRole: 'Kitchen', kind: 'test', status: 'pending', startsAt: '2026-10-24T14:00:00Z', endsAt: '2026-10-24T15:00:00Z',
    createdAt: '2026-10-23T14:00:00Z', updatedAt: '2026-10-23T14:00:00Z', isUnread: false },
    documentNumber: null, justification: 'Synthetic test', isPaid: null, decisionReason: null, decidedAt: null, decidedByName: null,
    supportRequired: false, supportDueAt: null, supportStatus: 'not_required', returnedAt: null, returnVerifiedAt: null, verificationReason: null,
    canEdit: true, canReview: true, canCancel: true, canReturn: false, hasReviewer: true, attachments: [], evidenceRequirements: [] };
}
function page(version = 1) { return { items: [snapshot(version).request], totalCount: 1, totalPages: 1, page: 1, pageSize: 20 }; }
function history(pageNumber = 1) { return { items: [{ id: pageNumber, operation: 'created', actorName: `History ${pageNumber}`, reason: '', changedAt: '2026-10-23T14:00:00Z' }], totalPages: 3, page: pageNumber }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function event(id: string, version: number) { for (const callback of mocks.handlers) callback({ publicId: id, version }); }
let pinia: Pinia; const wrappers: VueWrapper[] = [];
const stubs = {
  MainLayout: { template: '<main><slot /></main>' }, RouterLink: { template: '<a><slot /></a>' },
  BaseButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
};
function render(component: typeof List | typeof Detail | typeof Navigation) {
  const wrapper = shallowMount(component, { global: { plugins: [pinia], stubs, renderStubDefaultSlot: true } });
  wrappers.push(wrapper); return wrapper;
}
async function openEditor(wrapper: VueWrapper) {
  await wrapper.findAll('button').find(button => button.text() === 'Modificar solicitud')!.trigger('click');
}
function visible() { vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); }

describe('leave views with real refresh coordinator and store', () => {
  beforeEach(() => {
    mocks.handlers.clear(); mocks.state.value = 'connected'; mocks.route.params.publicId = 'A'; mocks.route.query = { tab: 'review' };
    for (const mock of Object.values(mocks.api)) mock.mockReset();
    mocks.api.summary.mockResolvedValue({ unread: 0, pendingReview: 1 });
    mocks.api.catalog.mockResolvedValue([{ code: 'test', label: 'Test', paidByCompanyPolicy: false }]);
    mocks.api.list.mockResolvedValue(page()); mocks.api.detail.mockResolvedValue(snapshot()); mocks.api.history.mockResolvedValue(history()); mocks.api.read.mockResolvedValue(undefined);
    pinia = createPinia(); setActivePinia(pinia);
    useAuthStore().user = { id: 7, name: 'Test', email: 'test@example.invalid', phone: '', active: true, role: 'Admin', accountType: 'personal', branchId: 1, branchName: 'Test' };
  });
  afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); disposePinia(pinia); vi.restoreAllMocks(); });

  it('loads list and navigation once and shares their initial summary', async () => {
    render(Navigation); const wrapper = render(List); await flushPromises();
    expect(mocks.api.summary).toHaveBeenCalledTimes(1); expect(mocks.api.list).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Version 1');
  });
  it('list keeps one trailing read for an event burst during HTTP', async () => {
    const gate = deferred<ReturnType<typeof page>>(); mocks.api.list.mockReturnValueOnce(gate.promise).mockResolvedValue(page(3));
    const wrapper = render(List); await flushPromises();
    event('A', 2); event('A', 3); event('A', 3); await flushPromises(); expect(mocks.api.list).toHaveBeenCalledTimes(1);
    gate.resolve(page(1)); await flushPromises(); expect(mocks.api.list).toHaveBeenCalledTimes(2); expect(wrapper.text()).toContain('Version 3');
  });
  it('filters abort the old list and late results cannot overwrite the new query', async () => {
    const gate = deferred<ReturnType<typeof page>>(); mocks.api.list.mockReturnValueOnce(gate.promise).mockResolvedValue(page(2));
    const wrapper = render(List); await flushPromises(); const signal = mocks.api.list.mock.calls[0]![1] as AbortSignal;
    mocks.route.query = { tab: 'review', status: 'approved' }; await nextTick(); expect(signal.aborted).toBe(true);
    gate.resolve(page(1)); await flushPromises();
    expect(mocks.api.list.mock.calls[1]![0].status).toBe('approved'); expect(wrapper.text()).toContain('Version 2');
  });
  it('defers list changes while the creation form is open and loads when closed', async () => {
    const wrapper = render(List); await flushPromises(); const form = wrapper.findComponent({ name: 'EmployeeLeaveForm' });
    form.vm.$emit('update:modelValue', true); await nextTick(); event('A', 2); await flushPromises();
    expect(mocks.api.list).toHaveBeenCalledTimes(1);
    form.vm.$emit('update:modelValue', false); await flushPromises(); expect(mocks.api.list).toHaveBeenCalledTimes(2);
  });
  it('does not reload or block an editor for a different permission or an old version', async () => {
    const wrapper = render(Detail); await flushPromises(); await openEditor(wrapper);
    event('B', 5); event('A', 1); await flushPromises();
    expect(mocks.api.detail).toHaveBeenCalledTimes(1); expect(wrapper.text()).not.toContain('La solicitud cambió.');
  });
  it('marks only a newer matching event as conflict and preserves the draft until closing', async () => {
    const wrapper = render(Detail); await flushPromises(); await openEditor(wrapper);
    event('A', 2); await flushPromises();
    expect(wrapper.text()).toContain('La solicitud cambió.'); expect(mocks.api.detail).toHaveBeenCalledTimes(1);
    const form = wrapper.findComponent({ name: 'EmployeeLeaveForm' }); expect(form.props('detail').request.version).toBe(1);
    mocks.api.detail.mockResolvedValue(snapshot(2)); form.vm.$emit('update:modelValue', false); await flushPromises();
    expect(mocks.api.detail).toHaveBeenCalledTimes(2); expect(wrapper.text()).not.toContain('La solicitud cambió.');
  });
  it('visibility probes versions without falsely blocking or overwriting an open form', async () => {
    const wrapper = render(Detail); await flushPromises(); await openEditor(wrapper);
    visible(); await flushPromises(); expect(wrapper.text()).not.toContain('La solicitud cambió.'); expect(mocks.api.history).toHaveBeenCalledTimes(1);
    mocks.api.detail.mockResolvedValue(snapshot(2)); visible(); await flushPromises();
    expect(wrapper.text()).toContain('La solicitud cambió.');
    expect(wrapper.findComponent({ name: 'EmployeeLeaveForm' }).props('detail').request.version).toBe(1);
  });
  it('reconciles a change missed before the first SignalR connection', async () => {
    mocks.state.value = 'connecting'; const wrapper = render(Detail); await flushPromises();
    mocks.api.detail.mockResolvedValue(snapshot(2)); mocks.state.value = 'connected'; await flushPromises();
    expect(mocks.api.detail).toHaveBeenCalledTimes(2); expect(wrapper.text()).toContain('Version 2');
  });
  it('refreshes counters after a read marker that completed during a newer resync', async () => {
    let unread = 1; const gate = deferred<void>();
    mocks.api.summary.mockImplementation(async () => ({ unread, pendingReview: 0 }));
    mocks.api.detail.mockImplementation(async () => {
      const data = snapshot(); data.request.userId = 7; data.request.isUnread = unread > 0; return data;
    });
    mocks.api.read.mockImplementation(async () => { await gate.promise; unread = 0; });
    render(Detail); await flushPromises();
    expect(mocks.api.read).toHaveBeenCalledTimes(1); expect(useEmployeeLeavesStore().summary.unread).toBe(1);
    visible(); await flushPromises();
    expect(mocks.api.summary).toHaveBeenCalledTimes(2); expect(useEmployeeLeavesStore().summary.unread).toBe(1);
    gate.resolve(undefined); await flushPromises();
    expect(mocks.api.read).toHaveBeenCalledTimes(1); expect(mocks.api.detail).toHaveBeenCalledTimes(2);
    expect(mocks.api.summary).toHaveBeenCalledTimes(3); expect(useEmployeeLeavesStore().summary.unread).toBe(0);
  });
  it('a read marker completing after unmount does not start another counter request', async () => {
    const data = snapshot(); data.request.userId = 7; data.request.isUnread = true;
    const gate = deferred<void>(); mocks.api.detail.mockResolvedValue(data); mocks.api.read.mockReturnValue(gate.promise);
    const wrapper = render(Detail); await flushPromises();
    expect(mocks.api.read).toHaveBeenCalledTimes(1);
    const signal = mocks.api.read.mock.calls[0]![2] as AbortSignal;
    wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1); gate.resolve(undefined); await flushPromises();
    expect(signal.aborted).toBe(true); expect(mocks.api.summary).toHaveBeenCalledTimes(1);
  });
  it('unmount during detail prevents later history, read markers and queued reloads', async () => {
    const gate = deferred<LeaveDetail>(); mocks.api.detail.mockReturnValue(gate.promise);
    const wrapper = render(Detail); await flushPromises(); const signal = mocks.api.detail.mock.calls[0]![1] as AbortSignal;
    event('A', 2); wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1);
    const old = snapshot(); old.request.userId = 7; old.request.isUnread = true; gate.resolve(old); await flushPromises();
    expect(signal.aborted).toBe(true); expect(mocks.api.detail).toHaveBeenCalledTimes(1);
    expect(mocks.api.history).not.toHaveBeenCalled(); expect(mocks.api.read).not.toHaveBeenCalled();
  });
  it('unmount while history is pending never sends a subsequent read marker', async () => {
    const old = snapshot(); old.request.userId = 7; old.request.isUnread = true; mocks.api.detail.mockResolvedValue(old);
    const gate = deferred<ReturnType<typeof history>>(); mocks.api.history.mockReturnValue(gate.promise);
    const wrapper = render(Detail); await flushPromises(); wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1);
    gate.resolve(history()); await flushPromises(); expect(mocks.api.read).not.toHaveBeenCalled();
  });
  it('navigation cancels old detail and only fetches history for the new request', async () => {
    const gate = deferred<LeaveDetail>(); mocks.api.detail.mockReturnValueOnce(gate.promise).mockResolvedValue(snapshot(2, 'B'));
    const wrapper = render(Detail); await flushPromises(); const signal = mocks.api.detail.mock.calls[0]![1] as AbortSignal;
    mocks.route.params.publicId = 'B'; await nextTick(); expect(signal.aborted).toBe(true);
    gate.resolve(snapshot()); await flushPromises();
    expect(mocks.api.history).toHaveBeenCalledTimes(1); expect(mocks.api.history.mock.calls[0]![0]).toBe('B'); expect(wrapper.text()).toContain('Version 2');
  });
  it('history pagination rejects an out-of-order page response', async () => {
    const wrapper = render(Detail); await flushPromises();
    const older = deferred<ReturnType<typeof history>>(), newer = deferred<ReturnType<typeof history>>();
    mocks.api.history.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const vm = wrapper.vm as unknown as { loadHistory: (page: number) => Promise<void> };
    const first = vm.loadHistory(2), second = vm.loadHistory(3);
    newer.resolve(history(3)); await second; older.resolve(history(2)); await first; await nextTick();
    expect(wrapper.text()).toContain('History 3'); expect(wrapper.text()).not.toContain('History 2');
  });
});

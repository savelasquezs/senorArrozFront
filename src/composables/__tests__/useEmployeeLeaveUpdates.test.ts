import { defineComponent, h, nextTick, type Ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmployeeLeaveRefreshContext } from '../useEmployeeLeaveUpdates';

const mocks = vi.hoisted(() => ({
  state: null as unknown as Ref<string>, on: vi.fn(), off: vi.fn(), summary: vi.fn(),
  trace: [] as string[], connectOnMount: false,
}));
vi.mock('@/composables/useSignalR', async () => {
  const { ref, onMounted } = await import('vue');
  mocks.state = ref('connecting');
  return { useSignalR: () => {
    onMounted(() => { mocks.trace.push('connect'); if (mocks.connectOnMount) mocks.state.value = 'connected'; });
    return { on: mocks.on, off: mocks.off, connectionState: mocks.state };
  } };
});
vi.mock('@/store/employeeLeaves', () => ({ useEmployeeLeavesStore: () => ({ refreshSummary: mocks.summary }) }));
import { useEmployeeLeaveUpdates } from '../useEmployeeLeaveUpdates';

let wrapper: VueWrapper | undefined;
let controls: ReturnType<typeof useEmployeeLeaveUpdates>;
function mountUpdates(refresh: (context: EmployeeLeaveRefreshContext) => void | Promise<void> = vi.fn(),
  acceptChange?: (change: { publicId: string; version: number }) => boolean) {
  wrapper = mount(defineComponent({ setup() {
    controls = useEmployeeLeaveUpdates(refresh, { acceptChange }); return () => h('div');
  } }));
}
function event(value: unknown) { mocks.on.mock.calls.find(([name]) => name === 'EmployeeLeaveChanged')![1](value); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

describe('employee leave synchronized updates', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.trace.length = 0; mocks.connectOnMount = false; mocks.state.value = 'connecting';
    mocks.on.mockImplementation(() => { mocks.trace.push('subscribe'); });
    mocks.summary.mockResolvedValue(undefined);
  });
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); });

  it('registers handlers before connection start and performs one initial read on a ready hub', async () => {
    mocks.connectOnMount = true; const refresh = vi.fn(); mountUpdates(refresh); await flushPromises();
    expect(mocks.trace).toEqual(['subscribe', 'connect']); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('coalesces first connection with an initial read that has not started yet', async () => {
    const refresh = vi.fn(); mountUpdates(refresh); mocks.state.value = 'connected'; await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('resynchronizes when the HTTP snapshot completed before the first connection', async () => {
    let serverVersion = 1, shown = 0;
    mountUpdates(() => { shown = serverVersion; }); await flushPromises();
    expect(shown).toBe(1); serverVersion = 2; mocks.state.value = 'connected'; await flushPromises();
    expect(shown).toBe(2);
  });
  it('queues one fresh read if connection completes during the initial request', async () => {
    const gate = deferred(); let calls = 0, shown = 0;
    mountUpdates(async context => { const version = ++calls; if (version === 1) await gate.promise; if (context.isCurrent()) shown = version; });
    await flushPromises(); mocks.state.value = 'connected'; await nextTick(); expect(calls).toBe(1);
    gate.resolve(); await flushPromises(); expect(calls).toBe(2); expect(shown).toBe(2);
  });
  it('resynchronizes on reconnection and recovery from an initial failure', async () => {
    const refresh = vi.fn(); mountUpdates(refresh); await flushPromises();
    mocks.state.value = 'error'; mocks.state.value = 'connecting'; mocks.state.value = 'connected'; await flushPromises();
    mocks.state.value = 'reconnecting'; mocks.state.value = 'connected'; await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(3);
  });
  it('passes the change ID/version and ignores duplicate or older notifications', async () => {
    mocks.state.value = 'connected'; const refresh = vi.fn(); mountUpdates(refresh); await flushPromises();
    event({ publicId: 'A', version: 3 }); await flushPromises();
    event({ publicId: 'A', version: 3 }); event({ publicId: 'A', version: 2 }); await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh.mock.calls[1]![0]).toMatchObject({ reason: 'change', change: { publicId: 'A', version: 3 } });
  });
  it('ignores unrelated detail changes but still updates global counters', async () => {
    const refresh = vi.fn(); mountUpdates(refresh, change => change.publicId === 'A' && change.version > 1); await flushPromises();
    event({ publicId: 'B', version: 4 }); event({ publicId: 'A', version: 1 }); await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(1); expect(mocks.summary).toHaveBeenCalledTimes(3);
  });
  it('collapses bursts during a refresh without dropping the newest change', async () => {
    const gate = deferred(); let calls = 0; const notices: EmployeeLeaveRefreshContext[] = [];
    mountUpdates(async context => { notices.push(context); if (++calls === 1) await gate.promise; }); await flushPromises();
    event({ publicId: 'A', version: 2 }); event({ publicId: 'A', version: 3 }); event({ publicId: 'A', version: 3 });
    gate.resolve(); await flushPromises();
    expect(calls).toBe(2); expect(notices[1]!.change?.version).toBe(3);
  });
  it('only resynchronizes visibility when the tab becomes visible', async () => {
    const refresh = vi.fn(); mountUpdates(refresh); await flushPromises();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange')); await flushPromises(); expect(refresh).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange')); await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(2); expect(refresh.mock.calls[1]![0].reason).toBe('resync');
  });
  it('falls back to resynchronization for malformed notifications', async () => {
    const refresh = vi.fn(); mountUpdates(refresh); await flushPromises(); event({ version: 'bad' }); await flushPromises();
    expect(refresh.mock.calls[1]![0].reason).toBe('resync');
  });
  it('stops pending continuations and cleans handlers on unmount', async () => {
    const gate = deferred(); let continued = 0, signal: AbortSignal | undefined;
    mountUpdates(async context => { signal = context.signal; await gate.promise; if (context.isCurrent()) continued++; });
    await flushPromises(); event({ publicId: 'A', version: 2 });
    const handler = mocks.on.mock.calls[0]![1]; const remove = vi.spyOn(document, 'removeEventListener');
    wrapper!.unmount(); wrapper = undefined; gate.resolve(); await flushPromises();
    expect(signal?.aborted).toBe(true); expect(continued).toBe(0);
    expect(mocks.off).toHaveBeenCalledWith('EmployeeLeaveChanged', handler);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    const count = mocks.summary.mock.calls.length; handler({ publicId: 'A', version: 3 });
    expect(mocks.summary).toHaveBeenCalledTimes(count);
  });
  it('retries after synchronous errors and supports an explicit refresh', async () => {
    const refresh = vi.fn().mockImplementationOnce(() => { throw new Error('temporary'); }).mockResolvedValue(undefined);
    mountUpdates(refresh); await flushPromises(); await controls.refresh();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createSerialRefresh, type RefreshContext } from '../serialRefresh';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
describe('serialized refresh queue', () => {
  it('coalesces invalidations before the read starts', async () => {
    const run = vi.fn(); const queue = createSerialRefresh(run);
    const first = queue.request();
    expect(queue.request(true)).toBe(first);
    expect(queue.request(true)).toBe(first);
    await first;
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('shares ordinary readers already in flight', async () => {
    const gate = deferred(), run = vi.fn(() => gate.promise), queue = createSerialRefresh(run);
    const first = queue.request(); await Promise.resolve();
    expect(queue.request()).toBe(first);
    gate.resolve(); await first;
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('retains one trailing read for a burst arriving during a read', async () => {
    const gate = deferred(); let calls = 0, applied = 0;
    const queue = createSerialRefresh(async context => {
      calls++; if (calls === 1) await gate.promise;
      if (context.isCurrent()) applied = calls;
    });
    const first = queue.request(); await Promise.resolve();
    for (let i = 0; i < 10; i++) queue.request(true);
    expect(calls).toBe(1);
    gate.resolve(); await first;
    expect(calls).toBe(2); expect(applied).toBe(2);
  });
  it('can retry after a synchronous failure', async () => {
    const run = vi.fn().mockImplementationOnce(() => { throw new Error('temporary'); }).mockResolvedValue(undefined);
    const queue = createSerialRefresh(run);
    await expect(queue.request()).rejects.toThrow('temporary');
    await queue.request(); expect(run).toHaveBeenCalledTimes(2);
  });
  it('does not lose a trailing read when the obsolete attempt fails', async () => {
    const gate = deferred(); let calls = 0;
    const queue = createSerialRefresh(async () => { if (++calls === 1) { await gate.promise; throw new Error('obsolete'); } });
    const pending = queue.request(); await Promise.resolve(); queue.request(true);
    gate.resolve(); await expect(pending).resolves.toBeUndefined(); expect(calls).toBe(2);
  });
  it('cancel aborts the old scope but permits a new request', async () => {
    const gate = deferred(); const contexts: RefreshContext[] = [];
    const queue = createSerialRefresh(async context => { contexts.push(context); if (contexts.length === 1) await gate.promise; });
    const first = queue.request(); await Promise.resolve(); queue.cancel();
    expect(contexts[0]!.signal.aborted).toBe(true); expect(contexts[0]!.isCurrent()).toBe(false);
    const next = queue.request(); gate.resolve(); await Promise.all([first, next]);
    expect(contexts).toHaveLength(2); expect(contexts[1]!.isCurrent()).toBe(true);
  });
  it('dispose stops follow-up work and makes late responses stale', async () => {
    const gate = deferred(); let count = 0, applied = false;
    const queue = createSerialRefresh(async context => { count++; await gate.promise; applied = context.isCurrent(); });
    const first = queue.request(); await Promise.resolve(); queue.request(true); queue.dispose();
    gate.resolve(); await first; await queue.request();
    expect(count).toBe(1); expect(applied).toBe(false);
  });
  it('dispose before the scheduled read does not invoke the callback', async () => {
    const run = vi.fn(), queue = createSerialRefresh(run);
    const pending = queue.request(); queue.dispose(); await pending;
    expect(run).not.toHaveBeenCalled();
  });
  it('a consumer can start a new read immediately on settlement', async () => {
    const run = vi.fn(), queue = createSerialRefresh(run);
    await queue.request().then(() => queue.request());
    expect(run).toHaveBeenCalledTimes(2);
  });
});

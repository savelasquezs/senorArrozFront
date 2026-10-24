export interface RefreshContext {
  signal: AbortSignal;
  isCurrent: () => boolean;
}

/** Shares reads, but retains one trailing read when a newer invalidation arrives. */
export function createSerialRefresh(run: (context: RefreshContext) => void | Promise<void>) {
  let pending: Promise<void> | undefined;
  let dirty = false, disposed = false, cancelled = false, revision = 0;
  let controller: AbortController | undefined;

  function request(invalidate = false): Promise<void> {
    if (disposed) return Promise.resolve();
    if (!pending || invalidate || cancelled) { revision++; dirty = true; cancelled = false; }
    if (pending) return pending;
    pending = new Promise<void>((resolve, reject) => {
      queueMicrotask(async () => {
        let failure: unknown, failed = false;
        while (dirty && !disposed) {
          dirty = false;
          const version = revision, current = new AbortController();
          controller = current;
          const isCurrent = () => !disposed && !current.signal.aborted && version === revision;
          failed = false;
          try { await run({ signal: current.signal, isCurrent }); }
          catch (error) { if (isCurrent()) { failure = error; failed = true; } }
          finally { if (controller === current) controller = undefined; }
        }
        // Clear synchronously before settling: a subscriber may request another read on resolution.
        pending = undefined;
        if (failed) reject(failure); else resolve();
      });
    });
    return pending;
  }
  function cancel() { revision++; dirty = false; cancelled = true; controller?.abort(); }
  function dispose() { disposed = true; cancel(); }
  return { request, cancel, dispose, get pending() { return pending; } };
}

import { createSerialRefresh, type RefreshContext } from './serialRefresh'

/** One inbox read per burst, plus a fresh read for invalidations received during it. */
export function createWhatsAppRoutingRefresh(reload: (context: RefreshContext) => Promise<void>) {
  let queue = createSerialRefresh(reload)
  let scope = '', disposed = false

  function cancel() {
    queue.dispose()
    if (!disposed) queue = createSerialRefresh(reload)
  }

  return {
    invalidate: (nextScope = '') => {
      if (disposed) return Promise.resolve()
      // A new filter/session must not wait for an obsolete request to finish.
      if (nextScope !== scope) { cancel(); scope = nextScope }
      return queue.request(true)
    },
    cancel,
    dispose: () => { disposed = true; queue.dispose() },
  }
}

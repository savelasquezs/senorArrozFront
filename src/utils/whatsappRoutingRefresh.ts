import { createSerialRefresh } from './serialRefresh'

/**
 * Routing events can arrive together or while the inbox is being fetched.
 * Share one read per burst and perform one trailing read for events received
 * during the active HTTP request, so the final list reflects the last event.
 */
export function createWhatsAppRoutingRefresh(reload: () => Promise<void>) {
  const queue = createSerialRefresh(async () => {
    await reload()
  })

  return {
    invalidate: () => queue.request(true),
    dispose: () => queue.dispose(),
  }
}

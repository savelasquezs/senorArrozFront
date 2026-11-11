/**
 * Ready-order snapshots are only rendered on the Available tab. SignalR is still
 * subscribed on the other tabs, but returning to Available already triggers a
 * fresh read through the DeliveryView active-tab watcher.
 */
export type DeliveryTab = 'available' | 'preparation' | 'analytics' | 'routing' | 'route'

export function refreshAvailableOrdersIfVisible(
    activeTab: DeliveryTab,
    refresh: () => Promise<void>,
): Promise<void> {
    return activeTab === 'available' ? refresh() : Promise.resolve()
}

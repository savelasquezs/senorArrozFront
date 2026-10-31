import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { customerApi } from '@/services/MainAPI/customerApi'
import type { Customer, CustomerAddress } from '@/types/customer'
import type { DraftOrder } from '@/types/order'

/** A display snapshot only: it does not revalidate coverage or change persisted order fees. */
export function buildDraftCustomerSnapshot(customerId: number, drafts: DraftOrder[]): Customer | null {
    const matching = drafts.filter(order => order.customerId === customerId)
    const first = matching[0]
    if (!first) return null
    const addresses = new Map<number, CustomerAddress>()
    for (const order of matching) {
        if (!order.addressId || addresses.has(order.addressId)) continue
        addresses.set(order.addressId, {
            id: order.addressId, customerId, neighborhoodId: 0,
            address: order.addressDescription ?? '', additionalInfo: order.addressAdditionalInfo ?? undefined,
            isPrimary: addresses.size === 0, createdAt: '', updatedAt: '', deliveryFee: order.deliveryFee ?? 0,
        })
    }
    return { id: customerId, name: first.customerName ?? 'Cliente', phone1: first.customerPhone ?? '',
        branchId: 0, active: true, createdAt: '', updatedAt: '', addresses: [...addresses.values()] }
}

/** Owned by the store scope, not by a screen: navigation alone must not destroy drafts. */
export function useDraftCustomerHydration(
    drafts: Ref<Map<string, DraftOrder>>, customers: Ref<Customer[]>, branch: Readonly<Ref<number | null>>,
) {
    const auth = useAuthStore()
    const customerHydrationPending = ref(false)
    const provisionalIds = ref(new Set<number>())
    const failedIds = ref(new Set<number>())
    const identity = computed(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.user?.accountType].join(':'))
    const ids = computed(() => [...new Set([...drafts.value.values()].map(order => order.customerId)
        .filter((id): id is number => id != null && Number.isInteger(id) && id > 0))])
    const customerHydrationIncomplete = computed(() => ids.value.some(id => failedIds.value.has(id)
        || provisionalIds.value.has(id) || !customers.value.some(customer => customer.id === id)))
    let generation = 0, disposed = false
    let controller: AbortController | undefined
    let pending: Promise<void> | undefined

    function invalidate() {
        generation++
        controller?.abort(); controller = undefined; pending = undefined
        customerHydrationPending.value = false
    }
    watch(identity, () => {
        invalidate()
        customers.value = []
        provisionalIds.value.clear(); failedIds.value.clear()
    }, { flush: 'sync' })
    watch(branch, invalidate, { flush: 'sync' })
    watch([() => drafts.value, () => [...ids.value].sort((a, b) => a - b).join(',')], () => {
        const resume = customerHydrationPending.value
        invalidate()
        const version = generation
        for (const id of failedIds.value) if (!ids.value.includes(id)) failedIds.value.delete(id)
        for (const id of provisionalIds.value) if (!ids.value.includes(id)) provisionalIds.value.delete(id)
        if (resume) queueMicrotask(() => { if (generation === version) void rehydrateCustomersFromDrafts() })
    }, { flush: 'sync' })
    onScopeDispose(() => { disposed = true; invalidate() })

    function rehydrateCustomersFromDrafts(): Promise<void> {
        if (disposed || !auth.user || !ids.value.length) return Promise.resolve()
        if (pending) return pending
        const version = ++generation, owner = identity.value, scope = branch.value, originalDrafts = drafts.value
        const request = new AbortController(); controller = request
        customerHydrationPending.value = true
        const isCurrent = (id: number) => !disposed && !request.signal.aborted && version === generation
            && owner === identity.value && scope === branch.value && originalDrafts === drafts.value && ids.value.includes(id)
        const reads = ids.value.map(async id => {
            const previous = customers.value.find(customer => customer.id === id)
            const previousSnapshot = JSON.stringify(previous)
            const unchanged = () => {
                const now = customers.value.find(customer => customer.id === id)
                return now === previous && JSON.stringify(now) === previousSnapshot
            }
            const apply = (customer: Customer, provisional: boolean) => {
                if (!isCurrent(id) || !unchanged()) return
                customers.value = previous
                    ? customers.value.map(value => value.id === id ? customer : value)
                    : [customer, ...customers.value]
                if (provisional) provisionalIds.value.add(id)
                else { provisionalIds.value.delete(id); failedIds.value.delete(id) }
            }
            try {
                const response = await customerApi.getCustomerById(id, request.signal)
                if (!isCurrent(id)) return
                const customer = response.isSuccess ? response.data : null
                if (!customer || customer.id !== id || !customer.active) {
                    failedIds.value.add(id)
                    if (unchanged()) customers.value = customers.value.filter(value => value.id !== id)
                    return
                }
                let result = customer
                // [] is complete; omitted or malformed legacy fields require a separate read.
                if (!Array.isArray(customer.addresses)) {
                    const addresses = await customerApi.getCustomerAddresses(id, request.signal)
                    if (!isCurrent(id)) return
                    if (!addresses.isSuccess || !Array.isArray(addresses.data)) throw new Error('Incomplete addresses')
                    result = { ...customer, addresses: addresses.data }
                }
                apply(result, false)
            } catch (error) {
                if (!isCurrent(id)) return // cancellation never creates a fallback
                failedIds.value.add(id)
                const status = (error as { status?: number }).status
                if (status != null && status >= 400 && status < 500) {
                    // Never reconstruct a customer that the current server denied or removed.
                    if (unchanged()) customers.value = customers.value.filter(value => value.id !== id)
                    return
                }
                if (previous && !provisionalIds.value.has(id)) return
                const snapshot = buildDraftCustomerSnapshot(id, [...drafts.value.values()])
                if (snapshot) apply(snapshot, true)
            }
        })
        const work = Promise.all(reads).then(() => {}).finally(() => {
            if (pending === work) { pending = undefined; controller = undefined; customerHydrationPending.value = false }
        })
        pending = work
        return work
    }
    return { rehydrateCustomersFromDrafts, customerHydrationPending, customerHydrationIncomplete }
}

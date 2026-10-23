import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useInvoiceResources } from './useInvoiceResources'
import type { BillingRecipient } from '@/types/electronicInvoicing'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { useAuthStore } from '@/store/auth'

export const billingRecipientEvent = 'senorarroz:billing-recipient-updated'

export function useBillingDirectory(active: () => boolean) {
    const query = ref(''), results = ref<BillingRecipient[]>([]), loading = ref(false), error = ref('')
    const page = ref(1), totalPages = ref(0), searched = ref(false), auth = useAuthStore()
    let generation = 0, timer: ReturnType<typeof setTimeout> | undefined
    async function search(targetPage = 1) {
        const current = ++generation, term = query.value.trim()
        if (!active() || term.length < 2) return
        loading.value = true; error.value = ''; results.value = []
        try {
            const response = await api.searchRecipients(term, targetPage)
            if (current !== generation) return
            results.value = response.data?.items ?? []; totalPages.value = response.data?.totalPages ?? 0; page.value = targetPage; searched.value = true
        } catch (e) { if (current === generation) error.value = (e as Error).message }
        finally { if (current === generation) loading.value = false }
    }
    watch(() => [query.value, active(), auth.token], () => {
        generation++; clearTimeout(timer); results.value = []; error.value = ''; searched.value = false; loading.value = false; page.value = 1; totalPages.value = 0
        if (active() && query.value.trim().length >= 2) timer = setTimeout(() => { void search() }, 250)
    })
    onUnmounted(() => { generation++; clearTimeout(timer) })
    return { query, results, loading, error, page, totalPages, searched, search }
}

export function useBillingRecipients(customerId: () => number | null | undefined) {
    const resources = useInvoiceResources()
    const recipients = ref<BillingRecipient[]>([]) as Ref<BillingRecipient[]>
    const error = ref('')
    const loading = ref(false)
    let generation = 0
    async function load(force = true) {
        const id = customerId(), current = ++generation
        error.value = ''
        if (!id) { recipients.value = []; loading.value = false; return }
        loading.value = true
        try {
            const result = await resources.loadRecipients(id, force)
            if (current === generation) recipients.value = result
        } catch (e) { if (current === generation) error.value = (e as Error).message }
        finally { if (current === generation) loading.value = false }
    }
    function updated(event: Event) {
        if ((event as CustomEvent<number>).detail === customerId()) void load()
    }
    watch(customerId, () => { recipients.value = []; void load(false) }, { immediate: true })
    watch(() => resources.recipients[customerId() ?? 0], values => { recipients.value = values ?? [] })
    onMounted(() => window.addEventListener(billingRecipientEvent, updated))
    onUnmounted(() => { generation++; window.removeEventListener(billingRecipientEvent, updated) })
    return { recipients, error, loading, load }
}

export function billingRecipientComplete(recipient?: BillingRecipient | null) {
    return !!recipient?.documentType && !recipient.needsReview && /^[A-Za-z0-9-]+$/.test(recipient.identification) && !!recipient.name.trim()
        && (!recipient.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email))
}

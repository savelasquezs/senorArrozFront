import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useInvoiceResources } from './useInvoiceResources'
import type { BillingRecipient } from '@/types/electronicInvoicing'

export const billingRecipientEvent = 'senorarroz:billing-recipient-updated'

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
    return !!recipient?.documentType && /^[A-Za-z0-9-]+$/.test(recipient.identification) && !!recipient.name.trim()
        && (!recipient.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email))
}

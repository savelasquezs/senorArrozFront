import { onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/store/auth'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import type { BillingRecipient, InvoiceDocument } from '@/types/electronicInvoicing'

export interface InvoiceJob {
    orderId: number
    documentId?: number
    document?: InvoiceDocument
    phase: 'saving' | 'tracking' | 'downloading' | 'done' | 'error'
    error: string
    downloadError: boolean
    nextCheck: number
}

export const useInvoiceTracking = defineStore('invoiceTracking', () => {
    const auth = useAuthStore()
    const jobs = ref<InvoiceJob[]>([])
    const pending = new Set<number>()
    let controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    function reset() {
        controller.abort()
        controller = new AbortController()
        clearTimeout(timer)
        jobs.value = []
        pending.clear()
    }
    watch(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.isAuthenticated].join(':'), reset, { flush: 'sync' })
    onScopeDispose(reset)

    function schedule() {
        clearTimeout(timer)
        const active = jobs.value.filter(job => job.phase === 'tracking' && !pending.has(job.orderId))
        if (!active.length) return
        timer = setTimeout(() => {
            for (const job of active) if (job.nextCheck <= Date.now()) void refresh(job.orderId)
            schedule()
        }, Math.max(0, Math.min(...active.map(job => job.nextCheck)) - Date.now()))
    }

    function track(orderId: number, documentId?: number, phase: InvoiceJob['phase'] = 'tracking') {
        const existing = jobs.value.find(job => job.orderId === orderId)
        if (existing) {
            if (existing.phase === 'error' && documentId) {
                existing.documentId = documentId; existing.phase = phase; existing.error = ''; existing.nextCheck = Date.now()
                schedule()
            }
            return existing
        }
        jobs.value.unshift({ orderId, documentId, phase, error: '', downloadError: false, nextCheck: Date.now() })
        const job = jobs.value[0]!
        schedule()
        return job
    }

    async function download(orderId: number) {
        const job = jobs.value.find(job => job.orderId === orderId)
        const d = job?.document
        if (!job || !d?.hasPdf || !['issued', 'credited'].includes(d.status) || job.phase === 'downloading') return
        const signal = controller.signal
        job.phase = 'downloading'; job.error = ''; job.downloadError = false
        try {
            await api.download(d.id, 'pdf', `${d.prefix}${d.number ?? ''}`, { branchScope: 'none', signal })
            if (!signal.aborted) job.phase = 'done'
        } catch (error) {
            if (signal.aborted || !jobs.value.includes(job)) return
            job.phase = 'error'; job.downloadError = true
            job.error = (error as Error).message || 'No pudimos descargar el PDF. Intenta de nuevo.'
        }
        schedule()
    }

    async function refresh(orderId: number) {
        const job = jobs.value.find(job => job.orderId === orderId)
        if (!job || pending.has(orderId) || ['saving', 'downloading', 'done'].includes(job.phase)) return
        const signal = controller.signal
        pending.add(orderId)
        try {
            const result = await api.documents(orderId, { branchScope: 'none', signal })
            if (signal.aborted || !jobs.value.includes(job)) return
            const d = result.data?.find(d => d.kind === 'invoice' && (job.documentId ? d.id === job.documentId : d.status !== 'credited' && d.status !== 'cancelled'))
            if (!d && job.phase === 'error') {
                job.error = 'No encontramos una solicitud confirmada. Revisa el pedido antes de emitir.'
                return
            }
            job.error = ''; job.downloadError = false; job.phase = 'tracking'
            if (d) {
                job.document = d; job.documentId = d.id
                if (['rejected', 'cancelled'].includes(d.status)) {
                    job.phase = 'error'
                    job.error = d.lastError || (d.status === 'rejected' ? 'La factura requiere revisión.' : 'La solicitud fue cancelada.')
                } else if (['issued', 'credited'].includes(d.status) && d.hasPdf) {
                    await download(orderId)
                }
            }
            job.nextCheck = Date.now() + (d?.status === 'scheduled' ? 30000 : 3000)
        } catch (error) {
            if (signal.aborted) return
            job.phase = 'tracking'
            job.error = 'No pudimos consultar el avance. Volveremos a intentarlo.'
            job.nextCheck = Date.now() + 10000
        } finally {
            if (!signal.aborted) { pending.delete(orderId); schedule() }
        }
    }

    async function requestInvoice(orderId: number, recipient: BillingRecipient) {
        const existing = jobs.value.find(job => job.orderId === orderId)
        if (existing && !['done', 'error'].includes(existing.phase)) return
        if (existing) dismiss(orderId)
        const job = track(orderId, undefined, 'saving')
        const signal = controller.signal
        try {
            const result = await api.request(orderId, recipient)
            if (signal.aborted) return
            job.documentId = result.data?.id
            job.phase = 'tracking'
            await refresh(orderId)
        } catch (error) {
            if (signal.aborted) return
            job.phase = 'error'
            job.error = (error as Error).message || 'No pudimos confirmar la solicitud. Consulta el estado antes de volver a emitir.'
            throw error
        }
    }

    function dismiss(orderId: number) {
        const job = jobs.value.find(job => job.orderId === orderId)
        if (!job || !['done', 'error'].includes(job.phase) || pending.has(orderId)) return
        jobs.value = jobs.value.filter(job => job.orderId !== orderId)
        schedule()
    }

    return { jobs, track, requestInvoice, refresh, download, dismiss }
})

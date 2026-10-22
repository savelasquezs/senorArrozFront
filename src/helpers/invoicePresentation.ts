import type { BillingRecipient } from '@/types/electronicInvoicing'

export function invoiceRecipient(snapshot: string): BillingRecipient | null {
    try {
        const value = JSON.parse(snapshot)
        if (!value || typeof value !== 'object') return null
        return { documentType: value.documentType ?? value.DocumentType, identification: value.identification ?? value.Identification ?? '', name: value.name ?? value.Name ?? '', email: value.email ?? value.Email ?? null }
    } catch { return null }
}

export function invoiceStatusClass(status: string) {
    if (status === 'issued') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    if (status === 'rejected') return 'bg-red-50 text-red-800 ring-red-200'
    if (['pending', 'processing', 'verifying', 'scheduled'].includes(status)) return 'bg-amber-50 text-amber-900 ring-amber-200'
    return 'bg-slate-100 text-slate-700 ring-slate-200'
}

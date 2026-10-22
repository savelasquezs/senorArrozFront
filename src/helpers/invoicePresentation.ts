import type { BillingRecipient, InvoiceDocument } from '@/types/electronicInvoicing'
import type { OrderDetailView } from '@/types/order'

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

export function invoiceProgress(d: InvoiceDocument) {
    const validated = ['issued', 'credited'].includes(d.status)
    const hasEmail = !!invoiceRecipient(d.recipientJson)?.email
    return [
        { label: 'Solicitud guardada', state: d.status === 'cancelled' ? 'muted' : 'done', date: d.createdAt },
        { label: 'Transmisión a Plemsi', state: validated || d.dianRejected ? 'done' : d.status === 'rejected' ? 'error' : d.submittedAt || ['processing', 'verifying'].includes(d.status) ? 'active' : 'pending', date: d.submittedAt },
        { label: 'Validada DIAN', state: validated ? 'done' : d.dianRejected ? 'error' : 'pending', date: d.issuedAt },
        { label: hasEmail ? d.emailStatus === 'accepted' ? 'Correo aceptado por Plemsi' : 'Envío de correo' : 'Sin correo', state: !hasEmail ? 'muted' : d.emailStatus === 'accepted' ? 'done' : validated ? 'active' : 'pending', date: undefined },
    ]
}

export interface InvoiceOrderSummary {
    id: number
    total: number
    delivery: number
    lines: { name: string; quantity: number; unitPrice: number; discount: number; notes?: string | null }[]
    payments: { label: string; amount: number }[]
    balance: number
    notes?: string | null
    branch?: string
    type?: string
    createdAt?: string
}

export function invoiceOrderSummary(order: OrderDetailView): InvoiceOrderSummary {
    const deposits = order.reservationDeposits ?? []
    const payments = [
        ...(order.bankPayments ?? []).filter(p => !p.sourceReservationDepositId).map(p => ({ label: p.bankName || 'Transferencia bancaria', amount: p.amount })),
        ...(order.appPayments ?? []).map(p => ({ label: p.appName || 'Aplicación', amount: p.amount })),
        ...deposits.map(p => ({ label: `Anticipo · ${p.isEffective ? 'Efectivo' : p.bankName || p.appName || 'Transferencia'}`, amount: p.amount })),
    ]
    if (!deposits.length && order.totalDeposited > 0) payments.push({ label: 'Anticipos registrados', amount: order.totalDeposited })
    const cash = order.paidInStoreCashAmount ?? (order.paidInStoreCash ? Math.max(0, order.total - payments.reduce((sum, p) => sum + p.amount, 0)) : 0)
    if (cash > 0) payments.push({ label: 'Efectivo en caja', amount: cash })
    return { id: order.id, total: order.total, delivery: order.deliveryFee ?? 0,
        lines: (order.orderDetails ?? []).map(p => ({ name: p.productName, quantity: p.quantity, unitPrice: p.unitPrice, discount: p.discount, notes: p.notes })),
        payments, balance: Math.max(0, order.total - payments.reduce((sum, p) => sum + p.amount, 0)), notes: order.notes,
        branch: order.branchName, type: order.typeDisplayName, createdAt: order.createdAt }
}

export function invoiceSnapshotSummary(snapshot?: string): InvoiceOrderSummary | null {
    try {
        const data = JSON.parse(snapshot ?? '{}').order
        if (!data?.lines || !Number.isFinite(data.Total)) return null
        const payments = [
            ...(data.bankPayments ?? []).filter((p: { SourceReservationDepositId?: number }) => !p.SourceReservationDepositId).map((p: { Amount: number }) => ({ label: 'Transferencia bancaria', amount: p.Amount })),
            ...(data.appPayments ?? []).map((p: { Amount: number }) => ({ label: 'Aplicación', amount: p.Amount })),
            ...(data.deposits ?? []).map((p: { IsEffective: boolean; Amount: number }) => ({ label: p.IsEffective ? 'Anticipo en efectivo' : 'Anticipo por transferencia', amount: p.Amount })),
        ]
        if (data.PaidInStoreCashAmount > 0) payments.push({ label: 'Efectivo en caja', amount: data.PaidInStoreCashAmount })
        return { id: data.Id, total: data.Total, delivery: data.DeliveryFee ?? 0,
            lines: data.lines.map((p: { name: string; Quantity: number; UnitPrice: number; Discount: number }) => ({ name: p.name, quantity: p.Quantity, unitPrice: p.UnitPrice, discount: p.Discount })),
            payments, balance: Math.max(0, data.Total - payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)) }
    } catch { return null }
}

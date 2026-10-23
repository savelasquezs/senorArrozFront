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
    const email = invoiceEmailProgress(d)
    return [
        { label: 'Solicitud guardada', state: d.status === 'cancelled' ? 'muted' : 'done', date: d.createdAt },
        { label: 'Transmisión a Plemsi', state: validated || d.dianRejected ? 'done' : d.status === 'rejected' ? 'error' : d.submittedAt || ['processing', 'verifying'].includes(d.status) ? 'active' : 'pending', date: d.submittedAt },
        { label: 'Validada DIAN', state: validated ? 'done' : d.dianRejected ? 'error' : 'pending', date: d.issuedAt },
        { label: hasEmail ? email.label : 'Sin correo', state: !hasEmail ? 'muted' : email.state, date: d.emailDelivery?.status ? d.emailDelivery.occurredAt ?? undefined : d.emailSentAt ?? undefined },
    ]
}

export function invoiceEmailProgress(d: InvoiceDocument) {
    const delivery = d.emailChannel === 'plemsi' ? null : d.emailDelivery?.status
    if (delivery === 'delivered') return { label: 'Correo entregado', state: 'done', description: 'PDF y XML entregados al servidor de correo del cliente. No confirma lectura.' }
    if (delivery === 'bounced') return { label: 'Correo rebotado', state: 'error', description: 'El servidor del cliente rechazó el correo. La factura conserva su validación DIAN.' }
    if (delivery === 'delayed') return { label: 'Entrega demorada', state: 'active', description: 'Resend está reintentando la entrega por un problema temporal. No es necesario reenviar.' }
    if (delivery === 'complained') return { label: 'Correo marcado como spam', state: 'error', description: 'El destinatario marcó el correo como spam. La factura conserva su validación DIAN.' }
    if (['failed', 'suppressed'].includes(delivery ?? '')) return { label: 'Correo no entregado', state: 'error', description: 'Resend confirmó que el correo no pudo entregarse. La factura conserva su validación DIAN.' }
    if (d.emailStatus === 'accepted') return { label: 'Correo aceptado por Plemsi', state: 'done', description: 'Correo aceptado por Plemsi; no confirma recepción en el buzón' }
    if (d.emailStatus === 'sent') return { label: 'Correo aceptado para envío', state: 'active', description: 'PDF personalizado y XML aceptados para envío. Esperando confirmación de entrega.' }
    if (d.emailStatus === 'failed') return { label: 'Error de correo', state: 'error', description: 'No se pudo enviar el correo. La factura conserva su validación DIAN.' }
    if (d.emailStatus === 'verifying') return { label: 'Correo por verificar', state: 'error', description: 'Verifica el resultado del correo antes de reenviar para evitar duplicados.' }
    return { label: 'Envío de correo', state: ['issued', 'credited'].includes(d.status) ? 'active' : 'pending', description: ['queued', 'processing'].includes(d.emailStatus) ? 'PDF personalizado y XML en cola de correo. Plemsi no enviará otro mensaje.' : 'Correo pendiente' }
}

export function invoiceEmailTrackingPending(d: InvoiceDocument) {
    return d.emailChannel === 'application' && d.emailStatus === 'sent' && !['delivered', 'bounced', 'failed', 'suppressed', 'complained'].includes(d.emailDelivery?.status ?? '')
        && !!d.emailSentAt && Date.now() - Date.parse(d.emailSentAt) < 72 * 3600000
}

export interface InvoiceOrderSummary {
    id: number
    total: number
    delivery: number
    lines: { name: string; quantity: number; unitPrice: number; discount: number; total?: number; notes?: string | null }[]
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
        const root = JSON.parse(snapshot ?? '{}')
        const data = root.order
        if (!data?.lines || !Number.isFinite(data.Total)) return null
        const payments = [
            ...(data.bankPayments ?? []).filter((p: { SourceReservationDepositId?: number }) => !p.SourceReservationDepositId).map((p: { Amount: number }) => ({ label: 'Transferencia bancaria', amount: p.Amount })),
            ...(data.appPayments ?? []).map((p: { Amount: number }) => ({ label: 'Aplicación', amount: p.Amount })),
            ...(data.deposits ?? []).map((p: { IsEffective: boolean; Amount: number }) => ({ label: p.IsEffective ? 'Anticipo en efectivo' : 'Anticipo por transferencia', amount: p.Amount })),
        ]
        if (data.PaidInStoreCashAmount > 0) payments.push({ label: 'Efectivo en caja', amount: data.PaidInStoreCashAmount })
        return { id: data.Id, total: data.Total, delivery: data.DeliveryFee ?? 0,
            lines: (root.fiscalLines ?? data.lines).map((p: { name: string; Quantity: number; UnitPrice: number; Discount: number; Net?: number }) => ({ name: p.name, quantity: p.Quantity, unitPrice: p.UnitPrice, discount: p.Discount, total: p.Net })),
            payments, balance: Math.max(0, data.Total - payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)) }
    } catch { return null }
}

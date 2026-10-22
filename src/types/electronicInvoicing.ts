export interface BillingRecipient {
    id?: number
    documentType: number
    identification: string
    name: string
    email?: string | null
    isDefault?: boolean
}

export interface InvoiceIntegration {
    id?: number
    name: string
    provider?: string
    environment: 'sandbox' | 'production'
    token?: string
    hasToken?: boolean
    isActive?: boolean
    taxId: string
    legalName: string
    billingEmail: string
    resolution: string
    prefix: string
    nextNumber: number
    lastNumber: number
    validUntil?: string | null
    creditPrefix: string
    nextCreditNumber: number
    productionReady: boolean
    testedAt?: string | null
    productionEnabled?: boolean
}

export interface InvoiceNumbering {
    resolution: string
    prefix: string
    from: number
    to: number
    validUntil: string | null
    nextNumber: number | null
}

export interface InvoiceDocument {
    id: number
    kind: 'invoice' | 'credit'
    status: string
    environment: string
    prefix: string
    number?: number
    cufe?: string
    emailStatus: string
    creditRequested: boolean
    lastError?: string
    issuedAt?: string
    createdAt?: string
    submittedAt?: string
    snapshotJson?: string
    recipientJson: string
    hasPdf: boolean
    hasXml: boolean
}

export const invoiceStatusLabels: Record<string, string> = {
    scheduled: 'Programada para la entrega', pending: 'Pendiente', processing: 'Procesando',
    verifying: 'Por verificar', issued: 'Emitida', rejected: 'Rechazada',
    credited: 'Anulada con nota crédito', cancelled: 'Cancelada antes de emitir',
}

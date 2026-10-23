import { BaseApi } from './baseApi'
import type { ApiResponse, PagedResult } from '@/types/common'
import type { BillingRecipient, InvoiceDocument, InvoiceIntegration, InvoiceBranding } from '@/types/electronicInvoicing'

class ElectronicInvoicingApi extends BaseApi {
    private base = '/electronic-invoicing'
    branding() { return this.get<ApiResponse<InvoiceBranding | null>>(`${this.base}/branding`, { branchScope: 'none' }) }
    saveBranding(dto: InvoiceBranding) { return this.post<ApiResponse<InvoiceBranding>>(`${this.base}/branding`, dto, { branchScope: 'none' }) }
    availability() { return this.get<ApiResponse<{ enabled: boolean; productionEnabled?: boolean }>>(`${this.base}/availability`, { branchScope: 'none' }) }
    integrations() { return this.get<ApiResponse<InvoiceIntegration[]>>(`${this.base}/integrations`, { branchScope: 'none' }) }
    saveIntegration(dto: InvoiceIntegration) { return this.post<ApiResponse<InvoiceIntegration>>(`${this.base}/integrations`, dto, { branchScope: 'none' }) }
    integrationAction(id: number, action: 'test' | 'resolutions' | 'email' | 'activation', data?: unknown) {
        return this.post<ApiResponse<unknown>>(`${this.base}/integrations/${id}/${action}`, data, { branchScope: 'none', timeout: 35000 })
    }
    recipients(customerId: number) { return this.get<ApiResponse<BillingRecipient[]>>(`${this.base}/customers/${customerId}/recipients`, { branchScope: 'none' }) }
    searchRecipients(search: string, page = 1) { return this.get<ApiResponse<PagedResult<BillingRecipient>>>(`${this.base}/recipients`, { params: { search, page }, branchScope: 'none' }) }
    saveDirectoryRecipient(dto: BillingRecipient) { return this.post<ApiResponse<BillingRecipient>>(`${this.base}/recipients`, dto, { branchScope: 'none' }) }
    saveRecipient(customerId: number, dto: BillingRecipient) { return this.post<ApiResponse<BillingRecipient>>(`${this.base}/customers/${customerId}/recipients`, dto, { branchScope: 'none' }) }
    lookup(type: number, identification: string) {
        return this.get<ApiResponse<unknown>>(`${this.base}/recipient-lookup`, { params: { type, identification }, branchScope: 'none', timeout: 35000 })
    }
    documents(orderId: number) { return this.get<ApiResponse<InvoiceDocument[]>>(`${this.base}/orders/${orderId}`) }
    request(orderId: number, recipient: BillingRecipient) { return this.post<ApiResponse<unknown>>(`${this.base}/orders/${orderId}`, recipient) }
    documentAction(id: number, action: 'retry' | 'email' | 'credit', data: unknown = null) {
        return this.post<ApiResponse<unknown>>(`${this.base}/documents/${id}/${action}`, data, { timeout: 35000 })
    }
    async download(id: number, format: 'pdf' | 'xml', filename: string) {
        const blob = await this.get<Blob>(`${this.base}/documents/${id}/${format}`, { responseType: 'blob' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = `${filename}.${format}`; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}
export const electronicInvoicingApi = new ElectronicInvoicingApi()

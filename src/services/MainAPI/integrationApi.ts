import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type {
  DeliveryProviderCard,
  RappiCatalog,
  RappiConnection,
  RappiExternalOrder,
  RappiMenuPreview,
  UpdateRappiCatalogProduct,
  UpsertRappiConnection,
  UpsertWompiPaymentIntegration,
  WompiIntegrationSettings,
  WompiPaymentIntegration,
  WompiPaymentReview,
} from '@/types/integrations'

class IntegrationApi extends BaseApi {
  getDeliveryApps(branchId: number) {
    return this.get<ApiResponse<{ providers: DeliveryProviderCard[] }>>(`/branches/${branchId}/integrations/apps`)
  }

  saveRappi(branchId: number, data: UpsertRappiConnection) {
    return this.put<ApiResponse<RappiConnection>>(`/branches/${branchId}/integrations/apps/rappi`, data)
  }

  deleteRappi(branchId: number) {
    return this.delete<ApiResponse<string>>(`/branches/${branchId}/integrations/apps/rappi`)
  }

  testRappi(branchId: number) {
    return this.post<ApiResponse<RappiConnection>>(`/branches/${branchId}/integrations/apps/rappi/test-connection`, {})
  }

  configureRappiWebhooks(branchId: number) {
    return this.post<ApiResponse<RappiConnection>>(`/branches/${branchId}/integrations/apps/rappi/webhooks/configure`, {})
  }

  getRappiCatalog(branchId: number) {
    return this.get<ApiResponse<RappiCatalog>>(`/branches/${branchId}/integrations/apps/rappi/catalog`)
  }

  updateRappiCatalogProduct(branchId: number, productId: number, data: UpdateRappiCatalogProduct) {
    return this.put<ApiResponse<RappiCatalog>>(`/branches/${branchId}/integrations/apps/rappi/catalog/${productId}`, data)
  }

  previewRappiMenu(branchId: number) {
    return this.get<ApiResponse<RappiMenuPreview>>(`/branches/${branchId}/integrations/apps/rappi/menu/preview`)
  }

  publishRappiMenu(branchId: number) {
    return this.post<ApiResponse<{ id: number; status: string; payloadHash: string }>>(`/branches/${branchId}/integrations/apps/rappi/menu/publish`, {})
  }

  reconcileRappiAvailability(branchId: number) {
    return this.post<ApiResponse<{ queued: boolean }>>(`/branches/${branchId}/integrations/apps/rappi/availability/reconcile`, {})
  }

  getOperationalStatus(branchId?: number | null) {
    return this.get<ApiResponse<{ rappi?: RappiConnection | null; pending: number }>>('/integrations/apps/status', {
      params: branchId ? { branchId } : {},
    })
  }

  getRappiOrders(branchId?: number | null) {
    return this.get<ApiResponse<RappiExternalOrder[]>>('/integrations/apps/rappi/orders', {
      params: branchId ? { branchId } : {},
    })
  }

  revalidateAndAcceptRappiOrder(id: number) {
    return this.post<ApiResponse<{ externalOrderId: string; internalOrderId: number }>>(`/integrations/apps/rappi/orders/${id}/revalidate-and-accept`, {})
  }

  rejectRappiOrder(id: number, reason: string) {
    return this.post<ApiResponse<string>>(`/integrations/apps/rappi/orders/${id}/reject`, { reason })
  }

  getWompi(branchId: number) {
    return this.get<ApiResponse<WompiIntegrationSettings>>(`/branches/${branchId}/payment-integrations/wompi`)
  }

  saveWompi(branchId: number, data: UpsertWompiPaymentIntegration) {
    return this.put<ApiResponse<WompiPaymentIntegration>>(`/branches/${branchId}/payment-integrations/wompi`, data)
  }

  testWompi(branchId: number) {
    return this.post<ApiResponse<WompiPaymentIntegration>>(`/branches/${branchId}/payment-integrations/wompi/test`, {})
  }

  getWompiReviews(branchId: number) {
    return this.get<ApiResponse<WompiPaymentReview[]>>('/payments/wompi/reviews', { params: { branchId } })
  }

  resolveWompiReview(attemptId: number, approve: boolean) {
    return this.post<ApiResponse<unknown>>(`/payments/wompi/reviews/${attemptId}/resolve`, { approve })
  }
}

export const integrationApi = new IntegrationApi()

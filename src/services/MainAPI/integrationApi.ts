import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { DeliveryProviderCard, RappiConnection, RappiExternalOrder, RappiMappings, UpsertRappiConnection } from '@/types/integrations'

class IntegrationApi extends BaseApi {
  getDeliveryApps(branchId: number) { return this.get<ApiResponse<{ providers: DeliveryProviderCard[] }>>(`/branches/${branchId}/integrations/apps`) }
  saveRappi(branchId: number, data: UpsertRappiConnection) { return this.put<ApiResponse<RappiConnection>>(`/branches/${branchId}/integrations/apps/rappi`, data) }
  deleteRappi(branchId: number) { return this.delete<ApiResponse<string>>(`/branches/${branchId}/integrations/apps/rappi`) }
  testRappi(branchId: number) { return this.post<ApiResponse<RappiConnection>>(`/branches/${branchId}/integrations/apps/rappi/test-connection`, {}) }
  syncRappiCatalog(branchId: number) { return this.post<ApiResponse<RappiMappings>>(`/branches/${branchId}/integrations/apps/rappi/sync-catalog`, {}) }
  getRappiMappings(branchId: number) { return this.get<ApiResponse<RappiMappings>>(`/branches/${branchId}/integrations/apps/rappi/mappings`) }
  mapRappiProduct(branchId: number, mappingId: number, productId: number) { return this.put<ApiResponse<RappiMappings>>(`/branches/${branchId}/integrations/apps/rappi/mappings/${mappingId}`, { productId }) }
  getOperationalStatus(branchId?: number | null) { return this.get<ApiResponse<{ rappi?: RappiConnection | null; pending: number }>>('/integrations/apps/status', { params: branchId ? { branchId } : {} }) }
  getRappiOrders(branchId?: number | null) { return this.get<ApiResponse<RappiExternalOrder[]>>('/integrations/apps/rappi/orders', { params: branchId ? { branchId } : {} }) }
  acceptRappiOrder(id: number) { return this.post<ApiResponse<{ internalOrderId: number }>>(`/integrations/apps/rappi/orders/${id}/accept`, {}) }
  rejectRappiOrder(id: number) { return this.post<ApiResponse<string>>(`/integrations/apps/rappi/orders/${id}/reject`, {}) }
}
export const integrationApi = new IntegrationApi()

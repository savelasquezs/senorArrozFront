import type { ApiResponse, PagedResult } from '@/types/common'
import { BaseApi } from './baseApi'

export type DeliveryTrackingAlertType =
  | 'gps_disabled'
  | 'location_permission_revoked'
  | 'no_communication'
  | 'unexpected_stay'
  | 'offline_locations_queued'
  | 'session_past_auto_close'

export type DeliveryTrackingAlertSeverity = 'informational' | 'warning' | 'requires_review' | 'critical'
export type DeliveryTrackingAlertStatus = 'active' | 'resolved'

export interface DeliveryTrackingAlert {
  id: number
  branchId: number
  branchName: string
  deliverymanId: number
  deliverymanName: string
  workSessionId: number | null
  incidentId: number | null
  alertType: DeliveryTrackingAlertType
  severity: DeliveryTrackingAlertSeverity
  status: DeliveryTrackingAlertStatus
  title: string
  message: string
  occurredAt: string
  lastOccurredAt: string
  recoveredAt: string | null
  durationSeconds: number | null
  startLatitude: number | null
  startLongitude: number | null
  startLocationRecordedAt: string | null
  endLatitude: number | null
  endLongitude: number | null
  endLocationRecordedAt: string | null
  occurrenceCount: number
  resolvedAt: string | null
  resolvedByUserId: number | null
  resolvedByUserName: string | null
  resolutionReason: string | null
}

export interface DeliveryTrackingAlertFilters {
  branchId?: number
  status?: DeliveryTrackingAlertStatus
  severity?: DeliveryTrackingAlertSeverity
  alertType?: DeliveryTrackingAlertType
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

class DeliveryTrackingAlertsApi extends BaseApi {
  getAll(filters: DeliveryTrackingAlertFilters): Promise<ApiResponse<PagedResult<DeliveryTrackingAlert>>> {
    return this.get('/delivery-tracking-alerts', { params: filters })
  }

  resolve(id: number, reason: string | null): Promise<ApiResponse<DeliveryTrackingAlert>> {
    return this.put(`/delivery-tracking-alerts/${id}/resolve`, { reason })
  }
}

export const deliveryTrackingAlertsApi = new DeliveryTrackingAlertsApi()

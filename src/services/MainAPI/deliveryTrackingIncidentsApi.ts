import type { ApiResponse, PagedResult } from '@/types/common'
import { BaseApi } from './baseApi'

export type DeliveryStayClassification =
  | 'branch'
  | 'order_destination'
  | 'authorized_place'
  | 'traffic_or_route'
  | 'unexpected_place'
  | 'gps_unreliable'
  | 'pending_review'

export type DeliveryIncidentReviewStatus =
  | 'pending'
  | 'justified'
  | 'not_justified'
  | 'gps_error'
  | 'technical_failure'
  | 'closed_without_action'
  | 'referred_to_disciplinary_process'

export interface DeliveryTrackingIncidentListItem {
  id: number
  incidentType: 'stay' | 'route_deviation' | 'location_disabled'
  branchId: number
  branchName: string
  deliverymanId: number
  deliverymanName: string
  workSessionId: number
  startedAt: string
  endedAt: string
  durationSeconds: number
  automaticClassification: DeliveryStayClassification | null
  finalClassification: DeliveryStayClassification | null
  reviewStatus: DeliveryIncidentReviewStatus
  orderId: number | null
  orderAddress: string | null
  distanceToOrderMeters: number | null
  averageAccuracyMeters: number
  gpsEnabled: boolean | null
  internetAvailable: boolean | null
  evidenceComplete: boolean
}

export interface DeliveryIncidentLocationEvidence {
  sourceLocationId: number
  isCorePoint: boolean
  latitude: number
  longitude: number
  accuracyMeters: number | null
  headingDegrees: number | null
  batteryLevelPercent: number | null
  internetAvailable: boolean | null
  gpsEnabled: boolean | null
  trackingMode: 'light' | 'active_delivery' | 'offline' | 'stopped' | null
  recordedAt: string
  syncedAt: string | null
}

export interface DeliveryIncidentDeviceEventEvidence {
  sourceDeviceEventId: number
  eventType: string
  batteryLevelPercent: number | null
  internetAvailable: boolean | null
  gpsEnabled: boolean | null
  locationPermissionGranted: boolean | null
  details: string | null
  recordedAt: string
  syncedAt: string
}

export interface DeliveryTrackingIncidentDetail {
  id: number
  incidentType: 'stay' | 'route_deviation' | 'location_disabled'
  branchId: number
  branchName: string
  deliverymanId: number
  deliverymanName: string
  workSessionId: number
  deliveryRouteId: number | null
  orderId: number | null
  automaticClassification: DeliveryStayClassification | null
  classificationReason: string | null
  finalClassification: DeliveryStayClassification | null
  reviewStatus: DeliveryIncidentReviewStatus
  startedAt: string
  endedAt: string
  durationSeconds: number
  centerLatitude: number | null
  centerLongitude: number | null
  radiusMeters: number
  averageAccuracyMeters: number
  distanceToBranchMeters: number | null
  distanceToOrderMeters: number | null
  orderAddress: string | null
  orderLatitude: number | null
  orderLongitude: number | null
  orderStatus: string | null
  adminNotes: string | null
  deliverymanExplanation: string | null
  reviewedByUserId: number | null
  reviewedByUserName: string | null
  reviewedAt: string | null
  evidenceComplete: boolean
  locations: DeliveryIncidentLocationEvidence[]
  deviceEvents: DeliveryIncidentDeviceEventEvidence[]
}

export interface DeliveryTrackingIncidentFilters {
  branchId?: number
  deliverymanId?: number
  reviewStatus?: DeliveryIncidentReviewStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface ReviewDeliveryTrackingIncident {
  reviewStatus: DeliveryIncidentReviewStatus
  finalClassification: DeliveryStayClassification | null
  adminNotes: string | null
  deliverymanExplanation: string | null
}

class DeliveryTrackingIncidentsApi extends BaseApi {
  getAll(filters: DeliveryTrackingIncidentFilters): Promise<ApiResponse<PagedResult<DeliveryTrackingIncidentListItem>>> {
    return this.get('/delivery-tracking-incidents', { params: filters })
  }

  getById(id: number): Promise<ApiResponse<DeliveryTrackingIncidentDetail>> {
    return this.get(`/delivery-tracking-incidents/${id}`)
  }

  review(id: number, payload: ReviewDeliveryTrackingIncident): Promise<ApiResponse<DeliveryTrackingIncidentDetail>> {
    return this.put(`/delivery-tracking-incidents/${id}/review`, payload)
  }
}

export const deliveryTrackingIncidentsApi = new DeliveryTrackingIncidentsApi()

import type { ApiResponse } from '@/types/common'
import { BaseApi } from './baseApi'

export interface DeliveryAuthorizedPlace {
  id: number
  branchId: number
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveDeliveryAuthorizedPlace {
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  active: boolean
}

class DeliveryAuthorizedPlacesApi extends BaseApi {
  getAll(branchId: number): Promise<ApiResponse<DeliveryAuthorizedPlace[]>> {
    return this.get(`/branches/${branchId}/delivery-authorized-places`)
  }

  create(branchId: number, payload: SaveDeliveryAuthorizedPlace): Promise<ApiResponse<DeliveryAuthorizedPlace>> {
    return this.post(`/branches/${branchId}/delivery-authorized-places`, payload)
  }

  update(branchId: number, placeId: number, payload: SaveDeliveryAuthorizedPlace): Promise<ApiResponse<DeliveryAuthorizedPlace>> {
    return this.put(`/branches/${branchId}/delivery-authorized-places/${placeId}`, payload)
  }

  disable(branchId: number, placeId: number): Promise<ApiResponse<unknown>> {
    return this.delete(`/branches/${branchId}/delivery-authorized-places/${placeId}`)
  }
}

export const deliveryAuthorizedPlacesApi = new DeliveryAuthorizedPlacesApi()

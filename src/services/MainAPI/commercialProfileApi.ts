import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { CommercialProfile, SaveCommercialProfileDto } from '@/types/product'

class CommercialProfileApi extends BaseApi {
  getAll(branchId: number) { return this.get<ApiResponse<CommercialProfile[]>>('/commercial-profiles', { params: { branchId } }) }
  create(payload: SaveCommercialProfileDto) { return this.post<ApiResponse<CommercialProfile>>('/commercial-profiles', payload) }
  update(id: number, payload: SaveCommercialProfileDto) { return this.put<ApiResponse<CommercialProfile>>(`/commercial-profiles/${id}`, payload) }
  uploadPhoto(id: number, file: File) {
    const form = new FormData(); form.append('file', file)
    return this.post<ApiResponse<CommercialProfile>>(`/commercial-profiles/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  deletePhoto(id: number) { return this.delete<void>(`/commercial-profiles/${id}/photo`) }
}
export const commercialProfileApi = new CommercialProfileApi()

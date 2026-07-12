import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
export interface BranchMenu { branchId: number; branchName: string; imageUrl1?: string | null; imageUrl2?: string | null }
class BranchMenuApi extends BaseApi {
  getMenu(branchId: number) { return this.get<ApiResponse<BranchMenu>>(`/branches/${branchId}/menu`) }
  upload(branchId: number, slot: 1 | 2, file: File) { const data = new FormData(); data.append('file', file); return this.post<ApiResponse<BranchMenu>>(`/branches/${branchId}/menu/images/${slot}`, data) }
  remove(branchId: number, slot: 1 | 2) { return this.delete<void>(`/branches/${branchId}/menu/images/${slot}`) }
}
export const branchMenuApi = new BranchMenuApi()

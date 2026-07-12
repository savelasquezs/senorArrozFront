import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
export interface BranchBusinessHour { id?:number|null; branchId:number; dayOfWeek:number|string; openTime:string|null; closeTime:string|null; isClosed:boolean; displayOrder:number }
class Api extends BaseApi { getHours(id:number):Promise<ApiResponse<BranchBusinessHour[]>>{return this.get(`/branches/${id}/business-hours`)} save(id:number,v:BranchBusinessHour[]):Promise<ApiResponse<BranchBusinessHour[]>>{return this.put(`/branches/${id}/business-hours`,v)} }
export const branchBusinessHoursApi=new Api()

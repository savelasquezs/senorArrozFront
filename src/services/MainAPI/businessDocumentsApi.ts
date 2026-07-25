import { BaseApi } from './baseApi'
import type { ApiResponse, PagedResult } from '@/types/common'
import type { BusinessDocument, BusinessDocumentFilters } from '@/types/businessDocument'

class BusinessDocumentsApi extends BaseApi {
  getDocuments(
    filters: BusinessDocumentFilters = {},
  ): Promise<ApiResponse<PagedResult<BusinessDocument>>> {
    return this.get<ApiResponse<PagedResult<BusinessDocument>>>('/business-documents', {
      params: {
        search: filters.search || undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
        sortBy: filters.sortBy ?? 'name',
        sortOrder: filters.sortOrder ?? 'asc',
      },
    })
  }

  createDocument(name: string, file: File): Promise<ApiResponse<BusinessDocument>> {
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('file', file)
    return this.post<ApiResponse<BusinessDocument>>('/business-documents', formData)
  }

  updateDocument(
    id: number,
    name: string,
    file?: File,
  ): Promise<ApiResponse<BusinessDocument>> {
    const formData = new FormData()
    formData.append('name', name.trim())
    if (file) formData.append('file', file)
    return this.put<ApiResponse<BusinessDocument>>(`/business-documents/${id}`, formData)
  }

  deleteDocument(id: number): Promise<void> {
    return this.delete<void>(`/business-documents/${id}`)
  }
}

export const businessDocumentsApi = new BusinessDocumentsApi()

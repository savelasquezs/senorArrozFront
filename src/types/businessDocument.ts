export interface BusinessDocument {
  id: number
  publicId: string
  name: string
  downloadUrl: string
  publicDownloadUrl: string
  originalFileName: string
  contentType: string
  fileSizeBytes: number
  createdAt: string
  updatedAt: string
}

export interface BusinessDocumentFilters {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

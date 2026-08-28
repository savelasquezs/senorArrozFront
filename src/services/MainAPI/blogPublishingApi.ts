import { BaseApi } from './baseApi'
import type { ApiResponse, PagedResult } from '@/types/common'
import type {
  BlogArticlePreview,
  BlogArticleSummary,
  BlogPublishingQueueItem,
  BlogPublishResult,
} from '@/types/blogPublishing'

class BlogPublishingApi extends BaseApi {
  async getQueue(page = 1, pageSize = 100): Promise<ApiResponse<BlogPublishingQueueItem[]>> {
    const response = await this.get<ApiResponse<PagedResult<BlogPublishingQueueItem>>>(
      `/blog-publishing/queue?page=${page}&pageSize=${pageSize}`,
      { branchScope: 'none' },
    )

    return {
      ...response,
      data: response.data?.items ?? [],
    }
  }

  getApproved(): Promise<ApiResponse<BlogArticleSummary[]>> {
    return this.get<ApiResponse<BlogArticleSummary[]>>('/blog-publishing/approved', {
      branchScope: 'none',
    })
  }

  getPreview(notionPageId: string): Promise<ApiResponse<BlogArticlePreview>> {
    return this.get<ApiResponse<BlogArticlePreview>>(
      `/blog-publishing/${encodeURIComponent(notionPageId)}/preview`,
      { branchScope: 'none' },
    )
  }

  publish(notionPageId: string): Promise<ApiResponse<BlogPublishResult>> {
    return this.post<ApiResponse<BlogPublishResult>>(
      `/blog-publishing/${encodeURIComponent(notionPageId)}/publish`,
      undefined,
      { branchScope: 'none' },
    )
  }
}

export const blogPublishingApi = new BlogPublishingApi()

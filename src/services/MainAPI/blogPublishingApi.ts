import { BaseApi } from './baseApi'
import type { ApiResponse, PagedResult } from '@/types/common'
import type {
  BlogArticlePreview,
  BlogArticleSummary,
  BlogPublishingQueueItem,
  BlogPublishResult,
} from '@/types/blogPublishing'

class BlogPublishingApi extends BaseApi {
  async getQueue(page = 1, pageSize = 100, signal?: AbortSignal): Promise<ApiResponse<BlogPublishingQueueItem[]>> {
    const response = await this.getQueuePage(page, pageSize, signal)

    return {
      ...response,
      data: response.data?.items ?? [],
    }
  }

  getQueuePage(page = 1, pageSize = 50, signal?: AbortSignal): Promise<ApiResponse<PagedResult<BlogPublishingQueueItem>>> {
    return this.get(`/blog-publishing/queue?page=${page}&pageSize=${pageSize}`, { branchScope: 'none', signal })
  }

  getApproved(): Promise<ApiResponse<BlogArticleSummary[]>> {
    return this.get<ApiResponse<BlogArticleSummary[]>>('/blog-publishing/approved', {
      branchScope: 'none',
    })
  }

  getPreview(notionPageId: string, signal?: AbortSignal): Promise<ApiResponse<BlogArticlePreview>> {
    return this.get<ApiResponse<BlogArticlePreview>>(
      `/blog-publishing/${encodeURIComponent(notionPageId)}/preview`,
      { branchScope: 'none', signal },
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

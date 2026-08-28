export interface BlogRichText {
  text: string
  href?: string | null
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  code: boolean
}

export interface BlogBlock {
  type: string
  richText: BlogRichText[]
  cells: BlogRichText[][]
  children: BlogBlock[]
}

export interface BlogArticleSummary {
  notionPageId: string
  title: string
  slug: string
  state: string
  humanReviewed: boolean
  keywordPrincipal?: string | null
  intent?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  clientViewUrl?: string | null
  lastEditedAt?: string | null
}

export type BlogPublicationStatus =
  | 'readyToPublish'
  | 'changesPending'
  | 'upToDate'
  | 'notReady'
  | 'checkFailed'

export interface BlogPublishingQueueItem extends BlogArticleSummary {
  publicationStatus: BlogPublicationStatus
  hasUnpublishedChanges: boolean
  publicUrl?: string | null
  publishedAt?: string | null
  publishedUpdatedAt?: string | null
  checkError?: string | null
}

export interface BlogArticlePreview extends BlogArticleSummary {
  metaTitle: string
  metaDescription: string
  clientViewUrl: string
  blocks: BlogBlock[]
  warnings: string[]
}

export interface BlogPublishedPost {
  id: number
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  keywordPrincipal?: string | null
  intent?: string | null
  blocks: BlogBlock[]
  publishedAt: string
  updatedAt: string
}

export interface BlogPublishResult {
  post: BlogPublishedPost
  publicUrl: string
  warnings: string[]
}

export type WhatsAppSettingStatus =
  | 'not_configured'
  | 'configured_inactive'
  | 'configured_unverified'
  | 'connected'

export interface WhatsAppBranchSetting {
  id?: number | null
  branchId: number
  phoneNumberId: string
  businessAccountId: string
  displayPhoneNumber: string
  accessTokenConfigured: boolean
  accessTokenMasked?: string | null
  webhookVerifyToken: string
  appSecretConfigured: boolean
  isActive: boolean
  isVerified: boolean
  lastVerifiedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  status: WhatsAppSettingStatus
}

export interface UpsertWhatsAppBranchSetting {
  phoneNumberId: string
  businessAccountId: string
  displayPhoneNumber: string
  accessToken: string
  webhookVerifyToken: string
  appSecret: string
  isActive: boolean
}

export interface WhatsAppTestConnectionResult {
  success: boolean
  message: string
  setting?: WhatsAppBranchSetting | null
}

export interface WhatsAppStatus {
  enabled: boolean
  branchIds: number[]
}

export interface WhatsAppUnreadSummary {
  totalUnread: number
  unreadConversations: number
  latestMessageAt?: string | null
}

export interface WhatsAppAiProcessing {
  messageId: number
  conversationId: number
  status: string
  severity: string
  title: string
  detail: string
  technicalDetail?: string | null
  errorCategory?: string | null
  httpStatusCode?: number | null
  attempts: number
  maxAttempts: number
  willRetry: boolean
  timestamp: string
  statusChangedAt: string
  startedAt?: string | null
  nextRetryAt?: string | null
  processedAt?: string | null
}

export interface WhatsAppAiDiagnostics {
  branchId: number
  conversationId?: number | null
  agentStatus: string
  overallStatus: string
  title: string
  summary: string
  provider?: string | null
  model?: string | null
  isActive: boolean
  isVerified: boolean
  attentionMode?: WhatsAppAttentionMode | string | null
  pendingCount: number
  failedCountLast24Hours: number
  lastActivityAt?: string | null
  recentMessages: WhatsAppAiProcessing[]
}

export interface WhatsAppAiUsageBreakdown { provider: string; model: string; contextStrategy: string; invocations: number; messagesProcessed: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; thinkingTokens: number; billableOutputTokens: number; estimatedCostUsd: number; unpricedInvocations: number; averageDurationMs: number; errorRate: number; averageContextMessages: number; averageToolDefinitions: number; fallbackRate: number }
export interface WhatsAppAiUsageDaily { date: string; invocations: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; thinkingTokens: number; billableOutputTokens: number; estimatedCostUsd: number; unpricedInvocations: number }
export interface WhatsAppAiUsage { totalInvocations: number; incomingMessagesProcessed: number; conversationsServed: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; thinkingTokens: number; billableOutputTokens: number; estimatedCostUsd: number; unpricedInvocations: number; averageDurationMs: number; p95DurationMs: number; errorRate: number; averageInvocationsPerMessage: number; averageToolCallsPerMessage: number; averageContextMessages: number; averageToolDefinitions: number; contextPlannerFallbackRate: number; breakdown: WhatsAppAiUsageBreakdown[]; daily: WhatsAppAiUsageDaily[] }
export interface WhatsAppAiUsageFilters { branchId?: number; fromDate?: string; toDate?: string; provider?: string; model?: string }

export interface WhatsAppAiProcessingChangedPayload {
  branchId: number
  processing: WhatsAppAiProcessing
}

export interface WhatsAppQuickReply {
  id: number
  branchId: number
  branchName?: string | null
  shortcut: string
  messageTemplate: string
  isActive: boolean
  usageCount: number
  lastUsedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsAppTemplate {
  id: number
  branchId?: number | null
  branchName?: string | null
  businessAccountId?: string | null
  metaTemplateId: string
  name: string
  language: string
  category: string
  status: string
  components: string
  bodyParameterCount: number
  createdAt: string
  updatedAt: string
}

export interface WhatsAppTemplateFilters {
  branchId?: number
  status?: string
  search?: string
}

export interface WhatsAppTemplateSyncResult {
  synced: number
  created: number
  updated: number
}

export interface SendWhatsAppTemplate {
  branchId?: number | null
  to?: string
  customerIds?: number[]
  templateName: string
  language: string
  parameters: string[]
}

export interface WhatsAppTemplateSendResult {
  success: boolean
  sentCount: number
  failedCount: number
  messageIds: string[]
  errors: string[]
}

export interface UpsertWhatsAppQuickReply {
  branchId?: number | null
  shortcut: string
  messageTemplate: string
  isActive: boolean
}

export interface WhatsAppQuickReplyFilters {
  branchId?: number
  activeOnly?: boolean
  search?: string
}

export interface WhatsAppConversation {
  id: number
  branchId: number
  branchName?: string | null
  customerId?: number | null
  customerName?: string | null
  phoneNumber: string
  contactName?: string | null
  status: 'open' | 'pending' | 'closed' | 'archived'
  lastMessageAt?: string | null
  lastMessagePreview?: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
  attentionMode: WhatsAppAttentionMode
  assignedUserId?: number | null
  assignedUserName?: string | null
  aiPausedAt?: string | null
  humanAssignedAt?: string | null
  closedAt?: string | null
  attentionModeUpdatedAt: string
  attentionModeUpdatedByUserId?: number | null
}

export type WhatsAppAttentionMode = 'ai' | 'human' | 'waitingForHuman' | 'paused' | 'closed'
export interface WhatsAppAttention { conversationId: number; attentionMode: WhatsAppAttentionMode; assignedUserId?: number | null; assignedUserName?: string | null; aiPausedAt?: string | null; humanAssignedAt?: string | null; closedAt?: string | null; attentionModeUpdatedAt: string; attentionModeUpdatedByUserId?: number | null }
export interface WhatsAppAttentionChangedPayload { branchId: number; conversation: WhatsAppConversation }

export interface WhatsAppMessage {
  id: number
  conversationId: number
  whatsAppMessageId?: string | null
  direction: 'inbound' | 'outbound'
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker'
  textBody: string
  mediaId?: string | null
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaFileName?: string | null
  mediaFileSize?: number | null
  mediaSha256?: string | null
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed'
  sentByUserId?: number | null
  timestamp: string
  createdAt: string
  aiProcessing?: WhatsAppAiProcessing | null
}

export interface WhatsAppConversationFilters {
  branchId?: number
  search?: string
  status?: WhatsAppConversation['status']
  unreadOnly?: boolean
}

export interface WhatsAppRealtimeMessagePayload {
  branchId: number
  conversation: WhatsAppConversation
  message: WhatsAppMessage
}

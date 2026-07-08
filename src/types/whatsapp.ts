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
}

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

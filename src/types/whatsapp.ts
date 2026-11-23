import type { OrderStatus } from '@/types/order'

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
  awayMessageEnabled: boolean
  awayMessageText?: string | null
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
  awayMessageEnabled: boolean
  awayMessageText: string
}

export interface WhatsAppTestConnectionResult {
  success: boolean
  message: string
  setting?: WhatsAppBranchSetting | null
}

export interface WhatsAppStatus {
  queuedTextLineIds?: number[]
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

export interface WhatsAppOrderDraftItem {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string | null
  available: boolean
}

export interface WhatsAppOrderDraftAddress {
  id: number
  address: string
  additionalInfo?: string | null
  neighborhood: string
  deliveryFee: number
}

export interface WhatsAppOrderDraftActivity {
  type: string
  message: string
  timestamp: string
}

export interface WhatsAppOrderDraft {
  conversationId: number
  branchId: number
  customerId?: number | null
  customerName?: string | null
  phoneNumber?: string | null
  whatsAppUsername?: string | null
  orderType?: 'onsite' | 'delivery' | null
  selectedAddressId?: number | null
  selectedAddress?: WhatsAppOrderDraftAddress | null
  items: WhatsAppOrderDraftItem[]
  activities: WhatsAppOrderDraftActivity[]
  subtotal: number
  deliveryFee: number
  total: number
  totalItems: number
  updatedAt?: string | null
}

export type WhatsAppQuickReplyMode = 'send' | 'draft' | 'chicharron_quote'

export interface WhatsAppQuickReply {
  id: number
  branchId: number
  branchName?: string | null
  shortcut: string
  messageTemplate: string
  replyMode?: WhatsAppQuickReplyMode
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

export type WhatsAppConversationStartKind = 'menu' | 'catalog' | 'payment' | 'delivery_update'

export type WhatsAppOrderConversation =
  | { kind: 'existing'; conversationId: number }
  | { kind: 'start'; phone: string; branchId: number }
  | { kind: 'ambiguous' | 'unavailable' }

export interface WhatsAppDeliverymanContact {
  conversationId?: number | null
  shareText?: string | null
  chatUnavailableReason?: string | null
  shareUnavailableReason?: string | null
}

export interface WhatsAppConversationStartOptions {
  branchId: number
  branchName: string
  senderId: string
  displayPhoneNumber: string
  account: string | null
  holder: string | null
  templates: {
    key: WhatsAppConversationStartKind
    name: string
    status: string
    body: string | null
    unavailableReason: string | null
  }[]
}

export interface WhatsAppConversationStartRequest {
  branchId: number
  senderId: string
  phone: string
  template: WhatsAppConversationStartKind
  templateName?: string
  requestedByCustomer: boolean
  amount?: number
  deliveryUpdate?: string
}

export interface WhatsAppConversationStartResult {
  conversationId: number
  sent: boolean
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
  replyMode?: WhatsAppQuickReplyMode
  isActive: boolean
}

export interface WhatsAppQuickReplyPresentation {
  family: string
  size: string
}

export interface WhatsAppQuickReplyPreview {
  text?: string | null
  family?: string | null
  size?: string | null
  presentations?: WhatsAppQuickReplyPresentation[] | null
}

export interface WhatsAppQuickReplyFilters {
  branchId?: number
  activeOnly?: boolean
  search?: string
}

export interface WhatsAppOperationalContact {
  kind: 'deliveryman' | 'supplier'
  name: string
  isSharedPhone?: boolean
  deliverymanId?: number | null
}

export interface DeliveryWorkPhone {
  id: number
  phone: string
  workSessionId: number | null
}

export interface DeliveryWorkPhoneSettings {
  phones: DeliveryWorkPhone[]
  devices: {
    workSessionId: number
    description?: string | null
    deliverymanName: string
    lastCommunicationAt: string
  }[]
}

export interface WhatsAppRecentDeliveryRoute {
  id: number
  isCurrent: boolean
  at: string
  orders: { orderId: number; stopSequence: number; status: OrderStatus }[]
}

export interface WhatsAppConversation {
  matchesContactQuickFilter?: boolean
  operationalContact?: WhatsAppOperationalContact | null
  branchLineId?: number | null
  labels?: string[]
  commercialStatus?: string
  commercialOrderId?: number | null
  senderLine?: string | null
  attentionRevision?: number
  needsHumanResponse?: boolean
  lastCustomerMessageAt?: string | null
  customerServiceWindowExpiresAt?: string | null
  id: number
  branchId: number
  branchName?: string | null
  isCentralChannel: boolean
  operationalBranchId?: number | null
  operationalBranchName?: string | null
  customerId?: number | null
  customerName?: string | null
  phoneNumber?: string | null
  whatsAppUsername?: string | null
  hasWhatsAppIdentity: boolean
  contactName?: string | null
  profilePhotoUrl?: string | null
  status: 'open' | 'pending' | 'closed' | 'archived'
  lastMessageAt?: string | null
  lastMessagePreview?: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
  attentionMode: WhatsAppAttentionMode
  attentionReason?: string | null
  assignedUserId?: number | null
  assignedUserName?: string | null
  aiPausedAt?: string | null
  humanAssignedAt?: string | null
  closedAt?: string | null
  attentionModeUpdatedAt: string
  attentionModeUpdatedByUserId?: number | null
}

export type WhatsAppAttentionMode = 'ai' | 'human' | 'waitingForHuman' | 'paused' | 'closed'
export type WhatsAppContactPrefill = Pick<WhatsAppConversation, 'id' | 'contactName' | 'phoneNumber' | 'whatsAppUsername' | 'attentionRevision'>
export interface WhatsAppAttention { attentionRevision?: number; needsHumanResponse?: boolean; conversationId: number; attentionMode: WhatsAppAttentionMode; attentionReason?: string | null; assignedUserId?: number | null; assignedUserName?: string | null; aiPausedAt?: string | null; humanAssignedAt?: string | null; closedAt?: string | null; attentionModeUpdatedAt: string; attentionModeUpdatedByUserId?: number | null }
export interface WhatsAppAttentionChangedPayload { branchId: number; conversation: WhatsAppConversation }
export interface WhatsAppConversationRoutingChangedPayload { branchId: number; previousOperationalBranchId?: number | null; conversation: WhatsAppConversation }
export interface WhatsAppOperationalBranchOption { id: number; name: string }

export interface WhatsAppMessageContact {
  name: string
  phones: string[]
  emails?: string[] | null
  addresses?: string[] | null
  websites?: string[] | null
  organization?: string | null
  birthday?: string | null
  whatsAppIds?: string[] | null
}

export interface WhatsAppMessage {
  clientRequestId?: string | null
  isUpdate?: boolean
  isForwarded?: boolean
  editedAt?: string | null
  hiddenSource?: 'pos' | 'businessApp' | null
  replyToWhatsAppMessageId?: string | null
  location?: { latitude: number; longitude: number; name?: string | null; address?: string | null } | null
  contacts?: WhatsAppMessageContact[] | null
  customerReaction?: string | null
  businessReaction?: string | null
  draftAddressApplied?: boolean
  draftProductApplied?: boolean
  source?: string
  isHistorical?: boolean
  id: number
  conversationId: number
  whatsAppMessageId?: string | null
  direction: 'inbound' | 'outbound'
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts'
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

export interface WhatsAppProductChoiceGroup {
  id: number
  name: string
  isRice: boolean
  shortcut?: string | null
}

export interface WhatsAppProductSuggestion {
  kind: 'add' | 'reply' | 'clarify' | 'choices'
  productId: number | null
  name: string | null
  quantity: number
  unitPrice: number | null
  available: boolean
  reply: string | null
  choiceGroupId?: number | null
  choiceIndex?: number | null
}

export interface WhatsAppProductChoiceSource {
  messageId: number
  choiceIndex: number
  productId: number
}

export interface WhatsAppProductSuggestions {
  branchId: number
  messages: { messageId: number; suggestions: WhatsAppProductSuggestion[] }[]
}

export interface WhatsAppProductSuggestionState {
  conversationId: number
  branchId: number | null
  version: number | null
  canApply: boolean
  applied: ReadonlySet<string>
}

export interface WhatsAppConversationTemplate {
  metaTemplateId: string
  name: string
  language: string
  category: string
  status: string
  componentsJson: string
}

export interface WhatsAppConversationFilters {
  deliverymenAssignedToday?: boolean
  suppliersOnly?: boolean
  label?: string
  inbox?: WhatsAppInboxKey
  unroutedOnly?: boolean
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
export interface TenantWhatsAppChannel {
  publicId: string
  phoneNumberId: string
  businessAccountId: string
  displayPhoneNumber: string
  accessTokenConfigured: boolean
  webhookVerifyToken: string
  appSecretConfigured: boolean
  flowId?: string | null
  isActive: boolean
  isVerified: boolean
  flowEnabled: boolean
  lastVerifiedAt?: string | null
}

export interface TenantAiSetting {
  provider: string
  model: string
  isActive: boolean
  isVerified: boolean
  temperature?: number | null
  maxContextMessages: number
  assistantName: string
  promptObjective?: string | null
  promptPersonality?: string | null
  promptRequiredRules?: string | null
  promptFixedBranchInfo?: string | null
  promptAdditionalInstructions?: string | null
  transferMessage: string
}

export interface TenantWhatsAppSettings {
  channel?: TenantWhatsAppChannel | null
  ai?: TenantAiSetting | null
  dataExchangeUrl?: string | null
  flowEnvironmentEnabled: boolean
  privateKeyConfigured: boolean
  flowSessions: WhatsAppFlowSession[]
}

export interface WhatsAppFlowSession {
  correlationId: string
  flowVersion: string
  status: string
  screen: string
  category?: string | null
  updatedAt: string
  expiresAt: string
}

export interface UpdateTenantWhatsAppChannel {
  phoneNumberId: string
  businessAccountId: string
  displayPhoneNumber: string
  accessToken?: string
  webhookVerifyToken: string
  appSecret?: string
  flowId?: string
  isActive: boolean
  flowEnabled: boolean
}

export type WhatsAppInboxKey = 'free' | 'mine' | 'team' | 'closed'
export type WhatsAppInboxLabelColor = 'violet' | 'amber' | 'orange' | 'emerald' | 'blue' | 'teal' | 'rose' | 'slate'
export interface WhatsAppInboxLabelDefinition { name: string; color: WhatsAppInboxLabelColor }
export interface WhatsAppInboxLabel {
  key: string
  name: string
  editable: boolean
  color?: WhatsAppInboxLabelColor | null
  custom?: boolean
}
export type WhatsAppInboxSummary = Record<WhatsAppInboxKey, { pendingOrders: number; unreadConversations: number }>
export type WhatsAppAttentionAction = 'take' | 'takeover' | 'force-take' | 'release' | 'transfer' | 'return-to-ai' | 'pause-ai' | 'request-human' | 'close' | 'reopen'

export interface WhatsAppCommercialHistoryEntry {
  id: number
  orderId: number | null
  createdAt: string
  completedAt: string | null
}

export interface WhatsAppCommercialDraft {
  sessionId: number
  attemptId: string
  conversationId: number
  version: number
  status: string
  commercialStatus: string
  order: import('./order').CreateOrderDto
  editor: import('./order').DraftOrder | null
  orderId: number | null
  checkoutId: string | null
  confirmationStatus: string | null
  confirmationError: string | null
  internalNotes: { userId: number; text: string; createdAt: string }[]
}
export interface WhatsAppDraftWrite {
  sessionId: number; expectedVersion: number; attentionVersion: number
  productChoiceSource?: WhatsAppProductChoiceSource
  order?: import('./order').CreateOrderDto
  editor?: import('./order').DraftOrder
  commercialStatus?: string
  note?: string
}

export interface WhatsAppConversationPage { items: WhatsAppConversation[]; nextCursor: string | null; hasMore: boolean }

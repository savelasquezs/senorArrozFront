import { generatePosCreationKey } from '@/utils/posCreationKey'
import type { WhatsAppConversationPage, WhatsAppCommercialDraft, WhatsAppDraftWrite } from '@/types/whatsapp'
import { BaseApi } from './baseApi'
import type { CoexistenceStatus } from '@/composables/useWhatsAppCoexistence'
import { resolveWhatsAppOperation } from '@/helpers/whatsappOperation'
import type { ApiResponse } from '@/types/common'
import type {
  UpsertWhatsAppBranchSetting,
  UpsertWhatsAppQuickReply,
  WhatsAppBranchSetting,
  WhatsAppAiDiagnostics,
  WhatsAppAiUsage,
  WhatsAppAiUsageFilters,
  WhatsAppConversation,
  WhatsAppConversationFilters,
  WhatsAppOperationalBranchOption,
  WhatsAppMessage,
  WhatsAppProductChoiceGroup,
  WhatsAppProductSuggestions,
  WhatsAppOrderDraft,
  WhatsAppQuickReply,
  WhatsAppQuickReplyPresentation,
  WhatsAppQuickReplyPreview,
  WhatsAppQuickReplyFilters,
  WhatsAppTemplate,
  WhatsAppTemplateFilters,
  WhatsAppTemplateSendResult,
  WhatsAppTemplateSyncResult,
  WhatsAppStatus,
  WhatsAppTestConnectionResult,
  WhatsAppUnreadSummary,
  WhatsAppInboxLabel,
  WhatsAppInboxLabelDefinition,
  WhatsAppInboxSummary,
  SendWhatsAppTemplate,
  TenantAiSetting,
  TenantWhatsAppChannel,
  TenantWhatsAppSettings,
  UpdateTenantWhatsAppChannel,
} from '@/types/whatsapp'

export interface WhatsAppClosedDayPreview {
  branchId: number
  branchName: string
  closedDate: string | null
  conversationIds: number[]
  unavailableReason: string | null
}

export type WhatsAppClosedDayOutcome = 'sent' | 'skipped' | 'failed' | 'review'

export function whatsappWebhookUrl(): string {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  return `${api.replace(/\/$/, '')}/whatsapp/webhook`
}

class WhatsAppApi extends BaseApi {
  protected override handleError(error: any): Error {
    return Object.assign(super.handleError(error), { status: error.response?.status })
  }
  getCommercialDraft(id: number) {
    return this.get<ApiResponse<WhatsAppCommercialDraft | null>>(`/whatsapp/conversations/${id}/commercial-draft`)
  }
  startCommercialDraft(id: number, request: WhatsAppDraftWrite) {
    return this.post<ApiResponse<WhatsAppCommercialDraft>>(`/whatsapp/conversations/${id}/commercial-draft`, request)
  }
  saveCommercialDraft(id: number, request: WhatsAppDraftWrite) {
    return this.put<ApiResponse<WhatsAppCommercialDraft>>(`/whatsapp/conversations/${id}/commercial-draft`, request)
  }
  getProductSuggestions(id: number, messageIds: number[], signal?: AbortSignal) {
    return this.post<ApiResponse<WhatsAppProductSuggestions>>(`/whatsapp/conversations/${id}/product-suggestions`, { messageIds }, { signal })
  }
  sendCommercialAddressChoices(id: number, request: WhatsAppDraftWrite) {
    return this.manualPost<WhatsAppMessage[]>(`/whatsapp/conversations/${id}/commercial-draft/address-choices`, request)
  }
  getCommercialProductGroups(signal?: AbortSignal) {
    return this.get<ApiResponse<WhatsAppProductChoiceGroup[]>>('/whatsapp/quick-replies/catalog', { signal, branchScope: 'none' })
  }
  sendCommercialProductChoices(id: number, groupId: number, request: WhatsAppDraftWrite) {
    return this.manualPost<WhatsAppMessage[]>(`/whatsapp/conversations/${id}/commercial-draft/product-choices/${groupId}`, request)
  }
  commercialDraftAction(id: number, action: string, request: WhatsAppDraftWrite) {
    return this.post<ApiResponse<WhatsAppCommercialDraft>>(`/whatsapp/conversations/${id}/commercial-draft/${action}`, request, { timeout: 60000 })
  }

  getCoexistence(branchId: number) {
    return this.get<ApiResponse<CoexistenceStatus>>(`/branches/${branchId}/whatsapp-coexistence`)
  }
  startCoexistenceSignup(branchId: number) {
    return this.post<ApiResponse<{ appId: string; configurationId: string; graphApiVersion: string; session: string }>>(`/branches/${branchId}/whatsapp-coexistence/signup-session`, {})
  }
  connectCoexistence(branchId: number, payload: { session: string; code: string; wabaId: string; phoneNumberId?: string; displayPhoneNumber?: string }) {
    return this.post<ApiResponse<CoexistenceStatus>>(`/branches/${branchId}/whatsapp-coexistence/connect`, payload, { timeout: 150_000 })
  }
  recoverCoexistencePilot(branchId: number) {
    return this.post<ApiResponse<CoexistenceStatus>>(`/branches/${branchId}/whatsapp-coexistence/pilot-recover`, undefined, { timeout: 150_000 })
  }
  setCoexistencePilotCallback(branchId: number, active: boolean) {
    return this.post<ApiResponse<{ active: boolean }>>(`/branches/${branchId}/whatsapp-coexistence/pilot-callback`, { active })
  }
  checkCoexistence(branchId: number) {
    return this.post<ApiResponse<CoexistenceStatus>>(`/branches/${branchId}/whatsapp-coexistence/check`, {})
  }
  private manualPost<T>(url: string, payload: unknown): Promise<ApiResponse<T>> {
    const requestId = generatePosCreationKey()
    return resolveWhatsAppOperation<T>(
      () => this.post(url, payload, {
        headers: { 'X-WhatsApp-Request-Id': requestId },
        timeout: payload instanceof FormData ? 90_000 : 10_000,
      }),
      id => this.get(`/whatsapp/operations/${id}`, { branchScope: 'none' }),
    )
  }
  getTenantSettings(signal?: AbortSignal): Promise<ApiResponse<TenantWhatsAppSettings>> {
    return this.get<ApiResponse<TenantWhatsAppSettings>>('/tenant/whatsapp', { branchScope: 'none', signal })
  }

  saveTenantChannel(payload: UpdateTenantWhatsAppChannel): Promise<ApiResponse<TenantWhatsAppChannel>> {
    return this.put<ApiResponse<TenantWhatsAppChannel>>('/tenant/whatsapp/channel', payload, { branchScope: 'none' })
  }

  testTenantChannel(): Promise<ApiResponse<TenantWhatsAppChannel>> {
    return this.post<ApiResponse<TenantWhatsAppChannel>>('/tenant/whatsapp/channel/test-connection', {}, { branchScope: 'none' })
  }

  saveTenantAi(payload: TenantAiSetting): Promise<ApiResponse<TenantAiSetting>> {
    return this.put<ApiResponse<TenantAiSetting>>('/tenant/whatsapp/ai', payload, { branchScope: 'none' })
  }

  testTenantAi(): Promise<ApiResponse<TenantAiSetting>> {
    return this.post<ApiResponse<TenantAiSetting>>('/tenant/whatsapp/ai/test-connection', {}, { branchScope: 'none' })
  }
  getStatus(): Promise<ApiResponse<WhatsAppStatus>> {
    return this.get<ApiResponse<WhatsAppStatus>>('/whatsapp/status')
  }

  getUnreadSummary(): Promise<ApiResponse<WhatsAppUnreadSummary>> {
    return this.get<ApiResponse<WhatsAppUnreadSummary>>('/whatsapp/unread-summary')
  }

  getInboxLabels() {
    return this.get<ApiResponse<WhatsAppInboxLabel[]>>('/whatsapp/labels')
  }

  createInboxLabel(label: WhatsAppInboxLabelDefinition) {
    return this.post<ApiResponse<WhatsAppInboxLabel>>('/whatsapp/labels', label)
  }

  updateInboxLabel(key: string, label: WhatsAppInboxLabelDefinition) {
    return this.put<ApiResponse<WhatsAppInboxLabel>>(`/whatsapp/labels/${encodeURIComponent(key)}`, label)
  }

  deleteInboxLabel(key: string) {
    return this.delete<void>(`/whatsapp/labels/${encodeURIComponent(key)}`)
  }

  getInboxSummary(branchId?: number, unroutedOnly = false, signal?: AbortSignal) {
    return this.get<ApiResponse<WhatsAppInboxSummary>>('/whatsapp/inbox-summary', { params: { branchId, unroutedOnly }, signal })
  }

  setInboxLabel(conversationId: number, key: string, applied: boolean) {
    return this.put<ApiResponse<string[]>>(`/whatsapp/conversations/${conversationId}/labels/${encodeURIComponent(key)}`, { applied })
  }

  resetTakenLabels(branchId?: number, unroutedOnly = false) {
    return this.post<ApiResponse<{ clearedBefore: string }>>('/whatsapp/labels/taken/reset', { branchId, unroutedOnly })
  }

  previewClosedDayReplies(branchId?: number, signal?: AbortSignal) {
    return this.get<ApiResponse<WhatsAppClosedDayPreview>>('/whatsapp/closed-day-replies', { params: { branchId }, signal })
  }

  sendClosedDayReply(branchId: number, closedDate: string, conversationId: number, text: string) {
    return this.post<ApiResponse<WhatsAppClosedDayOutcome>>('/whatsapp/closed-day-replies',
      { branchId, closedDate, conversationId, text }, { timeout: 45_000 })
  }

  getAiDiagnostics(branchId: number, conversationId?: number | null, take = 20): Promise<ApiResponse<WhatsAppAiDiagnostics>> {
    return this.get<ApiResponse<WhatsAppAiDiagnostics>>('/whatsapp/ai-diagnostics', {
      params: {
        branchId,
        ...(conversationId ? { conversationId } : {}),
        take,
      },
    })
  }

  getAiUsage(filters: WhatsAppAiUsageFilters): Promise<ApiResponse<WhatsAppAiUsage>> {
    return this.get<ApiResponse<WhatsAppAiUsage>>('/whatsapp/ai-usage', { params: filters })
  }

  getBranchSetting(branchId: number): Promise<ApiResponse<WhatsAppBranchSetting>> {
    return this.get<ApiResponse<WhatsAppBranchSetting>>(`/branches/${branchId}/whatsapp-settings`)
  }

  saveBranchSetting(branchId: number, payload: UpsertWhatsAppBranchSetting): Promise<ApiResponse<WhatsAppBranchSetting>> {
    return this.put<ApiResponse<WhatsAppBranchSetting>>(`/branches/${branchId}/whatsapp-settings`, payload)
  }

  testBranchConnection(branchId: number): Promise<ApiResponse<WhatsAppTestConnectionResult>> {
    return this.post<ApiResponse<WhatsAppTestConnectionResult>>(`/branches/${branchId}/whatsapp-settings/test-connection`, {})
  }

  getConversationPage(filters?: WhatsAppConversationFilters, signal?: AbortSignal, cursor?: string) {
    return this.get<ApiResponse<WhatsAppConversationPage>>('/whatsapp/conversations/page', { params: { ...filters, cursor, limit: 50 }, signal })
  }
  getConversations(filters?: WhatsAppConversationFilters, signal?: AbortSignal): Promise<ApiResponse<WhatsAppConversation[]>> {
    return this.get<ApiResponse<WhatsAppConversation[]>>('/whatsapp/conversations', { params: filters, signal })
  }
  getConversation(conversationId: number) {
    return this.get<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}`)
  }

  getOperationalBranches(): Promise<ApiResponse<WhatsAppOperationalBranchOption[]>> {
    return this.get<ApiResponse<WhatsAppOperationalBranchOption[]>>('/whatsapp/operational-branches')
  }

  updateOperationalBranch(conversationId: number, branchId: number | null, expectedVersion: number): Promise<ApiResponse<WhatsAppConversation>> {
    return this.put<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}/operational-branch`, { branchId, expectedVersion })
  }

  getMessages(conversationId: number, signal?: AbortSignal): Promise<ApiResponse<WhatsAppMessage[]>> {
    return this.get<ApiResponse<WhatsAppMessage[]>>(`/whatsapp/conversations/${conversationId}/messages`, { signal })
  }
  getMessagesPage(conversationId: number, signal?: AbortSignal, before?: string) {
    return this.get<ApiResponse<{ items: WhatsAppMessage[]; nextCursor: string | null; hasMore: boolean }>>(
      `/whatsapp/conversations/${conversationId}/messages/page`, { signal, params: { limit: 50, before } })
  }
  getOrderDraft(conversationId: number): Promise<ApiResponse<WhatsAppOrderDraft>> {
    return this.get<ApiResponse<WhatsAppOrderDraft>>(`/whatsapp/conversations/${conversationId}/order-draft`)
  }
  updateOrderDraftFulfillment(conversationId: number, orderType: 'onsite' | 'delivery', addressId?: number | null): Promise<ApiResponse<string>> {
    return this.put<ApiResponse<string>>(`/whatsapp/conversations/${conversationId}/order-draft/fulfillment`, { orderType, addressId: addressId ?? null })
  }
  getAttention(conversationId: number) { return this.get<ApiResponse<import('@/types/whatsapp').WhatsAppAttention>>(`/whatsapp/conversations/${conversationId}/attention`) }
  changeAttention(conversationId: number, action: import('@/types/whatsapp').WhatsAppAttentionAction, expectedVersion: number, targetUserId?: number, reason?: string) {
    return this.post<ApiResponse<import('@/types/whatsapp').WhatsAppAttention>>(`/whatsapp/conversations/${conversationId}/attention-actions`, { action, expectedVersion, targetUserId, reason })
  }
  getAdvisors(conversationId: number) {
    return this.get<ApiResponse<{ id: number; name: string; branchId: number }[]>>(`/whatsapp/conversations/${conversationId}/advisors`)
  }
  getConversationTemplates(conversationId: number) {
    return this.get<ApiResponse<import('@/types/whatsapp').WhatsAppConversationTemplate[]>>(`/whatsapp/conversations/${conversationId}/templates`)
  }
  sendConversationTemplate(conversationId: number, templateName: string, language: string, parameters: string[]) {
    return this.manualPost<WhatsAppMessage>(`/whatsapp/conversations/${conversationId}/messages/template`, { templateName, language, parameters })
  }

  resetConversationForTesting(conversationId: number): Promise<ApiResponse<WhatsAppConversation>> {
    return this.delete<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}/test-context`)
  }

  linkConversationCustomer(conversationId: number, customerId: number): Promise<ApiResponse<WhatsAppConversation>> {
    return this.post<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}/customer`, { customerId })
  }

  sendMessage(conversationId: number, text: string): Promise<ApiResponse<WhatsAppMessage>> {
    return this.manualPost<WhatsAppMessage>(`/whatsapp/conversations/${conversationId}/messages`, { text })
  }
  sendMenu(conversationId: number): Promise<ApiResponse<WhatsAppMessage>> {
    return this.manualPost<WhatsAppMessage>(`/whatsapp/conversations/${conversationId}/messages/menu`, {})
  }

  sendQuickReply(conversationId: number, quickReplyId: number): Promise<ApiResponse<WhatsAppMessage>> {
    return this.manualPost<WhatsAppMessage>(`/whatsapp/conversations/${conversationId}/messages/quick-reply`, { quickReplyId })
  }

  sendMediaMessage(conversationId: number, file: File, caption?: string): Promise<ApiResponse<WhatsAppMessage>> {
    const fd = new FormData()
    fd.append('file', file)
    if (caption?.trim()) fd.append('caption', caption.trim())
    return this.manualPost<WhatsAppMessage>(`/whatsapp/conversations/${conversationId}/messages/media`, fd)
  }

  getQuickReplies(filters?: WhatsAppQuickReplyFilters): Promise<ApiResponse<WhatsAppQuickReply[]>> {
    return this.get<ApiResponse<WhatsAppQuickReply[]>>('/whatsapp/quick-replies', { params: filters })
  }

  previewQuickReply(conversationId: number, replyId: number, presentation: Partial<WhatsAppQuickReplyPresentation> = {}) {
    return this.post<ApiResponse<WhatsAppQuickReplyPreview>>(
      `/whatsapp/conversations/${conversationId}/quick-replies/${replyId}/preview`, presentation,
    )
  }

  createQuickReply(payload: UpsertWhatsAppQuickReply): Promise<ApiResponse<WhatsAppQuickReply>> {
    return this.post<ApiResponse<WhatsAppQuickReply>>('/whatsapp/quick-replies', payload)
  }

  updateQuickReply(id: number, payload: UpsertWhatsAppQuickReply): Promise<ApiResponse<WhatsAppQuickReply>> {
    return this.put<ApiResponse<WhatsAppQuickReply>>(`/whatsapp/quick-replies/${id}`, payload)
  }

  deleteQuickReply(id: number): Promise<ApiResponse<string>> {
    return this.delete<ApiResponse<string>>(`/whatsapp/quick-replies/${id}`)
  }

  syncTemplates(branchId?: number | null): Promise<ApiResponse<WhatsAppTemplateSyncResult>> {
    return this.manualPost<WhatsAppTemplateSyncResult>('/whatsapp/templates/sync', { branchId: branchId || null })
  }

  getTemplates(filters?: WhatsAppTemplateFilters, signal?: AbortSignal): Promise<ApiResponse<WhatsAppTemplate[]>> {
    return this.get<ApiResponse<WhatsAppTemplate[]>>('/whatsapp/templates', { params: filters, signal })
  }

  sendTemplate(payload: SendWhatsAppTemplate): Promise<ApiResponse<WhatsAppTemplateSendResult>> {
    return this.manualPost<WhatsAppTemplateSendResult>('/whatsapp/send-template', payload)
  }
}

export const whatsappApi = new WhatsAppApi()

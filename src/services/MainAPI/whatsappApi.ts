import { BaseApi } from './baseApi'
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
  WhatsAppMessage,
  WhatsAppQuickReply,
  WhatsAppQuickReplyFilters,
  WhatsAppTemplate,
  WhatsAppTemplateFilters,
  WhatsAppTemplateSendResult,
  WhatsAppTemplateSyncResult,
  WhatsAppStatus,
  WhatsAppTestConnectionResult,
  WhatsAppUnreadSummary,
  SendWhatsAppTemplate,
} from '@/types/whatsapp'

export function whatsappWebhookUrl(): string {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  return `${api.replace(/\/$/, '')}/whatsapp/webhook`
}

class WhatsAppApi extends BaseApi {
  getStatus(): Promise<ApiResponse<WhatsAppStatus>> {
    return this.get<ApiResponse<WhatsAppStatus>>('/whatsapp/status')
  }

  getUnreadSummary(): Promise<ApiResponse<WhatsAppUnreadSummary>> {
    return this.get<ApiResponse<WhatsAppUnreadSummary>>('/whatsapp/unread-summary')
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

  getConversations(filters?: WhatsAppConversationFilters): Promise<ApiResponse<WhatsAppConversation[]>> {
    return this.get<ApiResponse<WhatsAppConversation[]>>('/whatsapp/conversations', { params: filters })
  }

  getMessages(conversationId: number): Promise<ApiResponse<WhatsAppMessage[]>> {
    return this.get<ApiResponse<WhatsAppMessage[]>>(`/whatsapp/conversations/${conversationId}/messages`)
  }
  getAttention(conversationId: number) { return this.get<ApiResponse<import('@/types/whatsapp').WhatsAppAttention>>(`/whatsapp/conversations/${conversationId}/attention`) }
  changeAttention(conversationId: number, action: 'take' | 'return-to-ai' | 'pause-ai' | 'request-human' | 'close' | 'reopen') { return this.post<ApiResponse<import('@/types/whatsapp').WhatsAppAttention>>(`/whatsapp/conversations/${conversationId}/${action}`, {}) }

  linkConversationCustomer(conversationId: number, customerId: number): Promise<ApiResponse<WhatsAppConversation>> {
    return this.post<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}/customer`, { customerId })
  }

  sendMessage(conversationId: number, text: string): Promise<ApiResponse<WhatsAppMessage>> {
    return this.post<ApiResponse<WhatsAppMessage>>(`/whatsapp/conversations/${conversationId}/messages`, { text })
  }
  sendMenu(conversationId: number): Promise<ApiResponse<WhatsAppMessage>> {
    return this.post<ApiResponse<WhatsAppMessage>>(`/whatsapp/conversations/${conversationId}/messages/menu`, {})
  }

  sendQuickReply(conversationId: number, quickReplyId: number): Promise<ApiResponse<WhatsAppMessage>> {
    return this.post<ApiResponse<WhatsAppMessage>>(`/whatsapp/conversations/${conversationId}/messages/quick-reply`, { quickReplyId })
  }

  sendMediaMessage(conversationId: number, file: File, caption?: string): Promise<ApiResponse<WhatsAppMessage>> {
    const fd = new FormData()
    fd.append('file', file)
    if (caption?.trim()) fd.append('caption', caption.trim())
    return this.post<ApiResponse<WhatsAppMessage>>(`/whatsapp/conversations/${conversationId}/messages/media`, fd)
  }

  getQuickReplies(filters?: WhatsAppQuickReplyFilters): Promise<ApiResponse<WhatsAppQuickReply[]>> {
    return this.get<ApiResponse<WhatsAppQuickReply[]>>('/whatsapp/quick-replies', { params: filters })
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
    return this.post<ApiResponse<WhatsAppTemplateSyncResult>>('/whatsapp/templates/sync', { branchId: branchId || null })
  }

  getTemplates(filters?: WhatsAppTemplateFilters): Promise<ApiResponse<WhatsAppTemplate[]>> {
    return this.get<ApiResponse<WhatsAppTemplate[]>>('/whatsapp/templates', { params: filters })
  }

  sendTemplate(payload: SendWhatsAppTemplate): Promise<ApiResponse<WhatsAppTemplateSendResult>> {
    return this.post<ApiResponse<WhatsAppTemplateSendResult>>('/whatsapp/send-template', payload)
  }
}

export const whatsappApi = new WhatsAppApi()

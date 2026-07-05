import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type {
  UpsertWhatsAppBranchSetting,
  UpsertWhatsAppQuickReply,
  WhatsAppBranchSetting,
  WhatsAppConversation,
  WhatsAppConversationFilters,
  WhatsAppMessage,
  WhatsAppQuickReply,
  WhatsAppQuickReplyFilters,
  WhatsAppStatus,
  WhatsAppTestConnectionResult,
  WhatsAppUnreadSummary,
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

  linkConversationCustomer(conversationId: number, customerId: number): Promise<ApiResponse<WhatsAppConversation>> {
    return this.post<ApiResponse<WhatsAppConversation>>(`/whatsapp/conversations/${conversationId}/customer`, { customerId })
  }

  sendMessage(conversationId: number, text: string): Promise<ApiResponse<WhatsAppMessage>> {
    return this.post<ApiResponse<WhatsAppMessage>>(`/whatsapp/conversations/${conversationId}/messages`, { text })
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
}

export const whatsappApi = new WhatsAppApi()

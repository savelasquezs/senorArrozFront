import type { WhatsAppConversation, WhatsAppInboxKey } from '@/types/whatsapp'

export interface WhatsAppInboxSection {
  key: WhatsAppInboxKey
  label: string
  conversations: WhatsAppConversation[]
}

export function canReadWhatsAppRouting(
  conversation: Pick<WhatsAppConversation, 'isCentralChannel' | 'operationalBranchId' | 'assignedUserId'>,
  branchId: number, userId: number | undefined, userBranchId: number | undefined, isSuperadmin: boolean,
) {
  if (!userId) return false
  if (isSuperadmin) return true
  return conversation.isCentralChannel
    ? !conversation.operationalBranchId || conversation.operationalBranchId === userBranchId || conversation.assignedUserId === userId
    : branchId === userBranchId
}

export function buildWhatsAppInboxSections(
  conversations: WhatsAppConversation[], currentUserId: number | undefined,
  _currentBranchId?: number, _isSuperadmin?: boolean,
): WhatsAppInboxSection[] {
  const sections: WhatsAppInboxSection[] = [
    { key: 'free', label: 'Libres', conversations: [] }, { key: 'mine', label: 'Míos', conversations: [] },
    { key: 'team', label: 'Equipo', conversations: [] }, { key: 'closed', label: 'Cerrados', conversations: [] },
  ]
  for (const conversation of conversations) {
    if (!_isSuperadmin && conversation.isCentralChannel && conversation.operationalBranchId
      && conversation.operationalBranchId !== _currentBranchId && conversation.assignedUserId !== currentUserId) continue
    const key = conversation.attentionMode === 'closed' ? 'closed'
      : conversation.assignedUserId === currentUserId && currentUserId ? 'mine'
        : conversation.assignedUserId ? 'team' : 'free'
    sections.find(section => section.key === key)!.conversations.push(conversation)
  }
  for (const section of sections) section.conversations.sort((a, b) =>
    commercialPriority(a) - commercialPriority(b)
      || Number(Boolean(b.needsHumanResponse)) - Number(Boolean(a.needsHumanResponse))
      || Date.parse(b.lastMessageAt || b.createdAt) - Date.parse(a.lastMessageAt || a.createdAt) || b.id - a.id)
  return sections
}

export function whatsappConversationBranchLabel(conversation: WhatsAppConversation): string {
  if (conversation.isCentralChannel)
    return conversation.operationalBranchName || 'Sin asignar'
  return conversation.branchName || 'Sucursal sin nombre'
}

function commercialPriority(conversation: WhatsAppConversation) {
  if (conversation.needsHumanResponse || conversation.unreadCount > 0 || conversation.commercialStatus === 'in_progress') return 0
  if (conversation.commercialStatus === 'waiting_customer') return 1
  return 2
}
export function commercialGroup(conversation: WhatsAppConversation): string {
  return ['Requieren acción', 'Esperando cliente', 'Gestionados'][commercialPriority(conversation)]!
}
export function commercialLabel(conversation: WhatsAppConversation): string {
  const labels: Record<string, string> = { not_started: 'Sin iniciar', in_progress: 'En proceso', waiting_customer: 'Esperando cliente', order_taken: 'Pedido tomado', no_sale: 'Sin venta / Cancelado' }
  return `${labels[conversation.commercialStatus || 'not_started'] || 'Sin iniciar'}${conversation.commercialOrderId ? ` · #${conversation.commercialOrderId}` : ''}`
}

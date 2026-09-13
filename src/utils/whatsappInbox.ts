import type { WhatsAppConversation } from '@/types/whatsapp'

export interface WhatsAppInboxSection {
  key: 'branch' | 'assigned' | 'unassigned'
  label: string
  conversations: WhatsAppConversation[]
}

export function buildWhatsAppInboxSections(
  conversations: WhatsAppConversation[],
  currentUserId: number | undefined,
  currentBranchId: number | undefined,
  isSuperadmin: boolean,
): WhatsAppInboxSection[] {
  const unassigned: WhatsAppConversation[] = []
  const assigned: WhatsAppConversation[] = []
  const branch: WhatsAppConversation[] = []

  for (const conversation of conversations) {
    if (conversation.isCentralChannel && !conversation.operationalBranchId) {
      unassigned.push(conversation)
    } else if (!isSuperadmin
      && conversation.isCentralChannel
      && conversation.operationalBranchId !== currentBranchId
      && conversation.assignedUserId === currentUserId) {
      assigned.push(conversation)
    } else if (isSuperadmin
      || !conversation.isCentralChannel
      || conversation.operationalBranchId === currentBranchId) {
      branch.push(conversation)
    }
  }

  return [
    { key: 'unassigned', label: 'Sin asignar', conversations: unassigned },
    { key: 'assigned', label: 'Asignadas a mí', conversations: assigned },
    { key: 'branch', label: isSuperadmin ? 'Sucursales' : 'Mi sucursal', conversations: branch },
  ].filter(section => section.conversations.length > 0) as WhatsAppInboxSection[]
}

export function whatsappConversationBranchLabel(conversation: WhatsAppConversation): string {
  if (conversation.isCentralChannel)
    return conversation.operationalBranchName || 'Sin asignar'
  return conversation.branchName || 'Sucursal sin nombre'
}

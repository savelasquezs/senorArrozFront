import type { WhatsAppConversation } from '@/types/whatsapp'

export interface WhatsAppInboxSection {
  key: 'branch' | 'assigned' | 'unassigned'
  label: string
  conversations: WhatsAppConversation[]
}

const sectionPriority: Record<WhatsAppInboxSection['key'], number> = {
  unassigned: 0,
  assigned: 1,
  branch: 2,
}

function conversationActivityAt(conversation: WhatsAppConversation): number {
  const timestamp = Date.parse(conversation.lastMessageAt || conversation.createdAt)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortConversationsByLatest(conversations: WhatsAppConversation[]) {
  conversations.sort((a, b) => conversationActivityAt(b) - conversationActivityAt(a))
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

  sortConversationsByLatest(unassigned)
  sortConversationsByLatest(assigned)
  sortConversationsByLatest(branch)

  return [
    { key: 'unassigned', label: 'Sin asignar', conversations: unassigned },
    { key: 'assigned', label: 'Asignadas a mí', conversations: assigned },
    { key: 'branch', label: isSuperadmin ? 'Sucursales' : 'Mi sucursal', conversations: branch },
  ]
    .filter(section => section.conversations.length > 0)
    .sort((a, b) => {
      const latestDifference = conversationActivityAt(b.conversations[0]) - conversationActivityAt(a.conversations[0])
      return latestDifference || sectionPriority[a.key] - sectionPriority[b.key]
    }) as WhatsAppInboxSection[]
}

export function whatsappConversationBranchLabel(conversation: WhatsAppConversation): string {
  if (conversation.isCentralChannel)
    return conversation.operationalBranchName || 'Sin asignar'
  return conversation.branchName || 'Sucursal sin nombre'
}

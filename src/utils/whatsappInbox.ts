import type { WhatsAppConversation, WhatsAppInboxKey, WhatsAppInboxLabel, WhatsAppInboxLabelColor, WhatsAppMessage } from '@/types/whatsapp'

export const inboxLabelPalette = {
  violet: { name: 'Morado', style: 'bg-violet-700 text-white' },
  amber: { name: 'Mostaza', style: 'bg-yellow-700 text-white' },
  orange: { name: 'Naranja', style: 'bg-orange-700 text-white' },
  emerald: { name: 'Verde oscuro', style: 'bg-emerald-800 text-white' },
  blue: { name: 'Azul', style: 'bg-blue-700 text-white' },
  teal: { name: 'Verde petróleo', style: 'bg-teal-800 text-white' },
  rose: { name: 'Fucsia', style: 'bg-pink-700 text-white' },
  slate: { name: 'Gris pizarra', style: 'bg-slate-700 text-white' },
} satisfies Record<WhatsAppInboxLabelColor, { name: string; style: string }>

export const fixedInboxLabelStyles: Record<string, { name: string; style: string }> = {
  supplier: { name: 'Proveedor', style: 'bg-violet-700 text-white' },
  pending: { name: 'Pendiente', style: 'bg-amber-300 text-amber-950' },
  taken: { name: 'Tomado', style: 'bg-emerald-700 text-white' },
  payment_pending: { name: 'Pendiente de pago', style: 'bg-rose-700 text-white' },
}

export function inboxLabelColor(key: string, color?: WhatsAppInboxLabel['color']): string {
  return (color ? inboxLabelPalette[color]?.style : undefined)
    ?? fixedInboxLabelStyles[key]?.style
    ?? inboxLabelPalette[key.startsWith('branch:') ? 'blue' : 'slate'].style
}

export interface WhatsAppInboxSection {
  key: WhatsAppInboxKey
  label: string
  conversations: WhatsAppConversation[]
}

export const whatsappInboxLabels: Record<WhatsAppInboxKey, string> = {
  free: 'Libres', mine: 'Míos', team: 'Equipo', closed: 'Cerrados',
}

export function whatsappConversationInbox(conversation: WhatsAppConversation, currentUserId: number | undefined): WhatsAppInboxKey {
  if (conversation.attentionMode === 'closed') return 'closed'
  if (!conversation.assignedUserId) return 'free'
  return conversation.assignedUserId === currentUserId ? 'mine' : 'team'
}

export function compareWhatsAppConversationActivity(a: WhatsAppConversation, b: WhatsAppConversation) {
  const activity = (conversation: WhatsAppConversation) => Date.parse(conversation.lastMessageAt || conversation.createdAt)
  return activity(b) - activity(a) || b.id - a.id
}

export function mediaPreviewLabel(type: WhatsAppMessage['type']) {
  const labels: Record<WhatsAppMessage['type'], string> = {
    text: '',
    image: 'Imagen',
    audio: 'Audio',
    video: 'Video',
    document: 'Documento',
    sticker: 'Sticker',
    location: 'Ubicación compartida',
    contacts: 'Contacto compartido',
  }
  return labels[type] || 'Archivo'
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
    { key: 'free', label: whatsappInboxLabels.free, conversations: [] }, { key: 'mine', label: whatsappInboxLabels.mine, conversations: [] },
    { key: 'team', label: whatsappInboxLabels.team, conversations: [] }, { key: 'closed', label: whatsappInboxLabels.closed, conversations: [] },
  ]
  for (const conversation of conversations) {
    if (!_isSuperadmin && conversation.isCentralChannel && conversation.operationalBranchId
      && conversation.operationalBranchId !== _currentBranchId && conversation.assignedUserId !== currentUserId) continue
    const key = whatsappConversationInbox(conversation, currentUserId)
    sections.find(section => section.key === key)!.conversations.push(conversation)
  }
  for (const section of sections) section.conversations.sort(compareWhatsAppConversationActivity)
  return sections
}

export function whatsappConversationBranchLabel(conversation: WhatsAppConversation): string {
  if (conversation.isCentralChannel)
    return conversation.operationalBranchName || 'Sin asignar'
  return conversation.branchName || 'Sucursal sin nombre'
}

export function conversationTitle(conversation: WhatsAppConversation) {
  return conversation.operationalContact?.name || conversation.contactName || conversation.customerName || conversation.whatsAppUsername || conversation.phoneNumber || 'Usuario de WhatsApp'
}

export function operationalContactLabel(conversation: WhatsAppConversation) {
  const kind = conversation.operationalContact?.kind
  return kind === 'deliveryman' ? 'Domiciliario' : kind === 'supplier' ? 'Proveedor' : ''
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

export function whatsappTemplateBody(componentsJson: string) {
  try {
    const components = JSON.parse(componentsJson) as { type: string; text?: string }[]
    return components.find(component => component.type.toUpperCase() === 'BODY')?.text ?? ''
  } catch {
    return ''
  }
}

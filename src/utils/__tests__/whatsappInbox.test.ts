import { describe, expect, it } from 'vitest'
import type { WhatsAppConversation } from '@/types/whatsapp'
import { buildWhatsAppInboxSections, canReadWhatsAppRouting, commercialGroup, commercialLabel, whatsappConversationBranchLabel } from '@/utils/whatsappInbox'

function conversation(overrides: Partial<WhatsAppConversation>): WhatsAppConversation {
  return {
    id: 1,
    branchId: 1,
    isCentralChannel: true,
    hasWhatsAppIdentity: false,
    status: 'open',
    unreadCount: 0,
    attentionMode: 'human',
    attentionModeUpdatedAt: '2026-09-12T00:00:00Z',
    createdAt: '2026-09-12T00:00:00Z',
    updatedAt: '2026-09-12T00:00:00Z',
    ...overrides,
  }
}

describe('WhatsApp inbox sections', () => {
  it('places incomplete orders before managed conversations and reopens attention without a new attempt', () => {
    const managed = conversation({ id: 1, commercialStatus: 'order_taken', commercialOrderId: 91, lastMessageAt: '2026-11-05T15:00:00Z' })
    const pending = conversation({ id: 2, commercialStatus: 'in_progress', lastMessageAt: '2026-11-01T15:00:00Z' })
    const waiting = conversation({ id: 3, commercialStatus: 'waiting_customer', lastMessageAt: '2026-11-02T15:00:00Z' })
    expect(buildWhatsAppInboxSections([managed, waiting, pending], 7, 1, false)[0].conversations.map(c => c.id)).toEqual([2, 3, 1])
    expect(commercialGroup(waiting)).toBe('Esperando cliente')
    expect(commercialLabel(managed)).toBe('Pedido tomado · #91')
    managed.needsHumanResponse = true
    expect(commercialGroup(managed)).toBe('Requieren acción')
    expect(managed.commercialOrderId).toBe(91)
    expect(managed.commercialStatus).toBe('order_taken')
  })
  it('keeps legitimate branch supervision when a user-group invalidation overlaps a branch event', () => {
    expect(canReadWhatsAppRouting(conversation({ operationalBranchId: 1, assignedUserId: 8 }), 1, 7, 1, false)).toBe(true)
    expect(canReadWhatsAppRouting(conversation({ operationalBranchId: 2, assignedUserId: 8 }), 2, 7, 1, false)).toBe(false)
    expect(canReadWhatsAppRouting(conversation({ operationalBranchId: 2, assignedUserId: 7 }), 2, 7, 1, false)).toBe(true)
  })
  it('groups by ownership independently of routing and keeps all four views', () => {
    const own = conversation({ id: 1, operationalBranchId: 1, assignedUserId: 7 })
    const remote = conversation({ id: 2, operationalBranchId: 2, assignedUserId: 7 })
    const free = conversation({ id: 3, operationalBranchId: null })
    const team = conversation({ id: 4, operationalBranchId: 1, assignedUserId: 8 })
    const closed = conversation({ id: 5, operationalBranchId: 1, attentionMode: 'closed', assignedUserId: 7 })
    const sections = buildWhatsAppInboxSections([own, remote, free, team, closed], 7, 1, false)
    expect(sections.map(s => [s.label, s.conversations.map(c => c.id)])).toEqual([
      ['Libres', [3]], ['Míos', [2, 1]], ['Equipo', [4]], ['Cerrados', [5]],
    ])
    expect(whatsappConversationBranchLabel(free)).toContain('Sin asignar')
  })
  it('prioritizes a required response even after reading an older conversation', () => {
    const pending = conversation({ id: 1, needsHumanResponse: true, unreadCount: 0, lastMessageAt: '2026-09-12T00:00:00Z' })
    const recent = conversation({ id: 2, lastMessageAt: '2026-09-13T00:00:00Z' })
    expect(buildWhatsAppInboxSections([recent, pending], 7, 1, false)[0].conversations.map(c => c.id)).toEqual([1, 2])
  })
  it('does not retain a cached inaccessible conversation from another branch', () => {
    const hidden = conversation({ id: 4, operationalBranchId: 2, assignedUserId: 8 })
    expect(buildWhatsAppInboxSections([hidden], 7, 1, false).flatMap(s => s.conversations)).toEqual([])
  })
  it('keeps the same views for supervisors with access to other branches', () => {
    const routed = conversation({ id: 8, operationalBranchId: 2, assignedUserId: 9 })
    const sections = buildWhatsAppInboxSections([routed], 7, 1, true)
    expect(sections).toHaveLength(4)
    expect(sections.find(s => s.key === 'team')?.conversations).toEqual([routed])
  })
})

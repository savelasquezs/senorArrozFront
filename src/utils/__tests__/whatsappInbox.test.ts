import { describe, expect, it } from 'vitest'
import type { WhatsAppConversation } from '@/types/whatsapp'
import { buildWhatsAppInboxSections, whatsappConversationBranchLabel } from '@/utils/whatsappInbox'

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
  it('uses unassigned, personal and branch priority when activity time is tied', () => {
    const own = conversation({ id: 1, operationalBranchId: 1, operationalBranchName: 'Santander', assignedUserId: 7 })
    const assigned = conversation({ id: 2, operationalBranchId: 2, operationalBranchName: 'Manrique', assignedUserId: 7 })
    const unassigned = conversation({ id: 3, operationalBranchId: null, operationalBranchName: null, assignedUserId: 7 })

    const sections = buildWhatsAppInboxSections([own, assigned, unassigned], 7, 1, false)

    expect(sections.map(section => [section.label, section.conversations.map(item => item.id)])).toEqual([
      ['Sin asignar', [3]],
      ['Asignadas a mí', [2]],
      ['Mi sucursal', [1]],
    ])
    expect(sections.flatMap(section => section.conversations)).toHaveLength(3)
    expect(whatsappConversationBranchLabel(assigned)).toBe('Manrique')
    expect(whatsappConversationBranchLabel(unassigned)).toBe('Sin asignar')
  })

  it('puts the section with the newest message first and sorts conversations inside each section by latest activity', () => {
    const branchOld = conversation({
      id: 10,
      operationalBranchId: 1,
      lastMessageAt: '2026-09-12T10:00:00Z',
    })
    const branchNew = conversation({
      id: 11,
      operationalBranchId: 1,
      lastMessageAt: '2026-09-12T12:00:00Z',
    })
    const unassigned = conversation({
      id: 12,
      operationalBranchId: null,
      lastMessageAt: '2026-09-12T11:00:00Z',
    })

    const sections = buildWhatsAppInboxSections([branchOld, unassigned, branchNew], 7, 1, false)

    expect(sections.map(section => [section.label, section.conversations.map(item => item.id)])).toEqual([
      ['Mi sucursal', [11, 10]],
      ['Sin asignar', [12]],
    ])
  })

  it('does not surface another branch conversation assigned to a different cashier', () => {
    const hidden = conversation({ id: 4, operationalBranchId: 2, assignedUserId: 8 })

    expect(buildWhatsAppInboxSections([hidden], 7, 1, false)).toEqual([])
  })

  it('keeps the superadmin global grouping without a personal section', () => {
    const routed = conversation({ id: 5, operationalBranchId: 2, assignedUserId: 7 })

    const sections = buildWhatsAppInboxSections([routed], 7, 1, true)

    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Sucursales')
    expect(sections[0].conversations).toEqual([routed])
  })
})

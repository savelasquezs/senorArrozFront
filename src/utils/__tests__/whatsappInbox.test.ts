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
  it('separates own branch, personally assigned cross-branch and unassigned conversations without duplicates', () => {
    const own = conversation({ id: 1, operationalBranchId: 1, operationalBranchName: 'Santander', assignedUserId: 7 })
    const assigned = conversation({ id: 2, operationalBranchId: 2, operationalBranchName: 'Manrique', assignedUserId: 7 })
    const unassigned = conversation({ id: 3, operationalBranchId: null, operationalBranchName: null, assignedUserId: 7 })

    const sections = buildWhatsAppInboxSections([own, assigned, unassigned], 7, 1, false)

    expect(sections.map(section => [section.label, section.conversations.map(item => item.id)])).toEqual([
      ['Mi sucursal', [1]],
      ['Asignadas a mí', [2]],
      ['Sin asignar', [3]],
    ])
    expect(sections.flatMap(section => section.conversations)).toHaveLength(3)
    expect(whatsappConversationBranchLabel(assigned)).toBe('Manrique')
    expect(whatsappConversationBranchLabel(unassigned)).toBe('Sin asignar')
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

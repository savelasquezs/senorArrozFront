import { describe, expect, it } from 'vitest'
import { matchesWhatsAppUsername, normalizeWhatsAppUsername } from '../whatsappIdentity'

describe('WhatsApp identity helpers', () => {
  it('normalizes usernames with lowercase and a single @', () => {
    expect(normalizeWhatsAppUsername('  @@VillaA_999 ')).toBe('@villaa_999')
  })

  it('matches partial usernames with or without @ and case-insensitively', () => {
    expect(matchesWhatsAppUsername('@villaa_999', 'VILLA')).toBe(true)
    expect(matchesWhatsAppUsername('@villaa_999', '@villa')).toBe(true)
    expect(matchesWhatsAppUsername('@villaa_999', 'cliente')).toBe(false)
  })
})

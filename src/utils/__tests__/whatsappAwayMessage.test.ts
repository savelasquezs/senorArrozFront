import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WHATSAPP_AWAY_MESSAGE,
  validateWhatsAppAwayMessage,
} from '@/utils/whatsappAwayMessage'

describe('validateWhatsAppAwayMessage', () => {
  it('accepts the default template and known variables case-insensitively', () => {
    expect(validateWhatsAppAwayMessage(DEFAULT_WHATSAPP_AWAY_MESSAGE)).toBeNull()
    expect(validateWhatsAppAwayMessage('Hola {{ branchname }}, abrimos {{NEXTOPENING}}.')).toBeNull()
  })

  it('rejects empty, unknown and incomplete variables', () => {
    expect(validateWhatsAppAwayMessage('')).toContain('Escribe')
    expect(validateWhatsAppAwayMessage('{{CustomerName}}')).toContain('no está disponible')
    expect(validateWhatsAppAwayMessage('Hola {{BranchName')).toContain('incompleta')
  })
})

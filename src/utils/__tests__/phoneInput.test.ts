import { describe, expect, it } from 'vitest'
import { isLikelyPhoneNumber, normalizePhoneForSearch } from '../phoneInput'

describe('phone input helpers', () => {
  it('recognizes and normalizes a Colombian WhatsApp phone number', () => {
    const pasted = '+57 300 123 4567'

    expect(isLikelyPhoneNumber(pasted)).toBe(true)
    expect(normalizePhoneForSearch(pasted)).toBe('3001234567')
  })

  it('normalizes spaces, parentheses and hyphens in phone numbers', () => {
    const pasted = '(601) 234-5678'

    expect(isLikelyPhoneNumber(pasted)).toBe(true)
    expect(normalizePhoneForSearch(pasted)).toBe('6012345678')
  })

  it('does not classify names or WhatsApp usernames as phone numbers', () => {
    expect(isLikelyPhoneNumber('María 300')).toBe(false)
    expect(isLikelyPhoneNumber('@villaa_999')).toBe(false)
    expect(isLikelyPhoneNumber('2026-08-02')).toBe(false)
  })
})

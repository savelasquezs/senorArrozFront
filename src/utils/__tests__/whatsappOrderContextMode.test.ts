import { describe, expect, it } from 'vitest'
import { whatsappOrderContextMode } from '@/utils/whatsappOrderContextMode'

describe('whatsappOrderContextMode', () => {
  it('uses the automatic draft only while AI owns the conversation', () => {
    expect(whatsappOrderContextMode('ai')).toBe('ai')
  })

  it('enables manual order management only for human attention', () => {
    expect(whatsappOrderContextMode('human')).toBe('manual')
  })

  it.each(['waitingForHuman', 'paused', 'closed'] as const)(
    'blocks order management in %s mode',
    (mode) => {
      expect(whatsappOrderContextMode(mode)).toBe('blocked')
    },
  )
})

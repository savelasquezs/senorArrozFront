import type { WhatsAppAttentionMode } from '@/types/whatsapp'

export type WhatsAppOrderContextMode = 'ai' | 'manual' | 'blocked'

export function whatsappOrderContextMode(
  attentionMode?: WhatsAppAttentionMode | null,
): WhatsAppOrderContextMode {
  if (attentionMode === 'ai') return 'ai'
  if (attentionMode === 'human') return 'manual'
  return 'blocked'
}

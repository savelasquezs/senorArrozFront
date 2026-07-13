import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WhatsAppAiStatusStrip from '@/components/whatsapp/WhatsAppAiStatusStrip.vue'
import type { WhatsAppAiDiagnostics } from '@/types/whatsapp'

const diagnostics: WhatsAppAiDiagnostics = {
  branchId: 1,
  conversationId: 20,
  agentStatus: 'inactive',
  overallStatus: 'warning',
  title: 'La IA está deshabilitada',
  summary: 'Los mensajes quedan pendientes de atención.',
  provider: 'gemini',
  model: 'gemini-flash-latest',
  isActive: false,
  isVerified: true,
  attentionMode: 'ai',
  pendingCount: 1,
  failedCountLast24Hours: 0,
  lastActivityAt: '2026-07-13T15:00:00Z',
  recentMessages: [],
}

describe('WhatsAppAiStatusStrip', () => {
  it('makes an inactive agent visible and opens the activity detail', async () => {
    const wrapper = mount(WhatsAppAiStatusStrip, {
      props: {
        diagnostics,
        processing: {
          messageId: 10,
          conversationId: 20,
          status: 'processed',
          severity: 'success',
          title: 'Respuesta enviada anteriormente',
          detail: 'Actividad anterior.',
          attempts: 1,
          maxAttempts: 3,
          willRetry: false,
          timestamp: '2026-07-13T14:00:00Z',
          statusChangedAt: '2026-07-13T14:00:00Z',
        },
      },
    })

    expect(wrapper.text()).toContain('La IA está deshabilitada')
    expect(wrapper.text()).toContain('Los mensajes quedan pendientes de atención.')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('shows a diagnostic lookup failure instead of hiding the strip', () => {
    const wrapper = mount(WhatsAppAiStatusStrip, {
      props: { error: 'No se pudo conectar con el servidor.' },
    })

    expect(wrapper.text()).toContain('No se pudo consultar el estado de la IA')
    expect(wrapper.text()).toContain('No se pudo conectar con el servidor.')
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWhatsAppStore } from '@/store/whatsapp'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing, WhatsAppMessage } from '@/types/whatsapp'

const { whatsappApiMock } = vi.hoisted(() => ({
  whatsappApiMock: {
    getStatus: vi.fn(),
    getAiDiagnostics: vi.fn(),
    resetConversationForTesting: vi.fn(),
  },
}))

vi.mock('@/services/MainAPI/whatsappApi', () => ({
  whatsappApi: whatsappApiMock,
}))

const makeMessage = (): WhatsAppMessage => ({
  id: 10,
  conversationId: 20,
  direction: 'inbound',
  type: 'text',
  textBody: 'Hola',
  status: 'received',
  timestamp: '2026-07-13T15:00:00Z',
  createdAt: '2026-07-13T15:00:00Z',
})

const makeProcessing = (overrides: Partial<WhatsAppAiProcessing> = {}): WhatsAppAiProcessing => ({
  messageId: 10,
  conversationId: 20,
  status: 'processing',
  severity: 'info',
  title: 'Procesando mensaje',
  detail: 'Consultando al proveedor.',
  technicalDetail: null,
  errorCategory: null,
  httpStatusCode: null,
  attempts: 1,
  maxAttempts: 3,
  willRetry: false,
  timestamp: '2026-07-13T15:00:00Z',
  statusChangedAt: '2026-07-13T15:00:00Z',
  startedAt: '2026-07-13T15:00:00Z',
  nextRetryAt: null,
  processedAt: null,
  ...overrides,
})

const makeDiagnostics = (recentMessages = [makeProcessing()]): WhatsAppAiDiagnostics => ({
  branchId: 1,
  conversationId: 20,
  agentStatus: 'active',
  overallStatus: 'processing',
  title: 'Procesando',
  summary: 'Hay un mensaje en curso.',
  provider: 'gemini',
  model: 'gemini-flash-latest',
  isActive: true,
  isVerified: true,
  attentionMode: 'ai',
  pendingCount: 1,
  failedCountLast24Hours: 0,
  lastActivityAt: '2026-07-13T15:00:00Z',
  recentMessages,
})

describe('WhatsApp store AI diagnostics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('hydrates diagnostics and attaches processing to the corresponding message', async () => {
    const store = useWhatsAppStore()
    store.messages = { 20: [makeMessage()] }
    const payload = makeDiagnostics()
    whatsappApiMock.getAiDiagnostics.mockResolvedValue({ data: payload })

    await store.fetchAiDiagnostics(1, 20, 20)

    expect(whatsappApiMock.getAiDiagnostics).toHaveBeenCalledWith(1, 20, 20)
    expect(store.aiDiagnosticsByConversation[20]).toEqual(payload)
    expect(store.messages[20][0].aiProcessing).toEqual(payload.recentMessages[0])
  })

  it('applies realtime transitions without duplicating a message and updates counters', () => {
    const store = useWhatsAppStore()
    store.messages = { 20: [makeMessage()] }

    store.applyAiProcessingChanged({
      branchId: 1,
      processing: makeProcessing({ status: 'queued', severity: 'info' }),
    })
    store.applyAiProcessingChanged({
      branchId: 1,
      processing: makeProcessing({
        status: 'failed',
        severity: 'error',
        title: 'La IA no respondió',
        detail: 'Cuota agotada.',
        errorCategory: 'quota_exhausted',
        httpStatusCode: 429,
        statusChangedAt: '2026-07-13T15:00:05Z',
      }),
    })

    const diagnostics = store.aiDiagnosticsByConversation[20]
    expect(diagnostics.recentMessages).toHaveLength(1)
    expect(diagnostics.pendingCount).toBe(0)
    expect(diagnostics.failedCountLast24Hours).toBe(1)
    expect(diagnostics.overallStatus).toBe('error')
    expect(diagnostics.lastActivityAt).toBe('2026-07-13T15:00:05Z')
    expect(store.messages[20][0].aiProcessing?.httpStatusCode).toBe(429)
  })

  it('keeps processing information when the AI event arrives before the message event', () => {
    const store = useWhatsAppStore()
    const queued = makeProcessing({ status: 'queued', severity: 'info' })
    store.applyAiProcessingChanged({ branchId: 1, processing: queued })

    store.applyRealtimeMessage({
      branchId: 1,
      conversation: {
        id: 20,
        branchId: 1,
        phoneNumber: '573001234567',
        status: 'open',
        unreadCount: 1,
        createdAt: '2026-07-13T15:00:00Z',
        updatedAt: '2026-07-13T15:00:00Z',
        attentionMode: 'ai',
        attentionModeUpdatedAt: '2026-07-13T15:00:00Z',
      },
      message: makeMessage(),
    })

    expect(store.messages[20][0].aiProcessing).toEqual(queued)
  })

  it('ignores a delayed processing event after a newer terminal failure', () => {
    const store = useWhatsAppStore()
    store.messages = { 20: [makeMessage()] }
    const failed = makeProcessing({
      status: 'failed',
      severity: 'error',
      statusChangedAt: '2026-07-13T15:02:00Z',
      processedAt: '2026-07-13T15:02:00Z',
    })
    store.applyAiProcessingChanged({ branchId: 1, processing: failed })
    store.applyAiProcessingChanged({
      branchId: 1,
      processing: makeProcessing({ statusChangedAt: '2026-07-13T15:01:00Z' }),
    })

    const diagnostics = store.aiDiagnosticsByConversation[20]
    expect(diagnostics.recentMessages[0]).toEqual(failed)
    expect(diagnostics.failedCountLast24Hours).toBe(1)
    expect(diagnostics.pendingCount).toBe(0)
    expect(store.messages[20][0].aiProcessing).toEqual(failed)
  })

  it('does not turn a previously enabled channel into not configured when status lookup fails', async () => {
    const store = useWhatsAppStore()
    store.status = { enabled: true, branchIds: [1] }
    whatsappApiMock.getStatus.mockRejectedValue(new Error('Servicio no disponible'))

    await expect(store.refreshStatus()).rejects.toThrow('Servicio no disponible')

    expect(store.status).toEqual({ enabled: true, branchIds: [1] })
    expect(store.enabled).toBe(true)
    expect(store.error).toBe('Servicio no disponible')
  })

  it('clears local messages and diagnostics after resetting a conversation for testing', async () => {
    const store = useWhatsAppStore()
    const conversation = {
      id: 20,
      branchId: 1,
      phoneNumber: '573001234567',
      status: 'closed',
      unreadCount: 2,
      createdAt: '2026-07-13T15:00:00Z',
      updatedAt: '2026-07-13T15:00:00Z',
      attentionMode: 'closed',
      attentionModeUpdatedAt: '2026-07-13T15:00:00Z',
    } as const
    store.conversations = [conversation]
    store.messages = { 20: [makeMessage()] }
    store.aiDiagnosticsByConversation = { 20: makeDiagnostics() }
    whatsappApiMock.resetConversationForTesting.mockResolvedValue({
      data: { ...conversation, status: 'open', unreadCount: 0, attentionMode: 'ai' },
    })

    await store.resetConversationForTesting(20)

    expect(store.messages[20]).toEqual([])
    expect(store.aiDiagnosticsByConversation[20]).toBeUndefined()
    expect(store.conversations[0].status).toBe('open')
    expect(store.conversations[0].attentionMode).toBe('ai')
  })
})

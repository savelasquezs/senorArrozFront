import { describe, expect, it } from 'vitest'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing } from '@/types/whatsapp'
import {
  aiDiagnosticsTone,
  aiProcessingTone,
  aiValueLabel,
  isAiProcessingPending,
  shouldApplyAiProcessingUpdate,
  upsertAiProcessing,
} from '@/utils/whatsappAiDiagnostics'

const processing = (overrides: Partial<WhatsAppAiProcessing> = {}): WhatsAppAiProcessing => ({
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

const diagnostics = (overrides: Partial<WhatsAppAiDiagnostics> = {}): WhatsAppAiDiagnostics => ({
  branchId: 1,
  conversationId: 20,
  agentStatus: 'active',
  overallStatus: 'healthy',
  title: 'IA operativa',
  summary: 'El agente puede responder.',
  provider: 'gemini',
  model: 'gemini-flash-latest',
  isActive: true,
  isVerified: true,
  attentionMode: 'ai',
  pendingCount: 0,
  failedCountLast24Hours: 0,
  lastActivityAt: '2026-07-13T15:00:00Z',
  recentMessages: [],
  ...overrides,
})

describe('WhatsApp AI diagnostics helpers', () => {
  it('prioritizes a real provider error over a generic processing status', () => {
    expect(aiProcessingTone(processing({
      status: 'failed',
      severity: 'error',
      errorCategory: 'quota_exhausted',
    }))).toBe('danger')
  })

  it('shows an inactive agent as a failure when the conversation is assigned to AI', () => {
    expect(aiDiagnosticsTone(diagnostics({ isActive: false, overallStatus: 'healthy', attentionMode: 'ai' }))).toBe('danger')
  })

  it('treats a scheduled retry as pending', () => {
    const retry = processing({
      status: 'retry_scheduled',
      severity: 'error',
      errorCategory: 'provider_timeout',
      willRetry: true,
    })
    expect(isAiProcessingPending(retry)).toBe(true)
    expect(aiProcessingTone(retry)).toBe('warning')
  })

  it('translates actionable provider categories for the operator', () => {
    expect(aiValueLabel('provider_quota_exhausted')).toBe('Cuota del proveedor agotada')
    expect(aiValueLabel('meta_send_failed')).toBe('Error al enviar por WhatsApp')
  })

  it('updates the same message without duplicating it and keeps newest activity first', () => {
    const older = processing({ messageId: 9, timestamp: '2026-07-13T14:59:00Z', statusChangedAt: '2026-07-13T14:59:00Z' })
    const initial = processing({ status: 'queued' })
    const completed = processing({
      status: 'processed',
      severity: 'success',
      statusChangedAt: '2026-07-13T15:00:02Z',
      processedAt: '2026-07-13T15:00:02Z',
    })

    const result = upsertAiProcessing([older, initial], completed)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(completed)
    expect(result.filter(item => item.messageId === 10)).toHaveLength(1)
  })

  it('orders live updates by the state transition instead of the inbound timestamp', () => {
    const newerMessage = processing({
      messageId: 11,
      timestamp: '2026-07-13T15:01:00Z',
      statusChangedAt: '2026-07-13T15:01:00Z',
    })
    const olderMessageWithNewFailure = processing({
      messageId: 10,
      status: 'failed',
      severity: 'error',
      timestamp: '2026-07-13T14:00:00Z',
      statusChangedAt: '2026-07-13T15:02:00Z',
      processedAt: '2026-07-13T15:02:00Z',
    })

    expect(upsertAiProcessing([newerMessage], olderMessageWithNewFailure)[0].messageId).toBe(10)
  })

  it('does not replace a terminal state with a delayed older event', () => {
    const completed = processing({
      status: 'completed',
      severity: 'success',
      statusChangedAt: '2026-07-13T15:02:00Z',
      processedAt: '2026-07-13T15:02:00Z',
    })
    const delayedProcessing = processing({
      status: 'processing',
      statusChangedAt: '2026-07-13T15:01:00Z',
      startedAt: '2026-07-13T15:01:00Z',
    })

    expect(shouldApplyAiProcessingUpdate(completed, delayedProcessing)).toBe(false)
    expect(upsertAiProcessing([completed], delayedProcessing)).toEqual([completed])
  })
})

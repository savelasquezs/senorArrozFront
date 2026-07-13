import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing } from '@/types/whatsapp'

export type WhatsAppAiTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

function normalized(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

const dangerTokens = ['error', 'failed', 'failure', 'critical', 'unavailable', 'invalid', 'quotaexhausted', 'disabled', 'blocked', 'notconfigured']
const warningTokens = ['warning', 'warn', 'retry', 'retrying', 'pending', 'queued', 'processing', 'inactive', 'paused', 'degraded', 'unverified']
const successTokens = ['success', 'healthy', 'operational', 'ready', 'active', 'connected', 'completed', 'processed', 'responded', 'sent']

function containsAny(value: string, tokens: string[]) {
  return tokens.some(token => value.includes(token))
}

export function aiToneFromValues(...values: Array<string | null | undefined>): WhatsAppAiTone {
  const joined = values.map(normalized).join(' ')
  if (containsAny(joined, dangerTokens)) return 'danger'
  if (containsAny(joined, warningTokens)) return 'warning'
  if (containsAny(joined, successTokens)) return 'success'
  return joined.trim() ? 'info' : 'neutral'
}

export function aiProcessingTone(processing?: WhatsAppAiProcessing | null): WhatsAppAiTone {
  if (!processing) return 'neutral'
  if (processing.willRetry) return 'warning'
  return aiToneFromValues(processing.severity, processing.status, processing.errorCategory)
}

export function aiDiagnosticsTone(diagnostics?: WhatsAppAiDiagnostics | null): WhatsAppAiTone {
  if (!diagnostics) return 'neutral'
  if (!diagnostics.isActive) return normalized(diagnostics.attentionMode) === 'ai' ? 'danger' : 'warning'
  return aiToneFromValues(diagnostics.overallStatus, diagnostics.agentStatus)
}

export function isAiProcessingPending(processing?: WhatsAppAiProcessing | null) {
  if (!processing) return false
  const status = normalized(processing.status)
  return processing.willRetry
    || ['pending', 'queued', 'processing', 'started', 'claimed', 'retrying', 'retryscheduled', 'responsegenerated', 'sending', 'sent']
      .some(value => status === value)
}

export function isAiProcessingFailed(processing?: WhatsAppAiProcessing | null) {
  return normalized(processing?.status) === 'failed'
}

export function aiProcessingActivityAt(processing?: WhatsAppAiProcessing | null) {
  if (!processing) return null
  if (processing.statusChangedAt) return processing.statusChangedAt
  if (processing.processedAt) return processing.processedAt
  if (processing.startedAt) return processing.startedAt
  if (processing.nextRetryAt) {
    const retryAt = new Date(processing.nextRetryAt).getTime()
    if (Number.isFinite(retryAt) && retryAt <= Date.now()) return processing.nextRetryAt
  }
  return processing.timestamp || null
}

export function aiOverallStatusFromActivity(
  items: WhatsAppAiProcessing[],
  pendingCount: number,
  failedCount: number,
) {
  if (failedCount > 0) return 'error'
  if (pendingCount > 0) {
    return items.some(item =>
      isAiProcessingPending(item)
      && item.willRetry
      && Boolean(item.errorCategory || item.nextRetryAt),
    )
      ? 'retrying'
      : 'processing'
  }

  const latest = sortAiProcessing(items)[0]
  if (!latest) return 'idle'
  const status = normalized(latest.status)
  if (status === 'failed' || (status === 'ignored' && normalized(latest.severity) === 'error')) return 'error'
  if (status === 'transferredtohuman') return 'attention'
  if (status === 'completed') return 'healthy'
  return 'idle'
}

function processingTime(processing?: WhatsAppAiProcessing | null) {
  const value = aiProcessingActivityAt(processing)
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isTerminalStatus(status?: string | null) {
  return ['completed', 'failed', 'ignored', 'transferredtohuman'].includes(normalized(status))
}

export function shouldApplyAiProcessingUpdate(
  current: WhatsAppAiProcessing | null | undefined,
  incoming: WhatsAppAiProcessing,
) {
  if (!current) return true
  const currentTime = processingTime(current)
  const incomingTime = processingTime(incoming)
  if (incomingTime < currentTime) return false
  if (incomingTime === currentTime && isTerminalStatus(current.status) && !isTerminalStatus(incoming.status)) {
    return false
  }
  return true
}

export function aiValueLabel(value?: string | null) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    healthy: 'Operativo',
    degraded: 'Con dificultades',
    queued: 'En cola',
    pending: 'Pendiente',
    processing: 'Procesando',
    started: 'Procesando',
    claimed: 'Tomado por el agente',
    retrying: 'Reintentando',
    retryscheduled: 'Reintento programado',
    processed: 'Procesado',
    completed: 'Completado',
    responded: 'Respondido',
    failed: 'Falló',
    skipped: 'Omitido',
    aidisabled: 'Agente deshabilitado',
    quotaexhausted: 'Cuota agotada',
    providerquotaexhausted: 'Cuota del proveedor agotada',
    ratelimited: 'Límite de solicitudes alcanzado',
    providerratelimited: 'Límite del proveedor alcanzado',
    authenticationfailed: 'Credenciales rechazadas',
    providerauthfailed: 'Credenciales del proveedor rechazadas',
    invalidrequest: 'Solicitud inválida',
    unsupportedmodel: 'Modelo no compatible',
    invalidtoolschema: 'Definición de herramienta inválida',
    timeout: 'Tiempo de espera agotado',
    providertimeout: 'El proveedor tardó demasiado',
    providerservice: 'Fallo del proveedor',
    metasendfailed: 'Error al enviar por WhatsApp',
  }
  const label = labels[normalized(text)]
  if (label) return label
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, letter => letter.toUpperCase())
}

export function sortAiProcessing(items: WhatsAppAiProcessing[]) {
  return [...items].sort((a, b) => {
    const right = new Date(aiProcessingActivityAt(b) || 0).getTime()
    const left = new Date(aiProcessingActivityAt(a) || 0).getTime()
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0)
  })
}

export function upsertAiProcessing(items: WhatsAppAiProcessing[], processing: WhatsAppAiProcessing, take = 20) {
  const index = items.findIndex(item =>
    item.messageId === processing.messageId && item.conversationId === processing.conversationId,
  )
  if (index >= 0 && !shouldApplyAiProcessingUpdate(items[index], processing)) {
    return sortAiProcessing(items).slice(0, take)
  }
  const updated = index >= 0
    ? items.map((item, currentIndex) => currentIndex === index ? processing : item)
    : [processing, ...items]
  return sortAiProcessing(updated).slice(0, take)
}

export const aiToneClasses: Record<WhatsAppAiTone, {
  surface: string
  text: string
  dot: string
  badge: string
}> = {
  success: {
    surface: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  info: {
    surface: 'border-blue-200 bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
  warning: {
    surface: 'border-amber-200 bg-amber-50',
    text: 'text-amber-900',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900',
  },
  danger: {
    surface: 'border-red-200 bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
  },
  neutral: {
    surface: 'border-gray-200 bg-gray-50',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700',
  },
}

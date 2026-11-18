import type { ApiResponse } from '@/types/common'

type PendingOperation = { operationId: number; pending: true }
type OperationResponse<T> = ApiResponse<T | PendingOperation>

function pendingId<T>(response: OperationResponse<T>): number | null {
  const value = response.data
  if (value && typeof value === 'object' && 'pending' in value && value.pending === true
    && 'operationId' in value && Number.isInteger(value.operationId) && Number(value.operationId) > 0) {
    return Number(value.operationId)
  }
  return null
}

export async function resolveWhatsAppOperation<T>(
  start: () => Promise<OperationResponse<T>>,
  poll: (operationId: number) => Promise<OperationResponse<T>>,
  maxWaitMs = 180_000,
): Promise<ApiResponse<T>> {
  let response = await start()
  const deadline = Date.now() + maxWaitMs
  let polls = 0
  for (let id = pendingId(response); id !== null; id = pendingId(response)) {
    if (Date.now() >= deadline) {
      throw new Error(`El envío ${id} sigue pendiente. Revisa el chat antes de enviar otra vez.`)
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 + polls++ * 250, 3000)))
    response = await poll(id)
  }
  return response as ApiResponse<T>
}

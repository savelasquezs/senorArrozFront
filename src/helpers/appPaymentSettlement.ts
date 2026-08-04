import { useDialog } from '@/composables/useDialog'

export interface SettlementAmountRequestOptions {
  description?: string
}

export function parseSettlementAmount(input: string): number | null {
  if (!input.trim()) return null
  const normalized = input.replace(/[.$\s]/g, '').replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export async function requestActualSettlementAmount(
  expectedAmount: number,
  formatCurrency: (value: number) => string,
  options: SettlementAmountRequestOptions = {},
): Promise<number | null> {
  const { promptDialog } = useDialog()
  const expectedMessage = `Neto esperado: ${formatCurrency(expectedAmount)}. Ingresa el valor real consignado.`
  const input = await promptDialog({
    title: 'Registrar liquidación',
    message: options.description
      ? `${options.description}\n${expectedMessage}`
      : expectedMessage,
    inputLabel: 'Valor real consignado',
    defaultValue: String(Math.round(expectedAmount)),
    confirmLabel: 'Liquidar',
    tone: 'default',
    validate: value => parseSettlementAmount(value) == null
      ? 'Ingresa un valor válido mayor o igual a cero.'
      : null,
  })

  return input == null ? null : parseSettlementAmount(input)
}

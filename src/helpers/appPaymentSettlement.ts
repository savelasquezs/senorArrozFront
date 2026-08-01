export function requestActualSettlementAmount(
  expectedAmount: number,
  formatCurrency: (value: number) => string,
): number | null {
  const input = window.prompt(
    `Neto esperado: ${formatCurrency(expectedAmount)}. Ingresa el valor real consignado:`,
    String(Math.round(expectedAmount)),
  )
  if (input == null) return null
  const parsed = Number(input.replace(/[.$\s]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

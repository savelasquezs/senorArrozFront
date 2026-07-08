import type { DraftOrder } from '@/types/order'

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

export function buildWhatsAppOrderConfirmationMessage(order: DraftOrder, etaPhrase = '30-45 min'): string {
  const customerName = (order.customerName || order.guestName || '').trim()
  const greeting = customerName ? `${customerName} 😊` : 'Hola 😊'
  const productLines = order.orderItems.length
    ? order.orderItems.map(item => {
        const lineTotal = Math.max(0, item.quantity * item.unitPrice - (item.discount || 0) - (item.freeDeliveryDiscount || 0))
        return `• ${item.productName} x ${item.quantity} - ${currency.format(lineTotal)}`
      })
    : ['• Pedido en preparación']

  const addressLines = [
    order.addressDescription?.trim(),
    order.addressAdditionalInfo?.trim(),
  ].filter(Boolean)

  const lines = [
    greeting,
    '',
    'Tu pedido quedó confirmado:',
    '',
    ...productLines,
    '',
    `Domicilio: ${currency.format(order.deliveryFee || 0)}`,
    `Total: ${currency.format(order.total || 0)}`,
    '',
    'Dirección:',
    addressLines.join('\n') || 'Por confirmar',
    '',
    'Tiempo estimado:',
    etaPhrase,
  ]

  const notes = order.notes?.trim()
  if (notes) {
    lines.push('', `Observaciones: ${notes}`)
  }

  return lines.join('\n')
}

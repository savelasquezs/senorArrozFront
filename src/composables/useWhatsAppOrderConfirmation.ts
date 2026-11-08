import type { DraftOrder, Order } from '@/types/order'
import { orderItemSubtotal } from '@/helpers/orderItem'

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

export function buildWhatsAppOrderConfirmationMessage(order: DraftOrder | Order, etaPhrase = '30-45 min', confirmed = false): string {
  const customerName = (order.customerName || order.guestName || '').trim()
  const greeting = customerName ? `${customerName} 😊` : 'Hola 😊'
  const items = 'orderItems' in order ? order.orderItems : order.orderDetails
  const productLines = items.length
    ? items.map(item => {
        const line = `• ${item.productName} x ${item.quantity} - ${currency.format(orderItemSubtotal(item))}`
        return item.notes?.trim() ? `${line}\n  ${item.notes.trim()}` : line
      })
    : ['• Pedido en preparación']

  const addressLines = [
    order.addressDescription?.trim(),
    order.addressAdditionalInfo?.trim(),
  ].filter(Boolean)

  const lines = [
    greeting,
    '',
    confirmed && 'id' in order ? `Tu pedido #${order.id} quedó confirmado:` : 'Resumen previo de tu pedido:',
    '',
    ...productLines,
    '',
    ...(order.type === 'onsite' ? [] : [`Domicilio: ${currency.format(order.deliveryFee || 0)}`]),
    `Total: ${currency.format(order.total || 0)}`,
    '',
    ...(order.type === 'onsite' ? ['Recogida en local'] : ['Dirección:', addressLines.join('\n') || 'Por confirmar']),
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

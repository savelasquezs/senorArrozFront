import type { DraftOrder, Order, OrderDetailView } from '@/types/order'
import { orderItemSubtotal } from '@/helpers/orderItem'
import { hasOrderDelivery } from '@/helpers/orderDeliveryFee'

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})
const scheduledTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

export function buildWhatsAppOrderConfirmationMessage(order: DraftOrder | Order | OrderDetailView, etaPhrase = '30-45 min', confirmed = false): string {
  const delivery = hasOrderDelivery(order)
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
  const reservedFor = order.reservedFor
    ? order.reservedFor instanceof Date ? order.reservedFor : new Date(order.reservedFor)
    : null
  const scheduled = reservedFor && Number.isFinite(reservedFor.getTime())

  const lines = [
    greeting,
    '',
    confirmed && 'id' in order ? `Tu pedido #${order.id} quedó confirmado:` : 'Resumen previo de tu pedido:',
    '',
    ...productLines,
    '',
    ...(!delivery ? [] : [`Domicilio: ${currency.format(order.deliveryFee || 0)}`]),
    `Total: ${currency.format(order.total || 0)}`,
    '',
    ...(!delivery ? ['Recogida en local'] : ['Dirección:', addressLines.join('\n') || 'Por confirmar']),
    '',
    scheduled ? !delivery ? 'Recogida programada:' : 'Entrega programada:' : 'Tiempo estimado:',
    scheduled ? scheduledTime.format(reservedFor) : etaPhrase,
  ]

  const notes = order.notes?.trim()
  if (notes) {
    lines.push('', `Observaciones: ${notes}`)
  }

  return lines.join('\n')
}

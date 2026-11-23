export interface SupplierOrderLine {
  name: string
  quantity: string
  unit?: string
  note: string
  custom?: boolean
}

export function supplierOrderMessage(lines: readonly SupplierOrderLine[], note: string) {
  const requested: string[] = []
  for (const line of lines) {
    const name = line.name.trim()
    const cleanQuantity = line.quantity.trim()
    const unit = line.unit?.trim()
    const lineNote = line.note.trim()
    if (!cleanQuantity && !lineNote && !(line.custom && name)) continue
    const numericQuantity = Number(cleanQuantity.replace(',', '.'))
    if (!name || !/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cleanQuantity)
      || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      throw new Error('Cada artículo solicitado debe tener nombre y una cantidad positiva.')
    }
    const displayQuantity = cleanQuantity.replace('.', ',').replace(/^,/, '0,')
    requested.push(`• ${displayQuantity}${unit ? ` ${unit}` : ''} — ${name}${lineNote ? ` (${lineNote})` : ''}`)
  }
  if (!requested.length) throw new Error('Indica la cantidad de al menos un artículo.')
  const message = ['Hola, queremos hacer un pedido.', requested.join('\n'), note.trim(), 'Gracias.']
    .filter(Boolean).join('\n\n')
  if (message.length > 4096) throw new Error('Acorta el pedido para que quepa en un mensaje de WhatsApp.')
  return message
}

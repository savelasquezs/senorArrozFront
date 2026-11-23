export interface SupplierOrderLine {
  name: string
  quantity: string
  unit: string
  note: string
  custom?: boolean
}

export function supplierOrderMessage(lines: readonly SupplierOrderLine[], note: string) {
  const requested: string[] = []
  for (const line of lines) {
    const { name, quantity, unit, note: lineNote } = line
    const cleanQuantity = quantity.trim()
    if (!cleanQuantity && !lineNote.trim() && !(line.custom && (name.trim() || unit.trim()))) continue
    const numericQuantity = Number(cleanQuantity.replace(',', '.'))
    if (!name.trim() || !unit.trim() || !/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cleanQuantity)
      || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      throw new Error('Cada artículo solicitado debe tener nombre, unidad y una cantidad positiva.')
    }
    const displayQuantity = cleanQuantity.replace('.', ',').replace(/^,/, '0,')
    requested.push(`• ${displayQuantity} ${unit.trim()} — ${name.trim()}${lineNote.trim() ? ` (${lineNote.trim()})` : ''}`)
  }
  if (!requested.length) throw new Error('Indica la cantidad de al menos un artículo.')
  const message = ['Hola, queremos hacer un pedido.', requested.join('\n'), note.trim(), 'Gracias.']
    .filter(Boolean).join('\n\n')
  if (message.length > 4096) throw new Error('Acorta el pedido para que quepa en un mensaje de WhatsApp.')
  return message
}

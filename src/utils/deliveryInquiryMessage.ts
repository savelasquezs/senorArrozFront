export interface DeliveryInquiryMessageInput {
    deliverymanName: string
    orderId: number
    addressDescription?: string | null
    addressAdditionalInfo?: string | null
}

export function deliveryAddressText(
    order: Pick<DeliveryInquiryMessageInput, 'addressDescription' | 'addressAdditionalInfo'>,
): string {
    const address = order.addressDescription?.trim()
    const additionalInfo = order.addressAdditionalInfo?.trim()
    return [address, additionalInfo].filter(Boolean).join(', ')
}

export function buildDeliveryInquiryMessage(input: DeliveryInquiryMessageInput): string {
    const deliverymanName = input.deliverymanName.trim()
    const address = deliveryAddressText(input)
    const addressPhrase = address ? `la dirección ${address}` : 'la dirección registrada'

    return `${deliverymanName}, me están preguntando por el pedido número ${input.orderId}, que va para ${addressPhrase}, ¿cuánto demora en llegar?`
}

import { normalizeWhatsAppUsername } from '@/utils/whatsappIdentity'

export function orderCustomerContact(order: {
    customerPhone?: string | null
    customerWhatsAppUsername?: string | null
}): { value: string; isPhone: boolean } | null {
    const phone = order.customerPhone?.trim()
    if (phone) return { value: phone, isPhone: true }
    const username = normalizeWhatsAppUsername(order.customerWhatsAppUsername)
    return username ? { value: username, isPhone: false } : null
}

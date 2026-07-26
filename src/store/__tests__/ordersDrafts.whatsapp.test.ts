import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../auth'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { UserRole, type User } from '@/types/auth'
import type { Customer, CustomerAddress } from '@/types/customer'
import type { WhatsAppOrderDraft } from '@/types/whatsapp'

const user: User = {
    id: 4,
    name: 'Admin',
    email: 'admin@example.com',
    phone: '3000000000',
    active: true,
    role: UserRole.ADMIN,
    branchId: 7,
    branchName: 'Santander',
}

const address: CustomerAddress = {
    id: 31,
    customerId: 12,
    neighborhoodId: 9,
    neighborhoodName: 'Castilla',
    address: 'Carrera 71 #97-78',
    additionalInfo: 'Apto 201',
    isPrimary: true,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-01T12:00:00Z',
    deliveryFee: 5000,
}

const customer: Customer = {
    id: 12,
    name: 'Luz Adriana',
    phone1: '3137800052',
    branchId: 7,
    active: true,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-01T12:00:00Z',
    addresses: [address],
}

const aiDraft: WhatsAppOrderDraft = {
    conversationId: 44,
    branchId: 7,
    customerId: customer.id,
    customerName: customer.name,
    phoneNumber: customer.phone1,
    orderType: 'delivery',
    selectedAddressId: address.id,
    items: [{
        productId: 88,
        name: 'Arroz especial',
        quantity: 2,
        unitPrice: 10000,
        subtotal: 20000,
        notes: 'Sin cebolla',
        available: true,
    }],
    activities: [],
    subtotal: 20000,
    deliveryFee: 5000,
    total: 25000,
    totalItems: 2,
}

describe('WhatsApp order drafts', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        useAuthStore().user = user
    })

    it('creates an empty delivery draft for a human-managed conversation', () => {
        const store = useOrdersDraftsStore()

        const order = store.createOrReuseWhatsAppDraft({
            mode: 'manual',
            conversationId: 44,
            branchId: 7,
            customer,
            address,
        })

        expect(order).toMatchObject({
            branchId: 7,
            source: 'WhatsApp',
            whatsappConversationId: 44,
            type: 'delivery',
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone1,
            addressId: address.id,
            addressDescription: address.address,
            addressAdditionalInfo: address.additionalInfo,
            deliveryFee: 5000,
            subtotal: 0,
            total: 5000,
            orderItems: [],
        })
    })

    it('keeps the existing AI mapping for an AI-managed conversation', () => {
        const store = useOrdersDraftsStore()

        const order = store.createOrReuseWhatsAppDraft({
            mode: 'ai',
            conversationId: 44,
            branchId: 7,
            customer,
            address,
            draft: aiDraft,
        })

        expect(order).toMatchObject({
            type: 'delivery',
            deliveryFee: 5000,
            subtotal: 20000,
            total: 25000,
            orderItems: [{
                productId: 88,
                productName: 'Arroz especial',
                quantity: 2,
                unitPrice: 10000,
                subtotal: 20000,
                notes: 'Sin cebolla',
            }],
        })
    })

    it('reuses the draft for the same conversation and branch', () => {
        const store = useOrdersDraftsStore()
        const first = store.createOrReuseWhatsAppDraft({
            mode: 'manual',
            conversationId: 44,
            branchId: 7,
            customer,
            address,
        })
        const second = store.createOrReuseWhatsAppDraft({
            mode: 'manual',
            conversationId: 44,
            branchId: 7,
            customer,
            address,
        })

        expect(second?.tabId).toBe(first?.tabId)
        expect(store.draftOrders.size).toBe(1)
        expect(store.currentTabId).toBe(first?.tabId)
    })
})

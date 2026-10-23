import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/store/auth'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import type { BillingRecipient } from '@/types/electronicInvoicing'

export const useInvoiceResources = defineStore('invoiceResources', () => {
    const auth = useAuthStore()
    const recipients = ref<Record<number, BillingRecipient[]>>({})
    const profiles = ref<Record<number, BillingRecipient>>({})
    const pending = new Map<number, Promise<BillingRecipient[]>>()
    const fetched = new Map<number, number>()
    const revisions = new Map<number, number>()
    let generation = 0, availabilityAt = 0
    let availability: { enabled: boolean; productionEnabled?: boolean } | null = null
    let availabilityPending: Promise<{ enabled: boolean; productionEnabled?: boolean }> | null = null
    watch(() => [auth.user?.id, auth.token], () => {
        generation++; recipients.value = {}; profiles.value = {}; pending.clear(); fetched.clear(); revisions.clear()
        availability = null; availabilityAt = 0; availabilityPending = null
    }, { flush: 'sync' })
    async function loadRecipients(id: number, force = false): Promise<BillingRecipient[]> {
        if (pending.has(id)) return pending.get(id)!
        if (!force && fetched.has(id) && Date.now() - fetched.get(id)! < 60000) return recipients.value[id] ?? []
        const current = generation, revision = revisions.get(id) ?? 0
        const request = api.recipients(id).then(result => {
            if (current !== generation) return []
            if (revision !== (revisions.get(id) ?? 0)) return recipients.value[id] ?? []
            recipients.value[id] = result.data ?? []; fetched.set(id, Date.now())
            return recipients.value[id]!
        }).finally(() => { if (pending.get(id) === request) pending.delete(id) })
        pending.set(id, request)
        return request
    }
    function updateRecipient(id: number, recipient: BillingRecipient) {
        updateProfile(recipient)
        revisions.set(id, (revisions.get(id) ?? 0) + 1)
        const values = recipients.value[id] ?? []
        recipients.value[id] = [...values.filter(r => r.id !== recipient.id).map(r => recipient.isDefault ? { ...r, isDefault: false } : r), recipient]
        fetched.set(id, Date.now())
    }
    function updateProfile(recipient: BillingRecipient) {
        if (!recipient.profileId) return
        profiles.value[recipient.profileId] = { ...recipient, id: undefined, isDefault: false }
        for (const [key, values] of Object.entries(recipients.value)) {
            const id = Number(key)
            if (!values.some(r => r.profileId === recipient.profileId)) continue
            revisions.set(id, (revisions.get(id) ?? 0) + 1)
            recipients.value[id] = values.map(r => r.profileId === recipient.profileId ? { ...r, ...recipient, id: r.id, isDefault: r.isDefault } : r)
        }
    }
    async function getAvailability(force = false) {
        if (availabilityPending) return availabilityPending
        if (!force && availability && Date.now() - availabilityAt < 15000) return availability
        const current = generation
        const request = api.availability().then(result => {
            if (current !== generation) throw new Error('La sesión cambió. Vuelve a consultar la facturación.')
            availability = result.data ?? { enabled: false }; availabilityAt = Date.now()
            return availability
        }).finally(() => { if (availabilityPending === request) availabilityPending = null })
        availabilityPending = request
        return request
    }
    function invalidateAvailability() { availability = null; availabilityAt = 0 }
    return { recipients, profiles, loadRecipients, updateRecipient, updateProfile, getAvailability, invalidateAvailability }
})

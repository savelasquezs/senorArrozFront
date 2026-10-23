<template>
    <div class="text-sm">
        <slot name="trigger" :open="openModal" :recipient="effectiveRecipient" :complete="billingRecipientComplete(effectiveRecipient)">
        <button type="button" class="inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg text-left text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" @click="open = true"><span class="underline underline-offset-4">{{ label || 'Datos de facturación' }}</span><span :class="billingRecipientComplete(effectiveRecipient) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'" class="rounded-full px-2 py-0.5 text-xs font-medium">{{ billingRecipientComplete(effectiveRecipient) ? effectiveRecipient?.email ? 'Datos completos' : 'Sin correo' : 'Sin datos' }}</span><span v-if="effectiveRecipient?.name" :class="compact ? 'max-w-48' : 'w-full'" class="truncate text-xs text-slate-500">{{ effectiveRecipient?.name }}</span></button>
        </slot>
        <span v-if="loading" class="ml-2 text-gray-500">Cargando…</span>
        <p v-if="error" role="alert" class="text-xs text-red-700">{{ error }} <button type="button" class="underline" @click="load()">Reintentar</button></p>
        <BillingRecipientModal v-if="open" v-model="open" :customer-id="customerId" :recipient="effectiveRecipient" :order-context="orderContext" @saved="emit('update:modelValue', $event)" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BillingRecipientModal from './BillingRecipientModal.vue'
import { billingRecipientComplete, useBillingRecipients } from '@/composables/useBillingRecipients'
import { useInvoiceResources } from '@/composables/useInvoiceResources'
import type { BillingRecipient } from '@/types/electronicInvoicing'
const props = defineProps<{ customerId?: number | null; modelValue?: BillingRecipient | null; label?: string; orderContext?: boolean; compact?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [BillingRecipient | null] }>()
const open = ref(false)
function openModal() { open.value = true }
const resources = useInvoiceResources()
const { recipients, loading, error, load } = useBillingRecipients(() => props.customerId)
const effectiveRecipient = computed(() => props.modelValue === undefined ? recipients.value.find(r => r.isDefault) ?? null : props.modelValue)
watch(() => props.customerId, () => { emit('update:modelValue', null); open.value = false })
watch(recipients, values => {
    const match = props.modelValue?.id ? values.find(r => r.id === props.modelValue?.id) : undefined
    if (match || !props.modelValue) emit('update:modelValue', match ?? values.find(r => r.isDefault) ?? null)
})
watch(() => props.modelValue?.profileId ? resources.profiles[props.modelValue.profileId] : undefined, profile => {
    if (profile && props.modelValue) emit('update:modelValue', { ...props.modelValue, ...profile, id: props.modelValue.id, isDefault: props.modelValue.isDefault })
})
</script>

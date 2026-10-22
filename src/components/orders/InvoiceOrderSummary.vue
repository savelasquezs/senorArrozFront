<template>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Resumen completo de facturación">
        <div class="flex flex-wrap justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <div><strong>Pedido #{{ summary.id }}</strong><p v-if="summary.createdAt" class="mt-1 text-xs text-slate-500">Pedido creado {{ new Date(summary.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) }}</p></div><span class="text-slate-500">{{ [summary.branch, summary.type].filter(Boolean).join(' · ') }}</span>
        </div>
        <table class="w-full table-fixed text-sm">
            <caption class="sr-only">Productos e importes del pedido</caption>
            <thead class="border-b border-slate-100 text-xs text-slate-500"><tr><th class="px-4 py-3 text-left">Producto / valor unitario</th><th class="w-12 py-3 text-center">Cant.</th><th class="w-28 px-4 py-3 text-right">Importe</th></tr></thead>
            <tbody class="divide-y divide-slate-100"><tr v-for="(line, index) in summary.lines" :key="index">
                <td class="break-words px-4 py-3"><p class="font-medium text-slate-800">{{ line.name }}</p><p class="mt-0.5 text-xs text-slate-500">{{ money(line.unitPrice) }} c/u<span v-if="line.discount"> · Descuento {{ money(line.discount) }}</span></p><p v-if="line.notes" class="text-xs text-slate-500">{{ line.notes }}</p></td>
                <td class="text-center tabular-nums">{{ line.quantity }}</td><td class="px-4 text-right tabular-nums">{{ money(line.quantity * line.unitPrice - line.discount) }}</td>
            </tr></tbody>
        </table>
        <div class="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
            <div class="space-y-2 text-sm"><h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagos registrados</h4><p v-for="(payment, index) in summary.payments" :key="index" class="flex justify-between gap-3"><span>{{ payment.label }}</span><span class="tabular-nums">{{ money(payment.amount) }}</span></p><p v-if="!summary.payments.length" class="text-slate-500">Sin pagos registrados.</p><p v-if="summary.balance > 0" class="flex justify-between gap-3 text-amber-800"><span>Saldo sin registro de pago</span><span class="tabular-nums">{{ money(summary.balance) }}</span></p><p v-if="summary.notes" class="border-t border-slate-100 pt-2 text-xs text-slate-500">{{ summary.notes }}</p></div>
            <dl class="space-y-2 text-sm"><div class="flex justify-between gap-3"><dt>Productos</dt><dd class="tabular-nums">{{ money(gross) }}</dd></div><div v-if="discount" class="flex justify-between gap-3"><dt>Descuentos</dt><dd class="tabular-nums">−{{ money(discount) }}</dd></div><div class="flex justify-between gap-3"><dt>Domicilio</dt><dd class="tabular-nums">{{ money(summary.delivery) }}</dd></div><div class="flex justify-between gap-3 border-t border-slate-200 pt-3 text-lg font-semibold text-slate-900"><dt>Total</dt><dd class="tabular-nums">{{ money(summary.total) }}</dd></div><p class="text-right text-xs text-slate-500">Sin IVA ni INC · Valores en COP</p></dl>
        </div>
    </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { InvoiceOrderSummary } from '@/helpers/invoicePresentation'
const props = defineProps<{ summary: InvoiceOrderSummary }>()
const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const gross = computed(() => props.summary.lines.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0))
const discount = computed(() => props.summary.lines.reduce((sum, p) => sum + p.discount, 0))
</script>

<template>
    <ol aria-label="Avance de la factura" :class="compact ? 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs' : 'grid grid-cols-2 gap-3 sm:grid-cols-4'">
        <li v-for="step in invoiceProgress(document)" :key="step.label" :aria-current="step.state === 'active' ? 'step' : undefined" :data-state="step.state" :class="[colors[step.state], compact ? 'inline-flex items-center gap-1' : 'border-t-2 pt-2 text-xs']">
            <span aria-hidden="true">{{ step.state === 'done' ? '✓' : step.state === 'error' ? '!' : step.state === 'muted' ? '—' : '○' }}</span>
            <span>{{ step.label }}</span><span class="sr-only">: {{ states[step.state] }}</span><time v-if="!compact && step.date" class="mt-1 block text-[11px] text-slate-500">{{ date(step.date) }}</time>
        </li>
    </ol>
</template>
<script setup lang="ts">
import { invoiceProgress } from '@/helpers/invoicePresentation'
import type { InvoiceDocument } from '@/types/electronicInvoicing'
defineProps<{ document: InvoiceDocument; compact?: boolean }>()
const colors: Record<string, string> = { done: 'text-emerald-700 border-emerald-500', active: 'text-amber-800 border-amber-400', error: 'text-red-700 border-red-400', pending: 'text-slate-400 border-slate-200', muted: 'text-slate-400 border-slate-200' }
const states: Record<string, string> = { done: 'Completado', active: 'En proceso', error: 'Requiere revisión', pending: 'Pendiente', muted: 'No aplica' }
const date = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })
</script>

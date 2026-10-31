<template>
    <aside v-if="tracking.jobs.length" aria-label="Facturas en segundo plano" class="pointer-events-none fixed bottom-3 left-3 z-50 max-w-[calc(100vw-1.5rem)] sm:bottom-5 sm:left-5">
        <button v-if="minimized" type="button" class="pointer-events-auto flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-xs font-medium shadow-lg" :class="hasError ? 'border-amber-200 text-amber-800' : 'border-emerald-200 text-emerald-800'" @click="minimized = false" :aria-label="`Mostrar ${tracking.jobs.length} facturas`">
            <ExclamationTriangleIcon v-if="hasError" class="h-4 w-4" aria-hidden="true" />
            <ArrowPathIcon v-else-if="active" class="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
            <DocumentCheckIcon v-else class="h-4 w-4" aria-hidden="true" />
            {{ hasError ? 'Revisar factura' : active ? 'Facturando' : 'PDF listo' }} <span class="rounded-full bg-slate-50 px-1.5">{{ tracking.jobs.length }}</span>
        </button>
        <section v-else class="pointer-events-auto w-80 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
            <header class="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                <span class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Facturación electrónica</span>
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Minimizar facturación" @click="minimized = true"><MinusIcon class="h-4 w-4" /></button>
            </header>
            <div class="max-h-64 overflow-y-auto divide-y divide-slate-100">
                <article v-for="job in tracking.jobs" :key="job.orderId" class="px-4 py-3">
                    <div class="flex items-start gap-3">
                        <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" :class="job.phase === 'error' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'">
                            <CheckIcon v-if="job.phase === 'done'" class="h-4 w-4" />
                            <ExclamationTriangleIcon v-else-if="job.phase === 'error' || job.error" class="h-4 w-4" />
                            <ClockIcon v-else-if="job.document?.status === 'scheduled'" class="h-4 w-4" />
                            <ArrowPathIcon v-else class="h-4 w-4 motion-safe:animate-spin" />
                        </div>
                        <div class="min-w-0 flex-1" role="status" aria-live="polite" aria-atomic="true">
                            <p class="text-xs font-semibold text-slate-800">Pedido #{{ job.orderId }} <span v-if="job.document?.number" class="font-normal text-slate-400">· {{ job.document.prefix }}{{ job.document.number }}</span></p>
                            <p class="mt-0.5 line-clamp-3 text-xs leading-relaxed" :class="job.error ? 'text-amber-800' : 'text-slate-500'">{{ label(job) }}</p>
                        </div>
                        <button v-if="['done', 'error'].includes(job.phase)" type="button" class="-mr-1 rounded-md p-1 text-slate-400 hover:bg-slate-100" :aria-label="`Cerrar aviso del pedido ${job.orderId}`" @click="tracking.dismiss(job.orderId)"><XMarkIcon class="h-3.5 w-3.5" /></button>
                    </div>
                    <div v-if="job.phase !== 'done'" class="mt-3 flex gap-1" aria-hidden="true">
                        <span v-for="step in 4" :key="step" class="h-1 flex-1 rounded-full transition-colors duration-500" :class="step <= progress(job) ? job.phase === 'error' ? 'bg-amber-400' : 'bg-emerald-500' : 'bg-slate-100'" />
                    </div>
                    <div v-if="job.phase === 'error' || job.phase === 'done'" class="mt-2 flex items-center gap-3 pl-11 text-xs font-medium text-emerald-700">
                        <button v-if="job.phase === 'done' || job.downloadError" type="button" class="py-1 hover:underline" @click="tracking.download(job.orderId)">{{ job.downloadError ? 'Reintentar descarga' : 'Descargar PDF' }}</button>
                        <button v-else type="button" class="py-1 hover:underline" @click="tracking.refresh(job.orderId)">Consultar estado</button>
                        <RouterLink :to="`/orders/${job.orderId}`" class="py-1 hover:underline">Ver pedido</RouterLink>
                    </div>
                </article>
            </div>
        </section>
    </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowPathIcon, CheckIcon, ClockIcon, DocumentCheckIcon, ExclamationTriangleIcon, MinusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useInvoiceTracking, type InvoiceJob } from '@/composables/useInvoiceTracking'

const tracking = useInvoiceTracking()
const minimized = ref(false)
const active = computed(() => tracking.jobs.some(job => ['saving', 'tracking', 'downloading'].includes(job.phase)))
const hasError = computed(() => tracking.jobs.some(job => job.phase === 'error'))
function progress(job: InvoiceJob) {
    if (job.phase === 'saving') return 0
    if (job.phase === 'downloading' || job.phase === 'done') return 4
    if (['issued', 'credited'].includes(job.document?.status ?? '')) return 3
    return job.document?.submittedAt ? 2 : 1
}
function label(job: InvoiceJob) {
    if (job.error) return job.error
    if (job.phase === 'saving') return 'Guardando solicitud…'
    if (job.phase === 'downloading') return 'Descargando PDF…'
    if (job.phase === 'done') return 'Factura lista · PDF descargado'
    const d = job.document
    if (!d) return 'Solicitud guardada · consultando avance…'
    if (d.status === 'scheduled') return 'Programada · se emitirá al entregar el pedido'
    if (['issued', 'credited'].includes(d.status)) return 'Validada por DIAN · preparando PDF…'
    if (d.status === 'verifying') return 'Verificando el mismo documento con DIAN…'
    if (d.submittedAt) return 'Transmitida · esperando validación DIAN…'
    if (d.status === 'processing') return 'Preparando y transmitiendo la factura…'
    return 'Solicitud guardada · esperando procesamiento…'
}
</script>

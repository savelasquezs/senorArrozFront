<template>
    <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <div>
                <h2 class="font-semibold text-gray-900">Rutas sugeridas</h2>
                <p class="text-xs text-gray-500">
                    {{ plan ? `Plan v${plan.version} · ${plan.capacity.availableNow} libres · ${plan.capacity.availableSoon} próximos` : 'Calculando capacidad y rutas…' }}
                </p>
            </div>
            <button v-if="canRecalculate" type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50" :disabled="loading" @click="$emit('recalculate')">
                Recalcular
            </button>
        </div>

        <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
        <p v-if="plan?.warnings" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 whitespace-pre-line">{{ plan.warnings }}</p>
        <div v-if="preview" class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Vista previa: {{ minutes(preview.approximateDrivingDurationSeconds) }} min · {{ kilometers(preview.approximateDistanceMeters) }} km · {{ preview.stops.map(stop => `#${stop.orderId}`).join(' → ') }}
        </div>
        <div v-if="loading && !plan" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Generando plan…</div>
        <div v-else-if="plan && plan.proposals.length === 0" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No hay rutas sugeridas con la capacidad actual.</div>

        <article v-for="proposal in plan?.proposals ?? []" :key="proposal.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 class="font-semibold text-gray-900">Ruta {{ proposal.sequence }}</h3>
                    <p class="text-xs text-gray-500">{{ recommendation(proposal.recommendation) }} · {{ minutes(proposal.validatedDrivingDurationSeconds ?? proposal.approximateDrivingDurationSeconds) }} min · {{ kilometers(proposal.validatedDistanceMeters ?? proposal.approximateDistanceMeters) }} km</p>
                </div>
                <button v-if="canClaim && proposal.isClaimable" type="button" class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="$emit('claim', proposal)">
                    Tomar {{ proposal.claimableReadyOrderIds.length }} listo(s)
                </button>
            </div>
            <ol class="space-y-2">
                <li v-for="(stop, index) in orderedStops(proposal)" :key="stop.orderId" class="flex gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">{{ stop.stopSequence }}</span>
                    <div class="min-w-0">
                        <p class="font-medium text-gray-900">#{{ stop.orderId }} · {{ stop.neighborhood || stop.address }}</p>
                        <p class="truncate text-xs text-gray-500">{{ stop.address }}</p>
                        <p :class="stop.isReady ? 'text-emerald-700' : 'text-amber-700'" class="text-xs font-medium">{{ stop.isReady ? 'Listo' : `En espera · estimado ${time(stop.estimatedReadyAtUtc)}` }}</p>
                    </div>
                    <div v-if="canEdit" class="ml-auto flex shrink-0 flex-col gap-1">
                        <button type="button" class="rounded border bg-white px-2 text-xs disabled:opacity-30" :disabled="index === 0" @click="move(proposal, index, -1)">↑</button>
                        <button type="button" class="rounded border bg-white px-2 text-xs disabled:opacity-30" :disabled="index === orderedStops(proposal).length - 1" @click="move(proposal, index, 1)">↓</button>
                    </div>
                </li>
            </ol>
            <button v-if="canEdit" type="button" class="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50" :disabled="previewLoading" @click="$emit('preview', orderedStops(proposal).map(stop => stop.orderId))">
                {{ previewLoading ? 'Calculando…' : 'Vista previa de este orden' }}
            </button>
            <p v-if="proposal.planningWarnings" class="text-xs text-amber-700">{{ proposal.planningWarnings }}</p>
        </article>

        <div v-if="plan?.unroutedOrders.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 class="font-semibold text-amber-900">Sin ruta sugerida</h3>
            <p v-for="stop in plan.unroutedOrders" :key="stop.orderId" class="mt-1 text-sm text-amber-800">#{{ stop.orderId }} · {{ reason(stop.unroutedReason) }}</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { DeliveryRouteProposal, DeliveryRoutingPlan, DeliveryRoutingStop } from '@/types/deliveryRouting'

const props = defineProps<{ plan: DeliveryRoutingPlan | null; loading: boolean; error: string | null; canRecalculate: boolean; canClaim: boolean; canEdit: boolean; preview: DeliveryRouteProposal | null; previewLoading: boolean }>()
defineEmits<{ recalculate: []; claim: [proposal: DeliveryRouteProposal]; preview: [orderIds: number[]] }>()
const orders = reactive<Record<number, number[]>>({})

watch(() => props.plan, (plan) => {
    for (const proposal of plan?.proposals ?? []) orders[proposal.id] = proposal.stops.map(stop => stop.orderId)
}, { immediate: true })

const orderedStops = (proposal: DeliveryRouteProposal): DeliveryRoutingStop[] => {
    const byId = new Map(proposal.stops.map(stop => [stop.orderId, stop]))
    return (orders[proposal.id] ?? proposal.stops.map(stop => stop.orderId)).map(id => byId.get(id)!).filter(Boolean)
}
const move = (proposal: DeliveryRouteProposal, index: number, offset: number) => {
    const ids = [...(orders[proposal.id] ?? proposal.stops.map(stop => stop.orderId))]
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    orders[proposal.id] = ids
}

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60))
const kilometers = (meters: number) => (meters / 1000).toFixed(1)
const time = (value: string) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const recommendation = (value: string) => ({ leaveNow: 'Salir ahora', wait: 'Esperar', next: 'Siguiente salida' }[value] ?? value)
const reason = (value: string | null) => ({ requiresLocation: 'falta ubicación', noCapacity: 'sin domiciliario disponible', notSelectedByOptimizer: 'fuera de la combinación óptima' }[value ?? ''] ?? 'pendiente')
</script>

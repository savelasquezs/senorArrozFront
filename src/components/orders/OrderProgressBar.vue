<template>
    <div class="relative">
        <div v-if="compact" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ol class="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Estados del pedido">
            <li v-for="(step, index) in steps" :key="step.status">
                <button type="button" :disabled="!clickable" :aria-current="isCurrentStep(step.status) ? 'step' : undefined"
                    :title="getTooltipText(step)" class="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 py-1 text-xs disabled:cursor-default"
                    :class="isStepCompleted(index) || isCurrentStep(step.status) ? 'bg-emerald-50 text-emerald-800' : 'text-gray-500 hover:bg-gray-50'"
                    @click="handleStepClick(step.status)">
                    <component :is="getStepIcon(step.status)" class="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{{ step.label }}</span>
                    <time v-if="normalizedStatusTimes[step.status] && (isStepCompleted(index) || isCurrentStep(step.status))">{{ formatTime(normalizedStatusTimes[step.status]) }}</time>
                </button>
            </li>
        </ol>
            <dl aria-label="Tiempos del pedido" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-normal text-gray-400 tabular-nums">
                <div title="Desde la hora programada de preparación, o Tomado, hasta Listo">
                    <dt class="sr-only">Tiempo en preparación</dt>
                    <dd>{{ durations.preparation === null ? '—' : `${durations.preparation} min` }} en preparación</dd>
                </div>
                <div v-if="orderType !== 'onsite'" title="Desde En camino hasta Entregado">
                    <dt class="sr-only">Tiempo en entrega</dt>
                    <dd>{{ durations.delivery === null ? '—' : `${durations.delivery} min` }} en entrega</dd>
                </div>
                <div title="Desde la hora programada de preparación, o Tomado, hasta Entregado">
                    <dt class="sr-only">Tiempo total</dt>
                    <dd>{{ durations.total === null ? '—' : `${durations.total} min` }} total</dd>
                </div>
            </dl>
        </div>
        <template v-else>
        <!-- Badge de cancelado (si aplica) -->
        <div v-if="currentStatus === 'cancelled'" class="mb-4">
            <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                <XCircleIcon class="w-4 h-4 mr-2" />
                Pedido Cancelado
            </span>
        </div>

        <!-- Barra de progreso horizontal -->
        <div class="flex items-center justify-between">
            <div v-for="(step, index) in steps" :key="step.status" class="flex-1 flex flex-col items-center relative">
                <!-- Línea conectora (excepto para el primero) -->
                <div v-if="index > 0" class="absolute left-0 right-1/2 top-6 h-0.5 -translate-y-1/2" :class="[
                    isStepCompleted(index - 1)
                        ? 'bg-emerald-600'
                        : 'bg-gray-300'
                ]" style="width: calc(100% + 1rem)" />

                <!-- Línea conectora derecha (excepto para el último) -->
                <div v-if="index < steps.length - 1" class="absolute left-1/2 right-0 top-6 h-0.5 -translate-y-1/2"
                    :class="[
                        isStepCompleted(index)
                            ? 'bg-emerald-600'
                            : 'bg-gray-300'
                    ]" style="width: calc(100% + 1rem)" />

                <!-- Icono del paso -->
                <button :class="[
                    'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                    getStepClasses(step.status),
                    clickable && 'cursor-pointer hover:scale-110',
                    !clickable && 'cursor-default',
                    isCurrentStep(step.status) && 'animate-pulse'
                ]" :title="getTooltipText(step)" :disabled="!clickable" @click="handleStepClick(step.status)">
                    <component :is="getStepIcon(step.status)" :class="[
                        'w-6 h-6',
                        isStepCompleted(index) || isCurrentStep(step.status)
                            ? 'text-white'
                            : 'text-gray-400'
                    ]" />
                </button>

                <!-- Nombre del paso -->
                <div class="mt-2 text-center">
                    <p :class="[
                        'text-xs font-medium',
                        isStepCompleted(index) || isCurrentStep(step.status)
                            ? 'text-gray-900'
                            : 'text-gray-500'
                    ]">
                        {{ step.label }}
                    </p>
                    <p v-if="normalizedStatusTimes[step.status] && (isStepCompleted(index) || isCurrentStep(step.status))"
                        class="text-xs text-gray-500 mt-0.5">
                        {{ formatTime(normalizedStatusTimes[step.status]) }}
                    </p>
                    <p v-if="!compact && normalizedStatusTimes[step.status] && (isStepCompleted(index) || isCurrentStep(step.status))"
                        class="text-xs text-emerald-600 font-medium mt-0.5">
                        {{ formatTimeAgo(normalizedStatusTimes[step.status]) }}
                    </p>
                </div>
            </div>
        </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import { orderDurations } from '@/helpers/orderDurations'
import {
    ClockIcon,
    FireIcon,
    CheckCircleIcon,
    TruckIcon,
    CheckIcon,
    XCircleIcon,
} from '@heroicons/vue/24/solid'

interface Step {
    status: OrderStatus
    label: string
}

interface Props {
    currentStatus: OrderStatus
    statusTimes: Record<string, string>
    clickable?: boolean
    orderType?: 'onsite' | 'delivery' | 'reservation'
    compact?: boolean
    prepareAt?: string | Date | null
}

const props = withDefaults(defineProps<Props>(), {
    clickable: false,
    orderType: 'delivery'
})

const emit = defineEmits<{
    'status-click': [status: OrderStatus]
}>()

const { formatTime, formatTimeAgo } = useFormatting()
const durations = computed(() => orderDurations(props.statusTimes, props.prepareAt))

// Normalizar claves de statusTimes del backend
const normalizedStatusTimes = computed(() => {
    return {
        awaiting_payment: props.statusTimes.awaitingpayment,
        taken: props.statusTimes.taken,
        in_preparation: props.statusTimes.inpreparation,
        ready: props.statusTimes.ready,
        on_the_way: props.statusTimes.ontheway,
        delivered: props.statusTimes.delivered,
        cancelled: props.statusTimes.cancelled
    }
})

// Pasos del flujo (filtrados según tipo de pedido)
const steps = computed<Step[]>(() => {
    const allSteps: Step[] = [
        { status: 'taken', label: 'Tomado' },
        { status: 'in_preparation', label: 'En preparación' },
        { status: 'ready', label: 'Listo' },
        { status: 'on_the_way', label: 'En camino' },
        { status: 'delivered', label: 'Entregado' },
    ]

    // Pedidos onsite saltan on_the_way
    if (props.orderType === 'onsite') {
        return allSteps.filter(step => step.status !== 'on_the_way')
    }

    return allSteps
})

// Índice del paso actual
const currentStepIndex = computed(() => {
    return steps.value.findIndex((step) => step.status === props.currentStatus)
})

// Métodos
const isStepCompleted = (stepIndex: number): boolean => {
    return stepIndex < currentStepIndex.value
}

const isCurrentStep = (status: OrderStatus): boolean => {
    return status === props.currentStatus
}

const getStepClasses = (status: OrderStatus): string => {
    const stepIndex = steps.value.findIndex((s) => s.status === status)

    if (isCurrentStep(status)) {
        return 'bg-emerald-600 border-emerald-600'
    }

    if (isStepCompleted(stepIndex)) {
        return 'bg-emerald-600 border-emerald-600'
    }

    return 'bg-white border-gray-300'
}

const getStepIcon = (status: OrderStatus): any => {
    const stepIndex = steps.value.findIndex((s) => s.status === status)

    // Si está completado, mostrar check
    if (isStepCompleted(stepIndex)) {
        return CheckIcon
    }

    // Iconos específicos por estado
    const iconMap: Record<OrderStatus, any> = {
        awaiting_payment: ClockIcon,
        taken: ClockIcon,
        in_preparation: FireIcon,
        ready: CheckCircleIcon,
        on_the_way: TruckIcon,
        delivered: CheckCircleIcon,
        cancelled: XCircleIcon,
    }

    return iconMap[status] || ClockIcon
}

const getTooltipText = (step: Step): string => {
    const stepIndex = steps.value.findIndex(s => s.status === step.status)
    const time = normalizedStatusTimes.value[step.status]
    if (time && (isStepCompleted(stepIndex) || isCurrentStep(step.status))) {
        return `${step.label} - ${formatTime(time)} (${formatTimeAgo(time)})`
    }
    return step.label
}

const handleStepClick = (status: OrderStatus) => {
    if (props.clickable) {
        emit('status-click', status)
    }
}
</script>

<style scoped>
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

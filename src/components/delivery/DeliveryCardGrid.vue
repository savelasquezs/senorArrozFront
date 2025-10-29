<template>
    <div class="space-y-6">
        <div v-if="orders.length > 0" class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center gap-4">
                <button @click="selectAll" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Seleccionar todos
                </button>
                <button @click="clearSelection" class="text-sm text-gray-600 hover:text-gray-700 font-medium">
                    Limpiar selección
                </button>
                <span v-if="selectedOrders.size > 0" class="text-sm text-gray-600">
                    {{ selectedOrders.size }} seleccionado(s)
                </span>
            </div>

            <BaseButton v-if="canAssign" @click="handleAssign" variant="primary" size="sm">
                <span class="flex items-center gap-2">
                    <TruckIcon class="w-4 h-4" />
                    Asignarme ({{ selectedOrders.size }})
                </span>
            </BaseButton>
        </div>

        <!-- Grupos por barrio -->
        <div v-if="orders.length > 0">
            <div v-for="(group, neighborhood) in ordersByNeighborhood" :key="neighborhood"
                class="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <!-- Header del grupo (clickeable) -->
                <button @click="toggleNeighborhood(neighborhood)"
                    class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-colors">
                    <div class="flex items-center gap-3">
                        <MapPinIcon class="w-5 h-5 text-emerald-600" />
                        <span class="font-semibold text-gray-900">{{ neighborhood }}</span>
                        <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            {{ group.length }} {{ group.length === 1 ? 'pedido' : 'pedidos' }}
                        </span>
                    </div>
                    <ChevronDownIcon
                        :class="['w-5 h-5 text-gray-600 transition-transform', isExpanded(neighborhood) && 'rotate-180']" />
                </button>

                <!-- Contenido del grupo (colapsable) -->
                <Transition>
                    <div v-show="isExpanded(neighborhood)" class="p-4 bg-white">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <OrderCard v-for="order in group" :key="order.id" :order="order"
                                :is-selected="selectedOrders.has(order.id)" variant="delivery"
                                @toggle-select="toggleSelect" />
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <div v-else class="text-center py-12">
            <CheckCircleIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500 text-lg">No hay pedidos disponibles</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderListItem } from '@/types/order'
import OrderCard from '@/components/kitchen/OrderCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { TruckIcon, CheckCircleIcon, MapPinIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ assign: [orderIds: number[]] }>()

const selectedOrders = ref(new Set<number>())
const expandedNeighborhoods = ref<Set<string>>(new Set())

// Computed para agrupar por barrio
const ordersByNeighborhood = computed(() => {
    const groups = new Map<string, OrderListItem[]>()

    props.orders.forEach(order => {
        const neighborhood = order.neighborhoodName || 'Sin barrio'
        if (!groups.has(neighborhood)) {
            groups.set(neighborhood, [])
        }
        groups.get(neighborhood)!.push(order)
    })

    // Convertir Map a Array y ordenar por cantidad de pedidos (más pedidos primero)
    const entries = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)

    // Convertir a objeto para usar en template de Vue
    const result: Record<string, OrderListItem[]> = {}
    entries.forEach(([neighborhood, orders]) => {
        result[neighborhood] = orders
    })
    return result
})

const isExpanded = (neighborhood: string) => expandedNeighborhoods.value.has(neighborhood)

const toggleNeighborhood = (neighborhood: string) => {
    if (expandedNeighborhoods.value.has(neighborhood)) {
        expandedNeighborhoods.value.delete(neighborhood)
    } else {
        expandedNeighborhoods.value.add(neighborhood)
    }
}

// Inicializar: expandir todos por defecto
watch(() => props.orders, () => {
    Object.keys(ordersByNeighborhood.value).forEach(neighborhood => {
        expandedNeighborhoods.value.add(neighborhood)
    })
}, { immediate: true })

const toggleSelect = (orderId: number) => {
    if (selectedOrders.value.has(orderId)) {
        selectedOrders.value.delete(orderId)
    } else {
        selectedOrders.value.add(orderId)
    }
}

const selectAll = () => {
    props.orders.forEach(order => selectedOrders.value.add(order.id))
}

const clearSelection = () => {
    selectedOrders.value.clear()
}

const canAssign = computed(() => selectedOrders.value.size > 0 && selectedOrders.value.size <= 10)

const handleAssign = () => {
    emit('assign', Array.from(selectedOrders.value))
}

defineExpose({ clearSelection })
</script>

<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
                Abonos del día
                <span v-if="advances.length > 0" class="text-gray-500 font-normal text-sm ml-2">
                    ({{ advances.length }})
                </span>
            </h3>
            <BaseButton @click="$emit('create-advance')" variant="primary" size="sm">
                <PlusIcon class="w-4 h-4 mr-2" />
                Nuevo abono
            </BaseButton>
        </div>

        <div v-if="advances.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Domiciliario
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha/Hora
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comentario
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="advance in advances" :key="advance.id" class="hover:bg-gray-50">
                        <td class="px-4 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">{{ advance.deliverymanName }}</div>
                            <div class="text-xs text-gray-500">Por: {{ advance.createdByName }}</div>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap">
                            <span class="text-sm font-semibold text-gray-900">
                                {{ formatCurrency(advance.amount) }}
                            </span>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">{{ formatDate(advance.createdAt) }}</div>
                            <div class="text-xs text-gray-500">{{ formatTime(advance.createdAt) }}</div>
                        </td>
                        <td class="px-4 py-4">
                            <span v-if="advance.notes" class="text-sm text-gray-600">
                                {{ advance.notes }}
                            </span>
                            <span v-else class="text-sm text-gray-400 italic">Sin comentarios</span>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm">
                            <div class="flex items-center gap-2">
                                <button
                                    @click="$emit('edit-advance', advance)"
                                    class="text-emerald-600 hover:text-emerald-700"
                                    title="Editar"
                                >
                                    <PencilIcon class="w-5 h-5" />
                                </button>
                                <button
                                    @click="handleDelete(advance)"
                                    class="text-red-600 hover:text-red-700"
                                    title="Eliminar"
                                >
                                    <TrashIcon class="w-5 h-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot v-if="advances.length > 0" class="bg-gray-50">
                    <tr>
                        <td colspan="1" class="px-4 py-3 text-sm font-semibold text-gray-700">
                            Total
                        </td>
                        <td class="px-4 py-3 text-sm font-bold text-gray-900">
                            {{ formatCurrency(totalAdvances) }}
                        </td>
                        <td colspan="3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div v-else class="text-center py-12 bg-gray-50 rounded-lg">
            <BanknotesIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500">No hay abonos registrados hoy</p>
            <p class="text-sm text-gray-400 mt-1">Crea el primer abono haciendo clic en "Nuevo abono"</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeliverymanAdvance } from '@/types/deliveryman'
import { useFormatting } from '@/composables/useFormatting'
import BaseButton from '@/components/ui/BaseButton.vue'
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon } from '@heroicons/vue/24/outline'

interface Props {
    advances: DeliverymanAdvance[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'create-advance': []
    'edit-advance': [advance: DeliverymanAdvance]
    'delete-advance': [advance: DeliverymanAdvance]
}>()

const { formatCurrency } = useFormatting()

const totalAdvances = computed(() => {
    return props.advances.reduce((sum, advance) => sum + advance.amount, 0)
})

const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    })
}

const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit' 
    })
}

const handleDelete = (advance: DeliverymanAdvance) => {
    if (confirm(`¿Estás seguro de eliminar este abono de ${formatCurrency(advance.amount)} para ${advance.deliverymanName}?`)) {
        emit('delete-advance', advance)
    }
}
</script>


<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-semibold text-gray-900">Proveedores</h3>
                <p class="text-sm text-gray-500">Listado de proveedores disponibles para esta sucursal.</p>
            </div>
            <BaseButton v-if="canManage" variant="primary" size="sm" @click="$emit('create')">
                <PlusIcon class="w-4 h-4 mr-1" />
                Nuevo Proveedor
            </BaseButton>
        </div>

        <div class="overflow-hidden border border-gray-200 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre
                        </th>
                        <th scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Teléfono
                        </th>
                        <th scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dirección
                        </th>
                        <th scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th v-if="canManage" scope="col"
                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="loading">
                        <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">
                            <BaseLoading text="Cargando proveedores..." />
                        </td>
                    </tr>
                    <tr v-else-if="!list || list.items.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">
                            No hay proveedores registrados.
                        </td>
                    </tr>
                    <tr v-else v-for="supplier in list.items" :key="supplier.id"
                        class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">{{ supplier.name }}</div>
                            <div class="text-xs text-gray-500">Creado el {{ formatDate(supplier.createdAt) }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <PhoneNumberItem :phone-number="supplier.phone" />
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-700">
                            {{ supplier.address || '—' }}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-700">
                            {{ supplier.email || '—' }}
                        </td>
                        <td v-if="canManage" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div class="flex justify-end space-x-2">
                                <BaseButton variant="outline" size="sm" @click="$emit('edit', supplier)">
                                    <PencilIcon class="w-4 h-4 mr-1" />
                                    Editar
                                </BaseButton>
                                <BaseButton variant="outline" size="sm" class="text-red-600 hover:text-red-700"
                                    @click="$emit('delete', supplier)">
                                    <TrashIcon class="w-4 h-4 mr-1" />
                                    Eliminar
                                </BaseButton>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="list && list.totalPages > 1" class="flex items-center justify-between pt-2">
            <span class="text-sm text-gray-500">
                Página {{ list.page }} de {{ list.totalPages }}
            </span>
            <div class="flex space-x-2">
                <BaseButton variant="outline" size="sm" :disabled="!list.hasPreviousPage || loading"
                    @click="$emit('previous-page')">
                    Anterior
                </BaseButton>
                <BaseButton variant="outline" size="sm" :disabled="!list.hasNextPage || loading"
                    @click="$emit('next-page')">
                    Siguiente
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PagedResult } from '@/types/common'
import type { Supplier } from '@/types/supplier'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Props {
    list: PagedResult<Supplier> | null
    loading?: boolean
    canManage?: boolean
}

withDefaults(defineProps<Props>(), {
    loading: false,
    canManage: false
})

defineEmits<{
    (e: 'create'): void
    (e: 'edit', supplier: Supplier): void
    (e: 'delete', supplier: Supplier): void
    (e: 'previous-page'): void
    (e: 'next-page'): void
}>()

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}
</script>

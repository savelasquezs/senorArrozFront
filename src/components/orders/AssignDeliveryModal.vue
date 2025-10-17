<template>
    <BaseDialog :model-value="open" :title="`Asignar Domiciliario - Pedido #${order.id}`"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-4">
            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-sm text-gray-600">
                    {{ order.typeDisplayName }} - {{ order.statusDisplayName }}
                </div>
                <div v-if="order.deliveryManName" class="mt-2 text-sm">
                    <span class="text-gray-600">Domiciliario actual:</span>
                    <p class="text-gray-900 font-medium">{{ order.deliveryManName }}</p>
                </div>
            </div>

            <!-- Selector de domiciliario -->
            <BaseSelect v-model="selectedDeliveryManId" :options="deliverymanOptions" label="Domiciliario"
                placeholder="Seleccionar domiciliario..." :loading="loading" value-key="value" display-key="label">
                <template #icon>
                    <TruckIcon class="w-4 h-4" />
                </template>
            </BaseSelect>

            <p class="text-sm text-gray-500">
                Selecciona "Sin asignar" para quitar la asignación actual
            </p>
        </div>

        <template #actions>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="selectedDeliveryManId === order.deliveryManId"
                @click="handleSave">
                {{ selectedDeliveryManId === null ? 'Desasignar' : 'Asignar' }}
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { OrderListItem } from '@/types/order'
import type { User } from '@/types/user'
import { orderApi } from '@/services/MainAPI/orderApi'
import { userApi } from '@/services/MainAPI/userApi'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { TruckIcon } from '@heroicons/vue/24/outline'

interface Props {
    open: boolean
    order: OrderListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: []
}>()

const { success, error } = useToast()

// Estado
const loading = ref(false)
const saving = ref(false)
const deliverymen = ref<User[]>([])
const selectedDeliveryManId = ref<number | null>(props.order.deliveryManId)

// Computed
const deliverymanOptions = computed<Array<{ value: number | null; label: string }>>(() => {
    const options: Array<{ value: number | null; label: string }> = [
        { value: null, label: 'Sin asignar' }
    ]

    deliverymen.value.forEach((user) => {
        options.push({
            value: user.id,
            label: user.name,
        })
    })

    return options
})

// Métodos
const fetchDeliverymen = async () => {
    loading.value = true
    try {
        // Obtener usuarios con rol Deliveryman
        const response = await userApi.getUsers({
            role: 'Deliveryman',
            active: true
        })
        deliverymen.value = response.data.items
    } catch (err: any) {
        error('Error al cargar domiciliarios', err.message)
    } finally {
        loading.value = false
    }
}

const handleSave = async () => {
    saving.value = true
    try {
        if (selectedDeliveryManId.value === null) {
            // Desasignar
            await orderApi.unassignDelivery(props.order.id)
            success('Domiciliario desasignado', 5000, 'El domiciliario ha sido removido del pedido')
        } else {
            // Asignar
            await orderApi.assignDelivery(props.order.id, selectedDeliveryManId.value)
            success('Domiciliario asignado', 5000, 'El domiciliario ha sido asignado al pedido')
        }

        emit('updated')
        emit('close')
    } catch (err: any) {
        error('Error al asignar domiciliario', err.message)
    } finally {
        saving.value = false
    }
}

// Watchers
watch(
    () => props.open,
    (newVal) => {
        if (newVal) {
            selectedDeliveryManId.value = props.order.deliveryManId
            fetchDeliverymen()
        }
    }
)

// Lifecycle
onMounted(() => {
    if (props.open) {
        fetchDeliverymen()
    }
})
</script>

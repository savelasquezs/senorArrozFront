<!-- src/components/ui/NeighborhoodSearch.vue -->
<template>
    <div class="space-y-2">
        <BaseSelect v-model="selectedNeighborhoodId" :options="neighborhoodOptions" label="Barrio"
            placeholder="Buscar barrio..." :required="required" :error="error" :searchable="true" :allow-create="true"
            create-label="Crear barrio" value-key="id" display-key="name" @update:model-value="handleSelection"
            @create="handleCreateRequest">
            <template #icon>
                <MapPinIcon class="w-4 h-4" />
            </template>
        </BaseSelect>

        <!-- Selected Neighborhood Info -->
        <div v-if="selectedNeighborhood" class="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <div class="font-medium">{{ selectedNeighborhood.name.toLocaleUpperCase() }} :${{
                selectedNeighborhood.deliveryFee.toLocaleString() }} </div>
        </div>

        <!-- Create Neighborhood Dialog -->
        <BaseDialog v-model="showCreateForm" title="Crear Nuevo Barrio" :icon="PlusIcon" size="md">
            <NeighborhoodForm :neighborhood="createFormData" :loading="createLoading" @submit="handleCreateNeighborhood"
                @cancel="showCreateForm = false" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import NeighborhoodForm from '@/components/neighborhoods/NeighborhoodForm.vue'
import { useBranchesStore } from '@/store/branches'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import { MapPinIcon, PlusIcon } from '@heroicons/vue/24/outline'
import type { NeighborhoodFormData } from '@/types/customer'

import { useAuthStore } from '@/store/auth'

function toSelectOptions(items: Array<{ id: number; name: string; deliveryFee: number }>) {
    return items.map((n) => ({
        id: n.id,
        name: n.name,
        description: `Tarifa: $${n.deliveryFee.toLocaleString()}`,
    }))
}

interface Props {
    modelValue?: number | null
    required?: boolean
    error?: string
}

const props = withDefaults(defineProps<Props>(), {
    required: false
})

const emit = defineEmits<{
    'update:modelValue': [value: number | null]
}>()
const branchesStore = useBranchesStore()
const customersStore = useCustomersStore()
const { success, error: showError } = useToast()

// Reactive state
const branchId = computed(() => useAuthStore().branchId)
const selectedNeighborhoodId = ref<number | null>(null)
const showCreateForm = ref(false)
const createLoading = ref(false)
const createFormData = ref<NeighborhoodFormData | null>(null)

// Barrios: GET /customers/neighborhoods (todos los roles con sucursal). Fallback a sucursal cargada en branchesStore.
const neighborhoodOptions = computed(() => {
    const fromApi = customersStore.neighborhoods
    if (fromApi.length > 0) {
        return toSelectOptions(fromApi)
    }

    const branchList = branchesStore.currentNeighborhoods
    if (!branchList?.length) return []

    return toSelectOptions(
        branchList.filter((n) => !branchId.value || n.branchId === branchId.value)
    )
})

const selectedNeighborhood = computed(() => {
    if (!selectedNeighborhoodId.value) return null
    const id = selectedNeighborhoodId.value
    const fromCustomers = customersStore.neighborhoods.find((n) => n.id === id)
    if (fromCustomers) return fromCustomers
    return branchesStore.currentNeighborhoods?.find((n) => n.id === id) ?? null
})

onMounted(() => {
    if (customersStore.neighborhoods.length === 0) {
        customersStore.fetchNeighborhoods().catch((err) => {
            console.error('Error loading neighborhoods:', err)
            showError('Error de carga', 'No se pudieron cargar los barrios.')
        })
    }
})

// Methods
const handleSelection = (value: number | null) => {
    selectedNeighborhoodId.value = value
    emit('update:modelValue', value)
}

const handleCreateRequest = (searchValue: string) => {
    // Store the search value to pre-fill the form
    createFormData.value = {
        name: searchValue,
        deliveryFee: 0
    }
    showCreateForm.value = true
}

const handleCreateNeighborhood = async (data: NeighborhoodFormData) => {
    try {
        createLoading.value = true

        const newNeighborhood = await customersStore.createNeighborhood({
            ...data,
            branchId: branchId.value || 0,
        })

        if (branchesStore.current?.neighborhoods) {
            const exists = branchesStore.current.neighborhoods.some((n) => n.id === newNeighborhood.id)
            if (!exists) {
                branchesStore.current.neighborhoods.push({
                    id: newNeighborhood.id,
                    branchId: newNeighborhood.branchId ?? branchId.value ?? 0,
                    name: newNeighborhood.name,
                    deliveryFee: newNeighborhood.deliveryFee,
                    createdAt: newNeighborhood.createdAt ?? '',
                    updatedAt: newNeighborhood.updatedAt ?? '',
                    totalCustomers: 0,
                    totalAddresses: 0,
                })
            }
        }

        // Select the newly created neighborhood
        selectedNeighborhoodId.value = newNeighborhood.id
        showCreateForm.value = false

        emit('update:modelValue', newNeighborhood.id)
        success('Barrio Creado', 3000, `El barrio "${newNeighborhood.name}" ha sido creado correctamente.`)

    } catch (error) {
        console.error('Error creating neighborhood:', error)
        showError('Error al Crear', 'No se pudo crear el barrio. Intenta nuevamente.')
    } finally {
        createLoading.value = false
    }
}

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
    selectedNeighborhoodId.value = newValue || null
}, { immediate: true })




</script>

<!-- src/components/ui/NeighborhoodSearch.vue -->
<template>
    <div class="space-y-2">
        <BaseSelect v-model="selectedNeighborhoodId" :options="neighborhoodOptions" :label="label"
            :placeholder="placeholder" :required="required" :error="error" :searchable="true" :allow-create="true"
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
import { ref, computed, watch } from 'vue'
import BaseSelect from './BaseSelect.vue'
import BaseDialog from './BaseDialog.vue'
import NeighborhoodForm from '@/components/NeighborhoodForm.vue'
import { useBranchesStore } from '@/store/branches'
import { useToast } from '@/composables/useToast'
import { MapPinIcon, PlusIcon } from '@heroicons/vue/24/outline'
import type { NeighborhoodFormData } from '@/types/customer'
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'

interface Props {
    modelValue?: number | null
    label?: string
    placeholder?: string
    required?: boolean
    error?: string
    branchId?: number
}

const props = withDefaults(defineProps<Props>(), {
    label: 'Barrio',
    placeholder: 'Buscar barrio...',
    required: false
})

const emit = defineEmits<{
    'update:modelValue': [value: number | null]
}>()

const branchesStore = useBranchesStore()
const { success, error: showError } = useToast()

// Reactive state
const selectedNeighborhoodId = ref<number | null>(null)
const showCreateForm = ref(false)
const createLoading = ref(false)
const createFormData = ref<NeighborhoodFormData | null>(null)

// Computed
const neighborhoodOptions = computed(() => {
    if (!branchesStore.currentNeighborhoods) return []

    return branchesStore.currentNeighborhoods
        .filter(neighborhood => {
            // Filter by branch if provided
            if (props.branchId && neighborhood.branchId !== props.branchId) return false
            return true
        })
        .map(neighborhood => ({
            id: neighborhood.id,
            name: neighborhood.name,
            description: `Tarifa: $${neighborhood.deliveryFee.toLocaleString()}`
        }))
})

const selectedNeighborhood = computed(() => {
    if (!selectedNeighborhoodId.value || !branchesStore.currentNeighborhoods) return null
    return branchesStore.currentNeighborhoods.find(n => n.id === selectedNeighborhoodId.value) || null
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

        // Create neighborhood with current branch
        const newNeighborhood = await branchesStore.createNeighborhood({
            ...data,
            branchId: props.branchId || 0
        })

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

// Watch for branch changes to load neighborhoods
watch(() => props.branchId, async (newBranchId) => {
    if (newBranchId) {
        try {
            await branchesStore.fetchById(newBranchId)
        } catch (error) {
            console.error('Error loading branch neighborhoods:', error)
            showError('Error de Carga', 'No se pudieron cargar los barrios de la sucursal.')
        }
    }
}, { immediate: true })

onMounted(async () => {
    if (!props.branchId) {
        const branchId = useAuthStore().branchId
        if (!branchId) return
        await branchesStore.fetchById(branchId)
    }
    else {
        await branchesStore.fetchById(props.branchId)
    }
})
</script>

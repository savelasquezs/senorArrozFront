<!-- src/components/ui/NeighborhoodSearch.vue -->
<template>
    <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
            {{ label }}
            <span v-if="required" class="text-red-500 ml-1">*</span>
        </label>

        <div class="relative">
            <BaseInput v-model="searchQuery" :placeholder="placeholder" :error="error" @input="handleSearch"
                @focus="showDropdown = true" @blur="handleBlur">
                <template #icon>
                    <MapPinIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <!-- Dropdown with search results -->
            <div v-if="showDropdown && (searchResults.length > 0 || showCreateOption)"
                class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <!-- Search Results -->
                <div v-for="neighborhood in searchResults" :key="neighborhood.id"
                    @click="selectNeighborhood(neighborhood)"
                    class="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <div class="text-sm font-medium text-gray-900">{{ neighborhood.name }}</div>
                    <div class="text-xs text-gray-500">${{ neighborhood.deliveryFee.toLocaleString() }}</div>
                </div>

                <!-- Create New Option -->
                <div v-if="showCreateOption" @click="openCreateDialog"
                    class="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 bg-blue-25">
                    <div class="text-sm font-medium text-blue-600 flex items-center">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Crear barrio "{{ searchQuery }}"
                    </div>
                    <div class="text-xs text-blue-500">Haz clic para crear un nuevo barrio</div>
                </div>
            </div>
        </div>

        <!-- Selected Neighborhood Info -->
        <div v-if="selectedNeighborhood" class="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <div class="font-medium">{{ selectedNeighborhood.name }}</div>
            <div>Tarifa: ${{ selectedNeighborhood.deliveryFee.toLocaleString() }}</div>
        </div>

        <!-- Create Neighborhood Dialog -->
        <BaseDialog v-model="showCreateForm" title="Crear Nuevo Barrio" :icon="PlusIcon" size="md">
            <NeighborhoodForm :neighborhood="null" :loading="createLoading" @submit="handleCreateNeighborhood"
                @cancel="showCreateForm = false" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseInput from './BaseInput.vue'
import BaseDialog from './BaseDialog.vue'
import NeighborhoodForm from '@/components/NeighborhoodForm.vue'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import { MapPinIcon, PlusIcon } from '@heroicons/vue/24/outline'
import type { Neighborhood, NeighborhoodFormData } from '@/types/customer'

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

const customersStore = useCustomersStore()
const { success, error: showError, warning } = useToast()

// Reactive state
const searchQuery = ref('')
const showDropdown = ref(false)
const showCreateForm = ref(false)
const createLoading = ref(false)
const selectedNeighborhood = ref<Neighborhood | null>(null)

// Computed
const searchResults = computed(() => {
    if (!searchQuery.value.trim() || !customersStore.availableNeighborhoods) return []

    const query = searchQuery.value.toLowerCase()
    return customersStore.availableNeighborhoods
        .filter(neighborhood => {
            // Filter by branch if provided
            if (props.branchId && neighborhood.branchId !== props.branchId) return false

            // Filter by search query
            return neighborhood.name.toLowerCase().includes(query)
        })
        .slice(0, 10) // Limit results
})

const showCreateOption = computed(() => {
    if (!searchQuery.value.trim() || searchResults.value.length > 0) return false

    // Show create option if no exact match found
    const exactMatch = customersStore.availableNeighborhoods?.find(neighborhood =>
        neighborhood.name.toLowerCase() === searchQuery.value.toLowerCase() &&
        (!props.branchId || neighborhood.branchId === props.branchId)
    )

    return !exactMatch && searchQuery.value.length >= 2
})

// Methods
const handleSearch = () => {
    showDropdown.value = true
}

const handleBlur = () => {
    // Delay hiding dropdown to allow clicks
    setTimeout(() => {
        showDropdown.value = false
    }, 200)
}

const selectNeighborhood = (neighborhood: Neighborhood) => {
    selectedNeighborhood.value = neighborhood
    searchQuery.value = neighborhood.name
    showDropdown.value = false
    emit('update:modelValue', neighborhood.id)
}

const openCreateDialog = () => {
    showCreateForm.value = true
    showDropdown.value = false
}

const handleCreateNeighborhood = async (data: NeighborhoodFormData) => {
    try {
        createLoading.value = true

        // Create neighborhood with current branch
        const newNeighborhood = await customersStore.createNeighborhood({
            ...data,
            branchId: props.branchId || 0
        })

        // Select the newly created neighborhood
        selectedNeighborhood.value = newNeighborhood
        searchQuery.value = newNeighborhood.name
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
    if (newValue && customersStore.availableNeighborhoods) {
        const neighborhood = customersStore.availableNeighborhoods.find(n => n.id === newValue)
        if (neighborhood) {
            selectedNeighborhood.value = neighborhood
            searchQuery.value = neighborhood.name
        }
    } else if (!newValue) {
        selectedNeighborhood.value = null
        searchQuery.value = ''
    }
}, { immediate: true })

// Load neighborhoods on mount
onMounted(async () => {
    try {
        await customersStore.fetchNeighborhoods()
        success('Barrios Cargados', 2000, 'Los barrios disponibles han sido cargados correctamente.')
    } catch (error) {
        console.error('Error loading neighborhoods:', error)
        showError('Error de Carga', 'No se pudieron cargar los barrios disponibles.')
    }
})
</script>

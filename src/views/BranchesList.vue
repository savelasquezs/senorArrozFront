<!-- src/views/BranchesList.vue -->
<template>
    <MainLayout page-title="Sucursales">
        <!-- Loading State -->
        <BaseLoading v-if="store.isLoading" text="Cargando sucursales..." />

        <!-- Content -->
        <div v-else class="space-y-6">
            <!-- Filters Card -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Filtros de búsqueda</h3>
                    <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar filtros
                    </BaseButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <BaseInput v-model="name" label="Nombre" placeholder="Buscar por nombre"
                        :icon="MagnifyingGlassIcon" />
                    <BaseInput v-model="address" label="Dirección" placeholder="Buscar por dirección"
                        :icon="MapPinIcon" />
                    <BaseInput v-model="phone" label="Teléfono" placeholder="Buscar por teléfono" :icon="PhoneIcon" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Sucursales" :value="store.list?.totalCount || 0" icon="store" />
                <StatsCard title="Usuarios Activos" :value="totalActiveUsers" icon="users" />
                <StatsCard title="Clientes Activos" :value="totalActiveCustomers" icon="users" />
                <StatsCard title="Barrios Cubiertos" :value="totalNeighborhoods" icon="clipboard" />
            </div>

            <!-- Branches Table -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        Lista de Sucursales
                        <span class="text-sm font-normal text-gray-500">({{ store.list?.items?.length || 0 }} de {{
                            store.list?.totalCount || 0 }})</span>
                    </h3>

                    <BaseButton v-if="auth.isSuperadmin" @click="openCreate" variant="primary" size="sm"
                        :icon="PlusIcon">
                        Nueva Sucursal
                    </BaseButton>
                </div>

                <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sucursal
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contacto
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estadísticas
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th
                                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-if="(store.list?.items?.length || 0) === 0">
                                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                                    <BuildingOffice2Icon class="mx-auto h-12 w-12 text-gray-400" />
                                    <p class="mt-2 text-lg font-medium">No hay sucursales</p>
                                    <p class="text-sm">No se encontraron sucursales con los filtros aplicados</p>
                                </td>
                            </tr>

                            <tr v-for="branch in store.list?.items || []" :key="branch.id" class="hover:bg-gray-50">
                                <!-- Branch Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <BuildingOffice2Icon class="h-5 w-5 text-emerald-600" />
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">
                                                {{ branch.name }}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                {{ branch.address }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Contact Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <PhoneIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ branch.phone1 }}
                                        </div>
                                        <div v-if="branch.phone2" class="flex items-center mt-1">
                                            <PhoneIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ branch.phone2 }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Statistics -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <UsersIcon class="h-4 w-4 text-blue-400 mr-1" />
                                            {{ branch.activeUsers }}/{{ branch.totalUsers }} usuarios
                                        </div>
                                        <div class="flex items-center mt-1">
                                            <UserGroupIcon class="h-4 w-4 text-green-400 mr-1" />
                                            {{ branch.activeCustomers }}/{{ branch.totalCustomers }} clientes
                                        </div>
                                        <div class="flex items-center mt-1">
                                            <MapIcon class="h-4 w-4 text-orange-400 mr-1" />
                                            {{ branch.totalNeighborhoods }} barrios
                                        </div>
                                    </div>
                                </td>

                                <!-- Status -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <BaseBadge variant="success">
                                        Activa
                                    </BaseBadge>
                                </td>

                                <!-- Actions -->
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex justify-end space-x-2">
                                        <BaseButton @click="goDetail(branch.id)" variant="outline" size="sm"
                                            :icon="EyeIcon" title="Ver detalles">
                                            Ver
                                        </BaseButton>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="store.list && store.list.totalPages > 1" class="flex items-center justify-between mt-6">
                    <div class="text-sm text-gray-700">
                        Mostrando {{ ((store.list.page - 1) * store.list.pageSize) + 1 }} a
                        {{ Math.min(store.list.page * store.list.pageSize, store.list.totalCount) }} de
                        {{ store.list.totalCount }} resultados
                    </div>
                    <div class="flex space-x-2">
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasPreviousPage"
                            @click="previousPage" :icon="ChevronLeftIcon">
                            Anterior
                        </BaseButton>
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasNextPage" @click="nextPage"
                            :right-icon="ChevronRightIcon">
                            Siguiente
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>

        <!-- Create Branch Dialog -->
        <BaseDialog v-model="showCreate" title="Nueva Sucursal" :icon="PlusIcon" size="lg">
            <div class="space-y-4">
                <BaseInput v-model="formName" label="Nombre de la sucursal" placeholder="Ej: Sucursal Centro"
                    required />
                <BaseInput v-model="formAddress" label="Dirección" placeholder="Ej: Calle 123 #45-67" required />
                <BaseInput v-model="formPhone1" label="Teléfono principal" placeholder="Ej: (601) 234-5678" required />
                <BaseInput v-model="formPhone2" label="Teléfono secundario" placeholder="Ej: (601) 234-5679" />

                <div class="flex justify-end space-x-3 pt-4">
                    <BaseButton @click="showCreate = false" variant="secondary">
                        Cancelar
                    </BaseButton>
                    <BaseButton :disabled="!formName || !formAddress || !formPhone1" :loading="creating"
                        variant="primary" @click="submitCreate">
                        Crear Sucursal
                    </BaseButton>
                </div>
            </div>
        </BaseDialog>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import StatsCard from '@/components/ui/StatsCard.vue'

import {
    BuildingOffice2Icon,
    UsersIcon,
    UserGroupIcon,
    MapIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    PlusIcon,
    EyeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

const store = useBranchesStore()
const auth = useAuthStore()
const router = useRouter()
const { success, error: showError } = useToast()

// Filters
const name = ref('')
const address = ref('')
const phone = ref('')

// Pagination
const page = ref(1)
const pageSize = ref(10)

// Create dialog
const showCreate = ref(false)
const formName = ref('')
const formAddress = ref('')
const formPhone1 = ref('')
const formPhone2 = ref('')
const creating = ref(false)

// Computed stats
const totalActiveUsers = computed(() => {
    return store.list?.items?.reduce((sum, branch) => sum + branch.activeUsers, 0) || 0
})

const totalActiveCustomers = computed(() => {
    return store.list?.items?.reduce((sum, branch) => sum + branch.activeCustomers, 0) || 0
})

const totalNeighborhoods = computed(() => {
    return store.list?.items?.reduce((sum, branch) => sum + branch.totalNeighborhoods, 0) || 0
})

// Methods
const load = async () => {
    try {
        await store.fetch({
            Name: name.value || undefined,
            Address: address.value || undefined,
            Phone: phone.value || undefined,
            Page: page.value,
            PageSize: pageSize.value
        })
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar las sucursales')
    }
}

const clearFilters = async () => {
    name.value = ''
    address.value = ''
    phone.value = ''
    page.value = 1
    await load()
}

const goDetail = (id: number) => router.push({ name: 'BranchDetail', params: { id } })

const openCreate = () => {
    formName.value = ''
    formAddress.value = ''
    formPhone1.value = ''
    formPhone2.value = ''
    showCreate.value = true
}

const submitCreate = async () => {
    try {
        creating.value = true
        await store.create({
            name: formName.value,
            address: formAddress.value,
            phone1: formPhone1.value,
            phone2: formPhone2.value
        })
        showCreate.value = false
        success('Sucursal creada', 3000, `La sucursal "${formName.value}" se ha creado correctamente`)
        await load()
    } catch (e) {
        showError('Error al crear', store.error || 'No se pudo crear la sucursal')
    } finally {
        creating.value = false
    }
}

const previousPage = async () => {
    if (store.list?.hasPreviousPage) {
        page.value--
        await load()
    }
}

const nextPage = async () => {
    if (store.list?.hasNextPage) {
        page.value++
        await load()
    }
}

onMounted(load)
</script>
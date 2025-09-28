<!-- src/views/BranchDetail.vue -->
<template>
    <MainLayout>
        <div class="p-6">
            <!-- Loading State -->
            <BaseLoading v-if="branchesStore.isLoading" text="Cargando sucursal..." />

            <!-- Access Denied -->
            <BaseAlert v-else-if="!canAccessBranch" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Acceso Denegado</h3>
                    <p class="mt-1">No tienes permisos para ver esta sucursal.</p>
                </div>
            </BaseAlert>

            <!-- Branch Content -->
            <div v-else-if="branch" class="space-y-6">
                <!-- Branch Header -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <BuildingOffice2Icon class="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">{{ branch.name }}</h1>
                                    <p class="text-sm text-gray-500">Sucursal ID: {{ branch.id }}</p>
                                </div>
                            </div>

                            <!-- Actions (Only for Superadmin) -->
                            <div v-if="authStore.user?.role === 'Superadmin'" class="flex space-x-2">
                                <BaseButton @click="openEditDialog" variant="secondary" :icon="PencilIcon">
                                    Editar
                                </BaseButton>
                                <BaseButton @click="confirmDelete" variant="danger" :icon="TrashIcon">
                                    Eliminar
                                </BaseButton>
                            </div>
                        </div>
                    </div>

                    <!-- Branch Info -->
                    <div class="px-6 py-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="flex items-center">
                                <MapPinIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Dirección</p>
                                    <p class="text-sm text-gray-600">{{ branch.address }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <PhoneIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Teléfono Principal</p>
                                    <p class="text-sm text-gray-600">{{ branch.phone1 }}</p>
                                </div>
                            </div>

                            <div v-if="branch.phone2" class="flex items-center">
                                <PhoneIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Teléfono Secundario</p>
                                    <p class="text-sm text-gray-600">{{ branch.phone2 }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <UserGroupIcon class="w-8 h-8 text-blue-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Usuarios</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ branch.users.length }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <MapIcon class="w-8 h-8 text-green-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Barrios</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ branch.neighborhoods?.length || 0 }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <UsersIcon class="w-8 h-8 text-purple-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Clientes</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ totalCustomers }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CalendarIcon class="w-8 h-8 text-orange-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Creada</p>
                                <p class="text-sm font-semibold text-gray-900">{{ formatDate(branch.createdAt) }}</p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <!-- Users Section -->
                <BaseCard>
                    <BranchUsersTable :users="branch.users" :branch-id="branch.id" @user-created="handleUserCreated"
                        @user-updated="handleUserUpdated" @user-status-toggled="handleUserStatusToggled" />
                </BaseCard>

                <!-- Neighborhoods Section -->
                <BaseCard v-if="branch.neighborhoods && branch.neighborhoods.length > 0">
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            Barrios de Cobertura
                            <span class="text-sm font-normal text-gray-500">({{ branch.neighborhoods.length }})</span>
                        </h3>

                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Barrio
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tarifa Domicilio
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Clientes
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Direcciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="neighborhood in branch.neighborhoods" :key="neighborhood.id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {{ neighborhood.name }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            ${{ neighborhood.deliveryFee?.toLocaleString() }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ neighborhood.totalCustomers || 0 }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ neighborhood.totalAddresses || 0 }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <!-- Edit Branch Dialog -->
            <BaseDialog v-model="showEditDialog" title="Editar Sucursal" :icon="PencilIcon" size="lg">
                <BranchForm :branch="branch" @submit="handleEditSubmit" @cancel="showEditDialog = false"
                    :loading="branchesStore.isLoading" />
            </BaseDialog>

            <!-- Delete Confirmation Dialog -->
            <BaseDialog v-model="showDeleteDialog" title="Confirmar Eliminación" :icon="ExclamationTriangleIcon"
                icon-variant="danger" size="md">
                <div class="text-center">
                    <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-600" />
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900">Eliminar Sucursal</h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-500">
                                ¿Estás seguro de que deseas eliminar la sucursal
                                <strong>{{ branch?.name }}</strong>?
                            </p>
                            <p class="text-sm text-red-600 mt-2">
                                Esta acción no se puede deshacer y eliminará todos los datos asociados.
                            </p>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <BaseButton @click="showDeleteDialog = false" variant="secondary">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="handleDelete" variant="danger" :loading="branchesStore.isLoading">
                        Eliminar Sucursal
                    </BaseButton>
                </template>
            </BaseDialog>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BranchUsersTable from '@/components/BranchUsersTable.vue'
import BranchForm from '@/components/BranchForm.vue'
import {
    BuildingOffice2Icon,
    PencilIcon,
    TrashIcon,
    MapPinIcon,
    PhoneIcon,
    UserGroupIcon,
    MapIcon,
    UsersIcon,
    CalendarIcon,
    ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import type { User } from '@/types/user'

const route = useRoute()
const router = useRouter()
const branchesStore = useBranchesStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// Reactive state
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

const branchId = computed(() => Number(route.params.id))

const branch = computed(() => branchesStore.current)

const canAccessBranch = computed(() => {
    if (!branch.value) return false

    const userRole = authStore.user?.role
    const userBranchId = authStore.user?.branchId

    // Superadmin can access all branches
    if (userRole === 'Superadmin') return true

    // Admin can only access their own branch
    if (userRole === 'Admin') return userBranchId === branch.value.id

    return false
})



const totalCustomers = computed(() => {
    return branch.value?.neighborhoods?.reduce((total, n) => total + (n.totalCustomers || 0), 0) || 0
})

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// Actions
const openEditDialog = () => {
    showEditDialog.value = true
}

const confirmDelete = () => {
    showDeleteDialog.value = true
}

const handleEditSubmit = async (formData: any) => {
    try {
        await branchesStore.update(branchId.value, formData)
        showEditDialog.value = false
        success('Sucursal actualizada', 3000, 'La sucursal se ha actualizado correctamente')
    } catch (error: any) {
        console.error('Error updating branch:', error)
        showError('Error al actualizar', error.message || 'No se pudo actualizar la sucursal')
    }
}

const handleDelete = async () => {
    try {
        await branchesStore.remove(branchId.value)
        showDeleteDialog.value = false
        success('Sucursal eliminada', 3000, 'La sucursal se ha eliminado correctamente')
        router.push('/branches')
    } catch (error: any) {
        console.error('Error deleting branch:', error)
        showError('Error al eliminar', error.message || 'No se pudo eliminar la sucursal')
    }
}

const handleUserCreated = (user: User) => {
    // User is already added to the store by the users table component
    success('Usuario creado', 3000, `El usuario ${user.name} se ha creado correctamente`)
}

const handleUserUpdated = (user: User) => {
    // User is already updated in the store by the users table component
    success('Usuario actualizado', 3000, `El usuario ${user.name} se ha actualizado correctamente`)
}

const handleUserStatusToggled = (user: User) => {
    // User status is already toggled in the store by the users table component
    const status = user.active ? 'activado' : 'desactivado'
    success('Estado actualizado', 3000, `El usuario ${user.name} ha sido ${status}`)
}

// Lifecycle
onMounted(async () => {
    try {
        // Check if user has access before making API calls
        const userRole = authStore.user?.role
        const userBranchId = authStore.user?.branchId

        const hasAccess = userRole === 'Superadmin' || (userRole === 'Admin' && userBranchId === branchId.value)

        if (!hasAccess) {
            return
        }

        // Fetch branch details
        await branchesStore.fetchById(branchId.value)

        // Fetch users for this branch

    } catch (error) {
        console.error('Error loading branch data:', error)
        // Could redirect to branches list or show error
    }
})
</script>
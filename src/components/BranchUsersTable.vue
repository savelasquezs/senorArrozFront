<!-- src/components/BranchUsersTable.vue -->
<template>
    <div class="space-y-4">
        <!-- Header with Create Button -->
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
                Usuarios de la Sucursal
                <span class="text-sm font-normal text-gray-500">({{ users.length }})</span>
            </h3>

            <BaseButton v-if="canManageUsers" @click="openCreateDialog" variant="primary" size="sm" :icon="PlusIcon">
                Crear Usuario
            </BaseButton>
        </div>

        <!-- Users Table -->
        <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuario
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rol
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Último Acceso
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="users.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            <UserGroupIcon class="mx-auto h-12 w-12 text-gray-400" />
                            <p class="mt-2">No hay usuarios en esta sucursal</p>
                        </td>
                    </tr>

                    <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
                        <!-- User Info -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10">
                                    <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <UserIcon class="h-5 w-5 text-green-600" />
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">
                                        {{ user.name }}
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        {{ user.email }}
                                    </div>
                                </div>
                            </div>
                        </td>

                        <!-- Role -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <BaseBadge :variant="getRoleVariant(user.role)">
                                {{ getRoleLabel(user.role) }}
                            </BaseBadge>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <BaseBadge :variant="user.active ? 'success' : 'danger'">
                                {{ user.active ? 'Activo' : 'Inactivo' }}
                            </BaseBadge>
                        </td>

                        <!-- Last Login -->
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ formatLastLogin(user.lastLogin) }}
                        </td>

                        <!-- Actions -->
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div class="flex justify-end space-x-2">
                                <BaseButton @click="openEditDialog(user)" variant="outline" size="sm" :icon="PencilIcon"
                                    title="Editar usuario" />

                                <BaseButton @click="toggleStatus(user)" variant="outline" size="sm"
                                    :icon="user.active ? EyeSlashIcon : EyeIcon"
                                    :title="user.active ? 'Desactivar' : 'Activar'" :loading="usersStore.isLoading" />
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Create/Edit User Dialog -->
        <BaseDialog v-model="showDialog" :title="editingUser ? 'Editar Usuario' : 'Nuevo Usuario'"
            :icon="editingUser ? PencilIcon : PlusIcon" size="lg">
            <UserForm :user="editingUser" :branch-id="branchId" @submit="handleSubmit" @cancel="closeDialog"
                :loading="usersStore.isLoading" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUsersStore } from '@/store/users'
import { useAuthStore } from '@/store/auth'
import type { User, UserRole } from '@/types/user'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import UserForm from './UserForm.vue'
import {
    PlusIcon,
    UserGroupIcon,
    UserIcon,
    PencilIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/vue/24/outline'
import type { BranchUserSummary } from '@/types/common'

interface Props {
    users: BranchUserSummary[]
    branchId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
    userCreated: [user: User]
    userUpdated: [user: User]
    userStatusToggled: [user: User]
}>()

const usersStore = useUsersStore()
const authStore = useAuthStore()

// Dialog state
const showDialog = ref(false)
const editingUser = ref<BranchUserSummary | null>(null)

const canManageUsers = computed(() => {
    const role = authStore.user?.role
    return role === 'Superadmin' || role === 'Admin'
})

const getRoleVariant = (role: UserRole) => {
    const variants = {
        Superadmin: 'primary',
        Admin: 'warning',
        Cashier: 'info',
        Kitchen: 'success',
        Deliveryman: 'secondary'
    } as const
    return variants[role] || 'default'
}

const getRoleLabel = (role: UserRole) => {
    const labels = {
        Superadmin: 'Super Admin',
        Admin: 'Administrador',
        Cashier: 'Cajero',
        Kitchen: 'Cocina',
        Deliveryman: 'Domiciliario'
    }
    return labels[role] || role
}

const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Nunca'

    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
        return 'Hoy'
    } else if (diffInHours < 48) {
        return 'Ayer'
    } else {
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }
}

const openCreateDialog = () => {
    editingUser.value = null
    showDialog.value = true
}

const openEditDialog = (user: BranchUserSummary) => {
    editingUser.value = user
    showDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    editingUser.value = null
}

const handleSubmit = async (userData: any) => {
    try {
        if (editingUser.value) {
            console.log(editingUser.value, userData)

            const updatedUser = await usersStore.updateUser(editingUser.value.id, userData)
            emit('userUpdated', updatedUser)
        } else {
            const newUser = await usersStore.createUser({
                ...userData,
                branchId: props.branchId
            })
            emit('userCreated', newUser)
        }
        closeDialog()
    } catch (error) {
        // Error is handled in the store
        console.error('Error submitting user form:', error)
    }
}

const toggleStatus = async (user: BranchUserSummary) => {
    try {
        const updatedUser = await usersStore.toggleUserStatus(user.id)
        emit('userStatusToggled', updatedUser.data)
    } catch (error) {
        // Error is handled in the store
        console.error('Error toggling user status:', error)
    }
}
</script>
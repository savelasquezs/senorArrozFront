// src/store/users.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/services/MainAPI/userApi'
import { useAuthStore } from './auth'
import type { User, UserRole, CreateUserRequest, UpdateUserRequest } from '@/types/user'
import type { BranchUserSummary } from '@/types/common'


export const useUsersStore = defineStore('users', () => {
    const authStore = useAuthStore()

    // State
    const users = ref<User[]>([])
    const currentUser = ref<User | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const getUsersByBranch = computed(() => {
        return (branchId: number) => users.value.filter(user => user.branchId === branchId)
    })

    const canCreateRole = computed(() => {
        return (role: UserRole, branchId: number) => {
            const currentRole = authStore.user?.role

            if (currentRole === 'Superadmin') {
                // Superadmin can create any role except another superadmin
                if (role === 'Superadmin') return false

                // Check for unique constraints
                if (role === 'Admin') {
                    const existingAdmin = users.value.find(u => u.role === 'Admin' && u.branchId === branchId)
                    return !existingAdmin
                }

                return true
            }

            if (currentRole === 'Admin') {
                // Admin can only create cashier, kitchen, deliveryman in their branch
                const allowedRoles: UserRole[] = ['Cashier', 'Kitchen', 'Deliveryman']
                if (!allowedRoles.includes(role)) return false
                if (authStore.user?.branchId !== branchId) return false

                return true
            }

            return false
        }
    })

    const canEditUser = computed(() => {
        return (user: BranchUserSummary) => {
            const currentRole = authStore.user?.role

            if (currentRole === 'Superadmin') {
                // Superadmin can edit anyone except other superadmins
                return user.role !== 'Superadmin'
            }

            if (currentRole === 'Admin') {
                // Admin can only edit users in their branch (except admins and superadmins)
                const editableRoles: UserRole[] = ['Cashier', 'Kitchen', 'Deliveryman']
                return editableRoles.includes(user.role) &&
                    user.branchId === authStore.user?.branchId
            }

            return false
        }
    })

    const availableRoles = computed(() => {
        const currentRole = authStore.user?.role

        if (currentRole === 'Superadmin') {
            return [
                { value: 'Admin', label: 'Administrador' },
                { value: 'Cashier', label: 'Cajero' },
                { value: 'Kitchen', label: 'Cocina' },
                { value: 'Deliveryman', label: 'Domiciliario' }
            ]
        }

        if (currentRole === 'Admin') {
            return [
                { value: 'Cashier', label: 'Cajero' },
                { value: 'Kitchen', label: 'Cocina' },
                { value: 'Deliveryman', label: 'Domiciliario' }
            ]
        }

        return []
    })

    // Actions
    const fetchUsersByBranch = async (branchId: number) => {
        try {
            isLoading.value = true
            error.value = null
            const response = await userApi.getUsersByBranch(branchId)

            // Update users array with users from this branch
            const otherBranchUsers = users.value.filter(u => u.branchId !== branchId)
            users.value = [...otherBranchUsers, ...response.data]
        } catch (err: any) {
            error.value = err.message || 'Error al cargar usuarios'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const fetchUserById = async (id: number) => {
        try {
            isLoading.value = true
            error.value = null
            const user = await userApi.getUserById(id)
            currentUser.value = user.data

            // Also update in users array if exists
            const index = users.value.findIndex(u => u.id === id)
            if (index !== -1) {
                users.value[index] = user.data
            } else {
                users.value.push(user.data)
            }

            return user
        } catch (err: any) {
            error.value = err.message || 'Error al cargar usuario'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createUser = async (userData: CreateUserRequest) => {
        try {
            isLoading.value = true
            error.value = null

            // Validate permissions
            if (!canCreateRole.value(userData.role, userData.branchId)) {
                throw new Error('No tienes permisos para crear este tipo de usuario')
            }

            const newUser = await userApi.createUser(userData)
            users.value.push(newUser.data)

            return newUser
        } catch (err: any) {
            error.value = err.message || 'Error al crear usuario'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateUser = async (id: number, userData: UpdateUserRequest) => {
        try {
            isLoading.value = true
            error.value = null

            const existingUser = users.value.find(u => u.id === id)
            if (!existingUser) {
                throw new Error('Usuario no encontrado')
            }

            if (!canEditUser.value(existingUser)) {
                throw new Error('No tienes permisos para editar este usuario')
            }

            const updatedUser = await userApi.updateUser(id, userData)

            // Update in users array
            const index = users.value.findIndex(u => u.id === id)
            if (index !== -1) {
                users.value[index] = updatedUser.data
            }

            // Update currentUser if it's the same
            if (currentUser.value?.id === id) {
                currentUser.value = updatedUser.data
            }

            return updatedUser
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar usuario'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const toggleUserStatus = async (id: number) => {
        try {
            isLoading.value = true
            error.value = null

            const existingUser = users.value.find(u => u.id === id)
            if (!existingUser) {
                throw new Error('Usuario no encontrado')
            }

            if (!canEditUser.value(existingUser)) {
                throw new Error('No tienes permisos para cambiar el estado de este usuario')
            }

            const updatedUser = await userApi.toggleUserStatus(id)

            // Update in users array
            const index = users.value.findIndex(u => u.id === id)
            if (index !== -1) {
                users.value[index] = updatedUser.data
            }

            // Update currentUser if it's the same
            if (currentUser.value?.id === id) {
                currentUser.value = updatedUser.data
            }

            return updatedUser
        } catch (err: any) {
            error.value = err.message || 'Error al cambiar estado del usuario'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const clearError = () => {
        error.value = null
    }

    const clearCurrentUser = () => {
        currentUser.value = null
    }

    const clearUsers = () => {
        users.value = []
        currentUser.value = null
    }

    return {
        // State
        users,
        currentUser,
        isLoading,
        error,

        // Getters
        getUsersByBranch,
        canCreateRole,
        canEditUser,
        availableRoles,

        // Actions
        fetchUsersByBranch,
        fetchUserById,
        createUser,
        updateUser,
        toggleUserStatus,
        clearError,
        clearCurrentUser,
        clearUsers
    }
})
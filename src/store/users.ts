// src/store/users.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/services/MainAPI/userApi'
import { useAuthStore } from './auth'
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/user'




export const useUsersStore = defineStore('users', () => {
    const authStore = useAuthStore()


    // State
    const users = ref<User[]>([])
    const currentUser = authStore.user
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Getters


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




    const createUser = async (userData: CreateUserRequest) => {
        try {
            isLoading.value = true
            error.value = null

            // Validate permissions


            const newUser = await userApi.createUser(userData)
            users.value.push(newUser)

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
            const updatedUser = await userApi.updateUser(id, userData)
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



            const updatedUser = await userApi.toggleUserStatus(id)



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



    const clearUsers = () => {
        users.value = []

    }

    return {
        // State
        users,
        currentUser,
        isLoading,
        error,

        // Getters

        availableRoles,

        // Actions


        createUser,
        updateUser,
        toggleUserStatus,
        clearError,

        clearUsers
    }
})
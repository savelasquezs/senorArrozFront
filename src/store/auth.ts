import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginCredentials, LoginResponse } from '@/types/auth'
import { mainApi } from '@/services/mainApi'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const branchId = computed(() => user.value?.branchId || null)
  const branchName = computed(() => user.value?.branchName || '')
  const userName = computed(() => user.value?.name || '')

  // Role checks
  const isSuperadmin = computed(() => userRole.value === 'superadmin')
  const isAdmin = computed(() => userRole.value === 'admin')
  const isCashier = computed(() => userRole.value === 'cashier')
  const isKitchen = computed(() => userRole.value === 'kitchen')
  const isDeliveryman = computed(() => userRole.value === 'deliveryman')

  // Permission checks
  const canManageUsers = computed(() => isSuperadmin.value || isAdmin.value)
  const canManageProducts = computed(() => isSuperadmin.value || isAdmin.value)
  const canCancelOrders = computed(() => isSuperadmin.value || isAdmin.value)
  const canManageExpenses = computed(() => isSuperadmin.value || isAdmin.value)
  const canViewAllBranches = computed(() => isSuperadmin.value)

  // Actions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await mainApi.login(credentials)
      
      setAuthData(response)
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      if (refreshToken.value) {
        await mainApi.logout(refreshToken.value)
      }
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      clearAuthData()
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      if (!refreshToken.value) {
        throw new Error('No refresh token available')
      }

      const response = await mainApi.refreshToken(refreshToken.value)
      setAuthData(response)
      return true
    } catch (err) {
      console.error('Token refresh failed:', err)
      clearAuthData()
      return false
    }
  }

  const setAuthData = (data: LoginResponse): void => {
    user.value = data.user
    token.value = data.token
    refreshToken.value = data.refreshToken
    
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user_data', JSON.stringify(data.user))
  }

  const clearAuthData = (): void => {
    user.value = null
    token.value = null
    refreshToken.value = null
    error.value = null
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
  }
  
  const changePassword = async (passwordData: { currentPassword: string, newPassword: string, confirmPassword: string }): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null
      
      await mainApi.changePassword(passwordData)
    } catch (err: any) {
      error.value = err.message || 'Error al cambiar la contraseña'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
 

  const initializeAuth = (): void => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_data')
    
    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      } catch (err) {
        console.error('Error parsing stored user data:', err)
        clearAuthData()
      }
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    user,
    token,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    userRole,
    branchId,
    branchName,
    userName,
    isSuperadmin,
    isAdmin,
    isCashier,
    isKitchen,
    isDeliveryman,
    canManageUsers,
    canManageProducts,
    canCancelOrders,
    canManageExpenses,
    canViewAllBranches,
    // Actions
    changePassword,
    login,
    logout,
    refreshAccessToken,
    initializeAuth,
    clearError
  }
})
// src/services/mainApi.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { LoginCredentials, LoginResponse, ChangePasswordCredentials } from '@/types/auth'
import type { ApiResponse, PagedResult, Branch, BranchFilters } from '@/types/common'
import type { UserRoleType } from '@/types/auth'

class MainApiService {
    private api: AxiosInstance

    constructor() {
        this.api = axios.create({
            baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7049/api',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        this.setupInterceptors()
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.api.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('auth_token')
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        // Response interceptor
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true

                    try {
                        const refreshToken = localStorage.getItem('refresh_token')
                        if (refreshToken) {
                            const response = await this.refreshToken(refreshToken)
                            localStorage.setItem('auth_token', response.token)

                            // Retry the original request
                            originalRequest.headers.Authorization = `Bearer ${response.token}`
                            return this.api(originalRequest)
                        }
                    } catch (refreshError) {
                        // Refresh failed, redirect to login
                        localStorage.clear()
                        window.location.href = '/login'
                        return Promise.reject(refreshError)
                    }
                }

                return Promise.reject(error)
            }
        )
    }

    // Auth endpoints
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await this.api.post('/auth/login', credentials)
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async logout(refreshToken: string): Promise<void> {
        try {
            await this.api.post('/auth/logout', { refreshToken })
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async refreshToken(refreshToken: string): Promise<LoginResponse> {
        try {
            const response = await this.api.post('/auth/refresh', { refreshToken })
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async changePassword(passwordData: ChangePasswordCredentials): Promise<void> {
        try {
            await this.api.post('/auth/change-password', passwordData)
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            const response = await this.api.post('/auth/forgot-password', { email })
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async resetPassword(resetData: { token: string, email: string, newPassword: string, confirmPassword: string }): Promise<void> {
        try {
            await this.api.post('/auth/reset-password', resetData)
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    // Generic request methods
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.api.get(url, config)
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.api.post(url, data, config)
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.api.put(url, data, config)
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.api.delete(url, config)
            return response.data
        } catch (error: any) {
            throw this.handleError(error)
        }
    }

    // Branches endpoints
    async getAllBranches(params?: Partial<BranchFilters>): Promise<ApiResponse<PagedResult<Branch>>> {
        return this.get<ApiResponse<PagedResult<Branch>>>('/Branches/all', { params })
    }

    async getBranches(filters?: BranchFilters): Promise<ApiResponse<PagedResult<Branch>>> {
        return this.get<ApiResponse<PagedResult<Branch>>>('/Branches', { params: filters })
    }

    async getBranchById(id: number): Promise<ApiResponse<Branch>> {
        return this.get<ApiResponse<Branch>>(`/Branches/${id}`)
    }

    async createBranch(payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>): Promise<ApiResponse<Branch>> {
        return this.post<ApiResponse<Branch>>('/Branches', payload)
    }

    async updateBranch(id: number, payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>): Promise<ApiResponse<Branch>> {
        return this.put<ApiResponse<Branch>>(`/Branches/${id}`, payload)
    }

    async deleteBranch(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/Branches/${id}`)
    }

    // Users minimal endpoints (scoped to branches)
    async createUser(payload: { name: string; email: string; password: string; role: UserRoleType; branchId?: number }): Promise<ApiResponse<any>> {
        return this.post<ApiResponse<any>>('/Users', payload)
    }

    async updateUser(id: number, payload: { name?: string; email?: string; role?: UserRoleType; active?: boolean }): Promise<ApiResponse<any>> {
        return this.put<ApiResponse<any>>(`/Users/${id}`, payload)
    }

    private handleError(error: any): Error {
        if (error.response) {
            const data = error.response.data

            // Caso 1: Validaciones (400 con "errors")
            if (data?.errors) {
                // Aplanamos los mensajes en un string legible
                const validationMessages = Object.values(data.errors)
                    .flat()
                    .join(' | ')
                return new Error(validationMessages)
            }

            // Caso 2: Mensajes custom de backend
            if (data?.message || data?.error) {
                return new Error(data.message || data.error)
            }

            // Caso 3: Genérico
            return new Error(`Error ${error.response.status}: ${error.response.statusText}`)
        } else if (error.request) {
            return new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
        } else {
            return new Error(error.message || 'Error inesperado')
        }
    }
}

export const mainApi = new MainApiService()
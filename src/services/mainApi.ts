// src/services/mainApi.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { LoginCredentials, LoginResponse, ChangePasswordCredentials } from '@/types/auth'

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

    async changePassword( passwordData:ChangePasswordCredentials ): Promise<void> {
        try {
            await this.api.post('/auth/change-password', passwordData)
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

    private handleError(error: any): Error {
        if (error.response) {
            // Server responded with error status
            const message = error.response.data?.message ||
                error.response.data?.error ||
                `Error ${error.response.status}: ${error.response.statusText}`
            return new Error(message)
        } else if (error.request) {
            // Request was made but no response received
            return new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
        } else {
            // Something else happened
            return new Error(error.message || 'Error inesperado')
        }
    }
}

export const mainApi = new MainApiService()
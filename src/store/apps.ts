// src/store/apps.ts
import { defineStore } from 'pinia'
import { appApi } from '@/services/MainAPI/appApi'
import type {
    App,
    AppFilters,
    CreateAppDto,
    UpdateAppDto
} from '@/types/bank'
import type { PagedResult } from '@/types/common'

interface AppsState {
    list: PagedResult<App> | null
    current: App | null
    byBank: App[] | null
    isLoading: boolean
    error: string | null
}

export const useAppsStore = defineStore('apps', {
    state: (): AppsState => ({
        list: null,
        current: null,
        byBank: null,
        isLoading: false,
        error: null
    }),

    actions: {
        async fetch(filters?: AppFilters) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.getApps(filters)
                if (response.isSuccess && response.data) {
                    this.list = response.data
                } else {
                    this.error = response.message || 'Error al obtener apps'
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async fetchById(id: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.getAppById(id)
                if (response.isSuccess && response.data) {
                    this.current = response.data
                } else {
                    this.error = response.message || 'App no encontrada'
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async fetchByBank(bankId: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.getAppsByBank(bankId)
                if (response.isSuccess && response.data) {
                    this.byBank = response.data
                } else {
                    this.error = response.message || 'Error al obtener apps del banco'
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async create(payload: CreateAppDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.createApp(payload)
                if (response.isSuccess && response.data) {
                    // Add to list if it exists
                    if (this.list) {
                        this.list.items.unshift(response.data)
                        this.list.totalCount++
                    }
                    // Add to byBank if it exists and matches
                    if (this.byBank && response.data.bankId === payload.bankId) {
                        this.byBank.unshift(response.data)
                    }
                    this.current = response.data
                    return response.data
                } else {
                    this.error = response.message || 'Error al crear app'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async update(id: number, payload: UpdateAppDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.updateApp(id, payload)
                if (response.isSuccess && response.data) {
                    // Update item in list
                    if (this.list) {
                        const index = this.list.items.findIndex(item => item.id === id)
                        if (index !== -1) {
                            this.list.items[index] = response.data
                        }
                    }
                    // Update item in byBank
                    if (this.byBank) {
                        const index = this.byBank.findIndex(item => item.id === id)
                        if (index !== -1) {
                            this.byBank[index] = response.data
                        }
                    }
                    // Update current if it's the same app
                    if (this.current?.id === id) {
                        this.current = response.data
                    }
                    return response.data
                } else {
                    this.error = response.message || 'Error al actualizar app'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async remove(id: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appApi.deleteApp(id)
                if (response.isSuccess) {
                    // Remove from list
                    if (this.list) {
                        this.list.items = this.list.items.filter(item => item.id !== id)
                        this.list.totalCount--
                    }
                    // Remove from byBank
                    if (this.byBank) {
                        this.byBank = this.byBank.filter(item => item.id !== id)
                    }
                    // Clear current if it was the deleted app
                    if (this.current?.id === id) {
                        this.current = null
                    }
                } else {
                    this.error = response.message || 'Error al eliminar app'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        clear() {
            this.current = null
            this.error = null
        },

        clearList() {
            this.list = null
            this.byBank = null
            this.error = null
        }
    }
})

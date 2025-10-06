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
                // Backend returns data directly, not wrapped in ApiResponse
                if (response && response.items) {
                    this.list = response as PagedResult<App>
                } else {
                    this.error = 'Error al obtener apps'
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
                this.current = response
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
                this.byBank = response
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
                // Add to list if it exists
                if (this.list) {
                    this.list.items.unshift(response)
                    this.list.totalCount++
                }
                // Add to byBank if it exists and matches
                if (this.byBank && response.bankId === payload.bankId) {
                    this.byBank.unshift(response)
                }
                this.current = response
                return response
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
                // Update item in list
                if (this.list) {
                    const index = this.list.items.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.list.items[index] = response
                    }
                }
                // Update item in byBank
                if (this.byBank) {
                    const index = this.byBank.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.byBank[index] = response
                    }
                }
                // Update current if it's the same app
                if (this.current?.id === id) {
                    this.current = response
                }
                return response
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
                await appApi.deleteApp(id)
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

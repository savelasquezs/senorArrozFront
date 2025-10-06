// src/store/banks.ts
import { defineStore } from 'pinia'
import { bankApi } from '@/services/MainAPI/bankApi'
import type {
    Bank,
    BankDetail,
    BankFilters,
    CreateBankDto,
    UpdateBankDto
} from '@/types/bank'
import type { PagedResult } from '@/types/common'

interface BanksState {
    list: PagedResult<Bank> | null
    current: Bank | null
    currentDetail: BankDetail | null
    isLoading: boolean
    error: string | null
}

export const useBanksStore = defineStore('banks', {
    state: (): BanksState => ({
        list: null,
        current: null,
        currentDetail: null,
        isLoading: false,
        error: null
    }),

    actions: {
        async fetch(filters?: BankFilters) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankApi.getBanks(filters)
                // Backend returns data directly, not wrapped in ApiResponse
                if (response && response.items) {
                    this.list = response as PagedResult<Bank>
                } else {
                    this.error = 'Error al obtener bancos'
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
                const response = await bankApi.getBankById(id)
                this.current = response
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async fetchDetail(id: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankApi.getBankDetail(id)
                this.currentDetail = response
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async create(payload: CreateBankDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankApi.createBank(payload)
                // Add to list if it exists
                if (this.list) {
                    this.list.items.unshift(response)
                    this.list.totalCount++
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

        async update(id: number, payload: UpdateBankDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankApi.updateBank(id, payload)
                // Update item in list
                if (this.list) {
                    const index = this.list.items.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.list.items[index] = response
                    }
                }
                // Update current if it's the same bank
                if (this.current?.id === id) {
                    this.current = response
                }
                if (this.currentDetail?.id === id) {
                    this.currentDetail = { ...this.currentDetail, ...response }
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
                await bankApi.deleteBank(id)
                // Remove from list
                if (this.list) {
                    this.list.items = this.list.items.filter(item => item.id !== id)
                    this.list.totalCount--
                }
                // Clear current if it was the deleted bank
                if (this.current?.id === id) {
                    this.current = null
                }
                if (this.currentDetail?.id === id) {
                    this.currentDetail = null
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
            this.currentDetail = null
            this.error = null
        },

        clearList() {
            this.list = null
            this.error = null
        }
    }
})

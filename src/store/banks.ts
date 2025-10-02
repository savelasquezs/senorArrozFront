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
                if (response.isSuccess && response.data) {
                    this.list = response.data
                } else {
                    this.error = response.message || 'Error al obtener bancos'
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
                if (response.isSuccess && response.data) {
                    this.current = response.data
                } else {
                    this.error = response.message || 'Banco no encontrado'
                }
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
                if (response.isSuccess && response.data) {
                    this.currentDetail = response.data
                } else {
                    this.error = response.message || 'Detalle de banco no encontrado'
                }
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
                if (response.isSuccess && response.data) {
                    // Add to list if it exists
                    if (this.list) {
                        this.list.items.unshift(response.data)
                        this.list.totalCount++
                    }
                    this.current = response.data
                    return response.data
                } else {
                    this.error = response.message || 'Error al crear banco'
                    throw new Error(this.error)
                }
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
                if (response.isSuccess && response.data) {
                    // Update item in list
                    if (this.list) {
                        const index = this.list.items.findIndex(item => item.id === id)
                        if (index !== -1) {
                            this.list.items[index] = response.data
                        }
                    }
                    // Update current if it's the same bank
                    if (this.current?.id === id) {
                        this.current = response.data
                    }
                    if (this.currentDetail?.id === id) {
                        this.currentDetail = { ...this.currentDetail, ...response.data }
                    }
                    return response.data
                } else {
                    this.error = response.message || 'Error al actualizar banco'
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
                const response = await bankApi.deleteBank(id)
                if (response.isSuccess) {
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
                } else {
                    this.error = response.message || 'Error al eliminar banco'
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
            this.currentDetail = null
            this.error = null
        },

        clearList() {
            this.list = null
            this.error = null
        }
    }
})

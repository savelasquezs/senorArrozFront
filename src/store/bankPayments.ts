// src/store/bankPayments.ts
import { defineStore } from 'pinia'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import type {
    BankPayment,
    BankPaymentFilters,
    CreateBankPaymentDto,
    VerifyBankPaymentDto
} from '@/types/bank'
import type { PagedResult } from '@/types/common'

interface BankPaymentsState {
    list: PagedResult<BankPayment> | null
    current: BankPayment | null
    unverified: BankPayment[] | null
    isLoading: boolean
    error: string | null
}

export const useBankPaymentsStore = defineStore('bankPayments', {
    state: (): BankPaymentsState => ({
        list: null,
        current: null,
        unverified: null,
        isLoading: false,
        error: null
    }),

    actions: {
        async fetch(filters?: BankPaymentFilters) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankPaymentApi.getBankPayments(filters)
                // Backend returns data directly, not wrapped in ApiResponse
                if (response && response.items) {
                    this.list = response as PagedResult<BankPayment>
                } else {
                    this.error = 'Error al obtener pagos bancarios'
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
                const response = await bankPaymentApi.getBankPaymentById(id)
                this.current = response
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async fetchUnverified() {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankPaymentApi.getUnverifiedBankPayments()
                this.unverified = response
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async create(payload: CreateBankPaymentDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await bankPaymentApi.createBankPayment(payload)
                // Add to list if it exists
                if (this.list) {
                    this.list.items.unshift(response)
                    this.list.totalCount++
                }
                // Add to unverified if it exists
                if (this.unverified) {
                    this.unverified.unshift(response)
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

        async verify(id: number, payload?: VerifyBankPaymentDto) {
            this.isLoading = true
            this.error = null
            try {
                await bankPaymentApi.verifyBankPayment(id, payload)
                // Update item in list
                if (this.list) {
                    const index = this.list.items.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.list.items[index].isVerified = true
                        this.list.items[index].verifiedAt = new Date().toISOString()
                    }
                }
                // Remove from unverified
                if (this.unverified) {
                    this.unverified = this.unverified.filter(item => item.id !== id)
                }
                // Update current if it's the same payment
                if (this.current?.id === id) {
                    this.current.isVerified = true
                    this.current.verifiedAt = new Date().toISOString()
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async unverify(id: number) {
            this.isLoading = true
            this.error = null
            try {
                await bankPaymentApi.unverifyBankPayment(id)
                // Update item in list
                if (this.list) {
                    const index = this.list.items.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.list.items[index].isVerified = false
                        this.list.items[index].verifiedAt = undefined
                    }
                }
                // Add to unverified if it exists
                if (this.unverified && this.current?.id === id) {
                    this.unverified.unshift(this.current)
                }
                // Update current if it's the same payment
                if (this.current?.id === id) {
                    this.current.isVerified = false
                    this.current.verifiedAt = undefined
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
                await bankPaymentApi.deleteBankPayment(id)
                // Remove from list
                if (this.list) {
                    this.list.items = this.list.items.filter(item => item.id !== id)
                    this.list.totalCount--
                }
                // Remove from unverified
                if (this.unverified) {
                    this.unverified = this.unverified.filter(item => item.id !== id)
                }
                // Clear current if it was the deleted payment
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
            this.unverified = null
            this.error = null
        }
    }
})

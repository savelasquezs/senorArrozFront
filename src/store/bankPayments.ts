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
                if (response.isSuccess && response.data) {
                    this.list = response.data
                } else {
                    this.error = response.message || 'Error al obtener pagos bancarios'
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
                if (response.isSuccess && response.data) {
                    this.current = response.data
                } else {
                    this.error = response.message || 'Pago bancario no encontrado'
                }
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
                if (response.isSuccess && response.data) {
                    this.unverified = response.data
                } else {
                    this.error = response.message || 'Error al obtener pagos no verificados'
                }
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
                if (response.isSuccess && response.data) {
                    // Add to list if it exists
                    if (this.list) {
                        this.list.items.unshift(response.data)
                        this.list.totalCount++
                    }
                    // Add to unverified if it exists
                    if (this.unverified) {
                        this.unverified.unshift(response.data)
                    }
                    this.current = response.data
                    return response.data
                } else {
                    this.error = response.message || 'Error al crear pago bancario'
                    throw new Error(this.error)
                }
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
                const response = await bankPaymentApi.verifyBankPayment(id, payload)
                if (response.isSuccess) {
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
                } else {
                    this.error = response.message || 'Error al verificar pago bancario'
                    throw new Error(this.error)
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
                const response = await bankPaymentApi.unverifyBankPayment(id)
                if (response.isSuccess) {
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
                } else {
                    this.error = response.message || 'Error al desverificar pago bancario'
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
                const response = await bankPaymentApi.deleteBankPayment(id)
                if (response.isSuccess) {
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
                } else {
                    this.error = response.message || 'Error al eliminar pago bancario'
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
            this.unverified = null
            this.error = null
        }
    }
})

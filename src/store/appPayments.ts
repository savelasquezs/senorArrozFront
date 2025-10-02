// src/store/appPayments.ts
import { defineStore } from 'pinia'
import { appPaymentApi } from '@/services/MainAPI/appPaymentApi'
import type {
    AppPayment,
    AppPaymentFilters,
    CreateAppPaymentDto,
    SettleMultipleAppPaymentsDto
} from '@/types/bank'
import type { PagedResult } from '@/types/common'

interface AppPaymentsState {
    list: PagedResult<AppPayment> | null
    current: AppPayment | null
    unsettled: AppPayment[] | null
    isLoading: boolean
    error: string | null
}

export const useAppPaymentsStore = defineStore('appPayments', {
    state: (): AppPaymentsState => ({
        list: null,
        current: null,
        unsettled: null,
        isLoading: false,
        error: null
    }),

    actions: {
        async fetch(filters?: AppPaymentFilters) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.getAppPayments(filters)
                if (response.isSuccess && response.data) {
                    this.list = response.data
                } else {
                    this.error = response.message || 'Error al obtener pagos de apps'
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
                const response = await appPaymentApi.getAppPaymentById(id)
                if (response.isSuccess && response.data) {
                    this.current = response.data
                } else {
                    this.error = response.message || 'Pago de app no encontrado'
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async fetchUnsettled(filters?: {
            appId?: number
            fromDate?: string
            toDate?: string
            page?: number
            pageSize?: number
        }) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.getUnsettledAppPayments(filters)
                if (response.isSuccess && response.data) {
                    this.unsettled = response.data
                } else {
                    this.error = response.message || 'Error al obtener pagos no liquidados'
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async create(payload: CreateAppPaymentDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.createAppPayment(payload)
                if (response.isSuccess && response.data) {
                    // Add to list if it exists
                    if (this.list) {
                        this.list.items.unshift(response.data)
                        this.list.totalCount++
                    }
                    // Add to unsettled if it exists
                    if (this.unsettled) {
                        this.unsettled.unshift(response.data)
                    }
                    this.current = response.data
                    return response.data
                } else {
                    this.error = response.message || 'Error al crear pago de app'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async settle(id: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.settleAppPayment(id)
                if (response.isSuccess) {
                    // Update item in list
                    if (this.list) {
                        const index = this.list.items.findIndex(item => item.id === id)
                        if (index !== -1) {
                            this.list.items[index].isSetted = true
                        }
                    }
                    // Remove from unsettled
                    if (this.unsettled) {
                        this.unsettled = this.unsettled.filter(item => item.id !== id)
                    }
                    // Update current if it's the same payment
                    if (this.current?.id === id) {
                        this.current.isSetted = true
                    }
                } else {
                    this.error = response.message || 'Error al liquidar pago de app'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async settleMultiple(payload: SettleMultipleAppPaymentsDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.settleMultipleAppPayments(payload)
                if (response.isSuccess) {
                    // Update items in list
                    if (this.list) {
                        payload.paymentIds.forEach(id => {
                            const index = this.list!.items.findIndex(item => item.id === id)
                            if (index !== -1) {
                                this.list!.items[index].isSetted = true
                            }
                        })
                    }
                    // Remove from unsettled
                    if (this.unsettled) {
                        this.unsettled = this.unsettled.filter(item => !payload.paymentIds.includes(item.id))
                    }
                    // Update current if it's one of the settled payments
                    if (this.current && payload.paymentIds.includes(this.current.id)) {
                        this.current.isSetted = true
                    }
                } else {
                    this.error = response.message || 'Error al liquidar pagos de apps'
                    throw new Error(this.error)
                }
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async unsettle(id: number) {
            this.isLoading = true
            this.error = null
            try {
                const response = await appPaymentApi.unsettleAppPayment(id)
                if (response.isSuccess) {
                    // Update item in list
                    if (this.list) {
                        const index = this.list.items.findIndex(item => item.id === id)
                        if (index !== -1) {
                            this.list.items[index].isSetted = false
                        }
                    }
                    // Add to unsettled if it exists
                    if (this.unsettled && this.current?.id === id) {
                        this.unsettled.unshift(this.current)
                    }
                    // Update current if it's the same payment
                    if (this.current?.id === id) {
                        this.current.isSetted = false
                    }
                } else {
                    this.error = response.message || 'Error al desliquidar pago de app'
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
                const response = await appPaymentApi.deleteAppPayment(id)
                if (response.isSuccess) {
                    // Remove from list
                    if (this.list) {
                        this.list.items = this.list.items.filter(item => item.id !== id)
                        this.list.totalCount--
                    }
                    // Remove from unsettled
                    if (this.unsettled) {
                        this.unsettled = this.unsettled.filter(item => item.id !== id)
                    }
                    // Clear current if it was the deleted payment
                    if (this.current?.id === id) {
                        this.current = null
                    }
                } else {
                    this.error = response.message || 'Error al eliminar pago de app'
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
            this.unsettled = null
            this.error = null
        }
    }
})

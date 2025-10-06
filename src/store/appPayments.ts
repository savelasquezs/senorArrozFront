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
                // Backend returns data directly, not wrapped in ApiResponse
                if (response && response.items) {
                    this.list = response as PagedResult<AppPayment>
                } else {
                    this.error = 'Error al obtener pagos de apps'
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
                this.current = response
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
                this.unsettled = response
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
                // Add to list if it exists
                if (this.list) {
                    this.list.items.unshift(response)
                    this.list.totalCount++
                }
                // Add to unsettled if it exists
                if (this.unsettled) {
                    this.unsettled.unshift(response)
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

        async settle(id: number) {
            this.isLoading = true
            this.error = null
            try {
                await appPaymentApi.settleAppPayment(id)
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
                await appPaymentApi.settleMultipleAppPayments(payload)
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
                await appPaymentApi.unsettleAppPayment(id)
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
                await appPaymentApi.deleteAppPayment(id)
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

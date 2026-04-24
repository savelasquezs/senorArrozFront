import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import { getOrderStatusDisplayName } from '@/composables/useFormatting'
import type {
    OrderDetailView,
    OrderFilters,
    UpdateOrderDto,
    OrderStatus,
    OrderListItem,
} from '@/types/order'
import type { User } from '@/types/user'
import type { PagedResult } from '@/types/common'
import {
    createResourceState,
    removePagedItem,
    replacePagedItem,
    type ResourceActionOptions,
} from './helpers/resourceStore'

type FetchOpts = ResourceActionOptions

export const useOrdersDataStore = defineStore('ordersData', () => {
    const list = ref<PagedResult<OrderListItem> | null>(null)
    const current = ref<OrderDetailView | null>(null)
    const users = ref<User[]>([])
    const { isLoading, error, run, clearError } = createResourceState()

    const fetch = async (filters?: OrderFilters, opts?: FetchOpts) => {
        await run(async () => {
            const response = await orderApi.getOrders(filters)
            list.value = response as unknown as PagedResult<OrderListItem>
        }, { ...opts, errorMessage: 'Error al cargar pedidos' })
    }

    const fetchById = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            current.value = await orderApi.fetchDetail(id)
        }, { ...opts, errorMessage: 'Error al cargar el pedido' })
    }

    const update = async (id: number, payload: UpdateOrderDto, opts?: FetchOpts) => {
        return run(
            async () => {
                const response = await orderApi.updateOrder(id, payload)

                if (list.value) {
                    const index = list.value.items.findIndex((item) => item.id === id)
                    if (index !== -1) {
                        const merged = {
                            ...list.value.items[index],
                            ...response,
                            statusDisplayName:
                                (response as { statusDisplayName?: string }).statusDisplayName ||
                                getOrderStatusDisplayName(response.status),
                        } as unknown as OrderListItem
                        replacePagedItem(list, merged)
                    }
                }

                if (current.value?.id === id) {
                    try {
                        current.value = await orderApi.fetchDetail(id)
                    } catch (fetchError) {
                        console.error('Error fetching updated order details:', fetchError)
                        current.value = response as unknown as OrderDetailView
                    }
                }

                return response
            },
            {
                ...opts,
                silent: opts?.silent !== false,
                errorMessage: 'Error al actualizar el pedido',
            }
        )
    }

    const remove = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await orderApi.cancelOrder(id)
            removePagedItem(list, id)
            if (current.value?.id === id) {
                current.value = null
            }
        }, { ...opts, errorMessage: 'Error al cancelar el pedido' })
    }

    const updateStatus = async (id: number, status: OrderStatus, opts?: FetchOpts) => {
        return run(async () => {
            const response = await orderApi.updateStatus(id, status)

            if (list.value) {
                const index = list.value.items.findIndex((item) => item.id === id)
                if (index !== -1) {
                    const merged = {
                        ...list.value.items[index],
                        status,
                        statusDisplayName: getOrderStatusDisplayName(status),
                        ...(response.subtotal !== undefined && { subtotal: response.subtotal }),
                        ...(response.discountTotal !== undefined && { discountTotal: response.discountTotal }),
                        ...(response.total !== undefined && { total: response.total }),
                        updatedAt: response.updatedAt,
                    } as unknown as OrderListItem
                    replacePagedItem(list, merged)
                }
            }

            if (current.value?.id === id) {
                current.value = {
                    ...current.value,
                    status,
                    ...(response.subtotal !== undefined && { subtotal: response.subtotal }),
                    ...(response.discountTotal !== undefined && { discountTotal: response.discountTotal }),
                    ...(response.total !== undefined && { total: response.total }),
                    updatedAt: response.updatedAt,
                }
            }

            return response
        }, { ...opts, errorMessage: 'Error al actualizar estado' })
    }

    const updateCurrent = (updates: Partial<OrderDetailView>) => {
        if (current.value) {
            current.value = { ...current.value, ...updates }
        }
    }

    const clear = () => {
        current.value = null
        clearError()
    }

    const loadUsers = async () => {
        try {
            // const response = await userApi.getUsers({ page: 1, pageSize: 1000 })
            // users.value = response.data.items
        } catch (err) {
            console.error('Error loading users:', err)
        }
    }

    const fetchDeliveryReady = async (filters?: { branchId?: number; page?: number; pageSize?: number }, opts?: FetchOpts) => {
        await run(async () => {
            list.value = await orderApi.fetchDeliveryReady(filters)
        }, { ...opts, errorMessage: 'Error al cargar pedidos listos' })
    }

    const selfAssignOrders = async (orderIds: number[], password: string, opts?: FetchOpts) => {
        return run(async () => {
            const assigned = await orderApi.selfAssignOrders({ orderIds, password })
            for (const id of orderIds) {
                removePagedItem(list, id)
            }
            return assigned
        }, { ...opts, errorMessage: 'Error al asignar pedidos' })
    }

    const fetchAssignedOrders = async (
        deliveryManId: number,
        filters?: { page?: number; pageSize?: number; fromDate?: string; toDate?: string },
        opts?: FetchOpts
    ) => {
        await run(async () => {
            list.value = await orderApi.fetchAssignedOrders(deliveryManId, filters)
        }, { ...opts, errorMessage: 'Error al cargar pedidos asignados' })
    }

    const fetchDeliveryHistory = async (
        filters: {
            deliveryManId: number
            fromDate?: string
            toDate?: string
            neighborhoodId?: number | null
            page?: number
            pageSize?: number
        },
        opts?: FetchOpts
    ) => {
        await run(async () => {
            list.value = await orderApi.searchOrders({
                deliveryManId: filters.deliveryManId,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                status: 'delivered',
                type: 'delivery',
                page: filters.page || 1,
                pageSize: filters.pageSize || 10,
            })
        }, { ...opts, errorMessage: 'Error al cargar historial de entregas' })
    }

    return {
        list,
        current,
        isLoading,
        error,
        users,
        fetch,
        fetchById,
        update,
        updateCurrent,
        updateStatus,
        remove,
        clear,
        loadUsers,
        fetchDeliveryReady,
        selfAssignOrders,
        fetchAssignedOrders,
        fetchDeliveryHistory,
    }
})

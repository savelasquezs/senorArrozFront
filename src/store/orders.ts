// src/store/orders.ts
import { defineStore } from 'pinia'
import { orderApi } from '@/services/MainAPI/orderApi'
import { productApi } from '@/services/MainAPI/productApi'
import { productCategoryApi } from '@/services/MainAPI/productCategoryApi'
import { customerApi } from '@/services/MainAPI/customerApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { appApi } from '@/services/MainAPI/appApi'
import type {
    Order,
    OrderFilters,
    CreateOrderDto,
    UpdateOrderDto,
    Product,
    DraftOrder,
    OrderTab,
    StoredOrdersState,
} from '@/types/order'
import type {
    Branch,
} from '@/types/branch'
import type {
    Customer,
} from '@/types/customer'
import type {
    Bank,
    App,
} from '@/types/bank'
import type {
    ProductCategory as ProductCategoryType,
} from '@/types/product'
import type {
    PagedResult,
} from '@/types/common'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        // Main orders list
        list: null as PagedResult<Order> | null,
        current: null as Order | null,

        // Draft Orders System (Multiple Tabs)
        draftOrders: new Map<string, DraftOrder>(),
        currentTabId: null as string | null,
        maxTabs: 5,
        nextTabNumber: 1,

        // Products and categories forUI
        products: [] as Product[],
        categories: [] as ProductCategoryType[],

        // Related data
        customers: [] as Customer[],
        branches: [] as Branch[],
        banks: [] as Bank[],
        apps: [] as App[],

        // UI state
        isLoading: false,
        error: null as string | null,

        // Search and filters
        searchQuery: '',
        selectedCategory: null as number | null,
    }),

    getters: {
        // Get filtered products
        filteredProducts: (state): Product[] => {
            let filtered = state.products

            // Filter by category
            if (state.selectedCategory) {
                filtered = filtered.filter(p => p.categoryId === state.selectedCategory)
            }

            // Filter by search query
            if (state.searchQuery && typeof state.searchQuery === 'string' && state.searchQuery.trim()) {
                const query = state.searchQuery.toLowerCase()
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.categoryName && p.categoryName.toLowerCase().includes(query))
                )
            }

            return filtered
        },

        // Get products by category
        productsByCategory: (state) => (categoryId: number): Product[] => {
            return state.products.filter(p => p.categoryId === categoryId)
        },

        // Draft Orders System Getters
        currentOrder: (state): DraftOrder | null => {
            if (!state.currentTabId) return null
            return state.draftOrders.get(state.currentTabId) || null
        },

        orderTabs: (state): OrderTab[] => {
            return Array.from(state.draftOrders.values()).map(order => ({
                tabId: order.tabId,
                tabName: order.tabName,
                itemCount: order.orderItems.length,
                total: order.total,
                type: order.type,
                customerName: order.customerName || undefined,
                isActive: order.tabId === state.currentTabId
            }))
        },

        canAddNewTab: (state): boolean => {
            return state.draftOrders.size < state.maxTabs
        },

        // Get categorized products
        categorizedProducts: (): Array<{ id: number; productName: string; price: number }> => {
            return []
        },

        // Selector options for forms
        productOptions: (state): Array<{ value: number; label: string; disabled?: boolean }> => {
            return state.products.map(product => ({
                value: product.id,
                label: product.name,
                disabled: !product.active || (product.stock !== undefined && product.stock <= 0)
            }))
        },

        categoryOptions: (state): Array<{ value: number; label: string }> => {
            return state.categories.map(category => ({
                value: category.id,
                label: category.name
            }))
        },

        customerOptions: (state): Array<{ value: number; label: string }> => {
            return state.customers.map(customer => ({
                value: customer.id,
                label: customer.name
            }))
        },

        branchOptions: (state): Array<{ value: number; label: string }> => {
            return state.branches.map(branch => ({
                value: branch.id,
                label: branch.name
            }))
        },

        bankOptions: (state): Array<{ value: number; label: string }> => {
            return state.banks.filter(bank => bank.active).map(bank => ({
                value: bank.id,
                label: bank.name
            }))
        },

        appOptions: (state): Array<{ value: number; label: string }> => {
            return state.apps.filter(app => app.active).map(app => ({
                value: app.id,
                label: app.name
            }))
        },
    },

    actions: {
        // Main orders CRUD
        async fetch(filters?: OrderFilters) {
            this.isLoading = true
            this.error = null
            try {
                const response = await orderApi.getOrders(filters)
                this.list = response as PagedResult<Order>
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
                this.current = await orderApi.getOrderById(id)
            } catch (error: any) {
                this.error = error.message || 'Error de conexión'
            } finally {
                this.isLoading = false
            }
        },

        async create(payload: CreateOrderDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await orderApi.createOrder(payload)
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

        async update(id: number, payload: UpdateOrderDto) {
            this.isLoading = true
            this.error = null
            try {
                const response = await orderApi.updateOrder(id, payload)
                // Update item in list
                if (this.list) {
                    const index = this.list.items.findIndex(item => item.id === id)
                    if (index !== -1) {
                        this.list.items[index] = response
                    }
                }
                // Update current if it's the same order
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
                await orderApi.cancelOrder(id)
                // Remove from list
                if (this.list) {
                    this.list.items = this.list.items.filter(item => item.id !== id)
                    this.list.totalCount--
                }
                // Clear current if it was the deleted order
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

        // Load supporting data
        async loadProducts() {
            try {
                const response = await productApi.getProducts({ page: 1, pageSize: 1000 })
                this.products = response?.data?.items || []
            } catch (error) {
                console.error('Error loading products:', error)
            }
        },

        async loadCategories() {
            try {
                // Use productCategoriesApi if available
                const response = await productCategoryApi.getProductCategories({ page: 1, pageSize: 100 })
                this.categories = response?.data?.items || []
            } catch (error) {
                console.error('Error loading categories:', error)
            }
        },

        async loadCustomers() {
            try {
                const response = await customerApi.getCustomers({ page: 1, pageSize: 1000 })
                this.customers = response?.data?.items || []
            } catch (error) {
                console.error('Error loading customers:', error)
            }
        },

        async loadBanks() {
            try {
                const response = await bankApi.getBanks({ page: 1, pageSize: 100 })
                this.banks = response.items || []
            } catch (error) {
                console.error('Error loading banks:', error)
            }
        },

        async loadApps() {
            try {
                const response = await appApi.getApps({ page: 1, pageSize: 100 })
                this.apps = response.items || []
            } catch (error) {
                console.error('Error loading apps:', error)
            }
        },

        // Search and filters
        setSearchQuery(query: string) {
            this.searchQuery = query || ''
        },

        setSelectedCategory(categoryId: number | null) {
            this.selectedCategory = categoryId
        },

        // Status updates
        async completeOrder(id: number) {
            this.current = await orderApi.completeOrder(id)
            if (this.list) {
                const index = this.list.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    this.list.items[index] = this.current
                }
            }
        },

        async prepareOrder(id: number) {
            this.current = await orderApi.prepareOrder(id)
            if (this.list) {
                const index = this.list.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    this.list.items[index] = this.current
                }
            }
        },

        async readyOrder(id: number) {
            this.current = await orderApi.readyOrder(id)
            if (this.list) {
                const index = this.list.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    this.list.items[index] = this.current
                }
            }
        },

        async deliverOrder(id: number) {
            this.current = await orderApi.deliverOrder(id)
            if (this.list) {
                const index = this.list.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    this.list.items[index] = this.current
                }
            }
        },

        clear() {
            this.current = null
            this.error = null
        },

        // Customer and Address Management (keep these in store)

        updateCustomer(customer: Customer | null) {
            if (!this.currentTabId) {
                console.error('No current tab id')
                return;
            }

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) {
                console.error('No order found')
                return;
            }

            // Crear nuevo objeto para disparar reactividad
            const updatedOrder = {
                ...order,
                customerId: customer ? customer.id : null,
                customerName: customer ? customer.name : null,
                customerPhone: customer ? customer.phone1 : null,
                updatedAt: new Date()
            }

            // Reemplazar el objeto completo en el Map
            this.draftOrders.set(this.currentTabId, updatedOrder)
            this.saveToLocalStorage()
        },

        updateAddress(address: any | null) {
            if (!this.currentTabId) {
                console.error('No current tab id')
                return;
            }

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) {
                return;
            }

            // Crear nuevo objeto para disparar reactividad
            const updatedOrder = {
                ...order,
                addressId: address ? address.id : null,
                addressDescription: address ? address.address : null,
                deliveryFee: address ? (address.deliveryFee || 0) : 0,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        updateOrderNotes(notes: string) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo objeto para disparar reactividad
            const updatedOrder = {
                ...order,
                notes,
                updatedAt: new Date()
            }

            // Reemplazar el objeto completo en el Map
            this.draftOrders.set(this.currentTabId, updatedOrder)
            this.saveToLocalStorage()
        },

        updateGuestName(name: string) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            const updatedOrder = {
                ...order,
                guestName: name,
                updatedAt: new Date()
            }

            this.draftOrders.set(this.currentTabId, updatedOrder)
            this.saveToLocalStorage()
        },

        updateDeliveryFee(fee: number) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo objeto para disparar reactividad
            const updatedOrder = {
                ...order,
                deliveryFee: fee >= 0 ? fee : 0,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        // Helper Methods (used by composables)
        recalculateTotals(order: DraftOrder) {
            const subtotal = order.orderItems.reduce((sum, item) => sum + item.subtotal, 0)
            const discountTotal = order.orderItems.reduce((sum, item) => sum + item.discount, 0)
            const total = subtotal + order.deliveryFee

            // Crear nuevo objeto con totales actualizados
            const updatedOrder = {
                ...order,
                subtotal,
                discountTotal,
                total,
                updatedAt: new Date()
            }

            // Reemplazar el objeto completo en el Map
            if (this.currentTabId && order.tabId === this.currentTabId) {
                this.draftOrders.set(this.currentTabId, updatedOrder)
            }
        },

        // Persistencia
        saveToLocalStorage() {
            const state: StoredOrdersState = {
                draftOrders: Array.from(this.draftOrders.values()),
                currentTabId: this.currentTabId,
                nextTabNumber: this.nextTabNumber,
                lastSaved: new Date().toISOString()
            }

            try {
                localStorage.setItem('senor-arroz-draft-orders', JSON.stringify(state))
            } catch (error) {
                console.warn('Error saving to localStorage:', error)
            }
        },

        loadFromLocalStorage() {
            try {
                const stored = localStorage.getItem('senor-arroz-draft-orders')
                if (!stored) return

                const data: StoredOrdersState = JSON.parse(stored)
                const now = new Date()
                const lastSaved = new Date(data.lastSaved)

                // Verificar TTL (24 horas)
                const TTL_HOURS = 24
                if (now.getTime() - lastSaved.getTime() > TTL_HOURS * 60 * 60 * 1000) {
                    localStorage.removeItem('senor-arroz-draft-orders')
                    return
                }

                // Cargar datos
                this.draftOrders = new Map(data.draftOrders.map(order => [order.tabId, order]))
                this.currentTabId = data.currentTabId
                this.nextTabNumber = data.nextTabNumber
            } catch (error) {
                console.warn('Error loading from localStorage:', error)
                localStorage.removeItem('senor-arroz-draft-orders')
            }
        },
    },
})

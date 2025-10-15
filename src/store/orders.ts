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
    ActiveOrder,
    OrderDetail,
    OrderBankPayment,
    OrderAppPayment,
    Product,
    OrderType,
    DraftOrder,
    OrderItem,
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

        // Active orders (work in progress)
        activeOrders: new Map<string, ActiveOrder>(),
        activeOrderId: null as string | null,

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
        // Get current active order
        activeOrder: (state): ActiveOrder | null => {
            if (!state.activeOrderId) return null
            return state.activeOrders.get(state.activeOrderId) || null
        },

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

        // Get active orders list
        activeOrdersList: (state): ActiveOrder[] => {
            return Array.from(state.activeOrders.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
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

        // Active orders management
        generateUUID(): string {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0
                const v = c === 'x' ? r : (r & 0x3 | 0x8)
                return v.toString(16)
            })
        },

        createActiveOrder(type: OrderType = 'delivery'): string {
            const id = this.generateUUID()
            const now = new Date().toISOString()

            const activeOrder: ActiveOrder = {
                id,
                branchId: 0, // Will be set when user selects branch
                takenById: 0, // Will be set from auth
                type,
                orderDetails: [],
                bankPayments: [],
                appPayments: [],
                subtotal: 0,
                total: 0,
                discountTotal: 0,
                isDirty: false,
                createdAt: now,
            }

            this.activeOrders.set(id, activeOrder)
            this.activeOrderId = id

            return id
        },

        setActiveOrder(id: string) {
            if (this.activeOrders.has(id)) {
                this.activeOrderId = id
            }
        },

        deleteActiveOrder(id: string) {
            this.activeOrders.delete(id)
            if (this.activeOrderId === id) {
                // Set to another active order or null
                const remaining = Array.from(this.activeOrders.keys())
                this.activeOrderId = remaining.length > 0 ? remaining[0] : null
            }
        },

        // Order details management
        addProductToActiveOrder(product: Product) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            const existingDetail = order.orderDetails.find(d => d.productId === product.id)

            if (existingDetail) {
                existingDetail.quantity++
            } else {
                const orderDetail: OrderDetail = {
                    id: this.generateUUID(),
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    unitPrice: product.price,
                    discount: 0,
                    subtotal: product.price * 1,
                }

                order.orderDetails.push(orderDetail)
            }

            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        updateOrderDetailQuantity(detailId: string, quantity: number) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            const detail = order.orderDetails.find(d => d.id === detailId)

            if (!detail) return

            if (quantity <= 0) {
                order.orderDetails = order.orderDetails.filter(d => d.id !== detailId)
            } else {
                detail.quantity = quantity
            }

            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        removeOrderDetail(detailId: string) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            order.orderDetails = order.orderDetails.filter(d => d.id !== detailId)
            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        addBankPayment(bankId: number, amount: number) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            const bank = this.banks.find(b => b.id === bankId)

            const bankPayment: OrderBankPayment = {
                id: this.generateUUID(),
                bankId,
                bankName: bank?.name || 'Banco',
                amount,
            }

            order.bankPayments.push(bankPayment)
            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        addAppPayment(appId: number, amount: number) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            const app = this.apps.find(a => a.id === appId)

            // Remove existing app payment (only one allowed)
            order.appPayments = []

            const appPayment: OrderAppPayment = {
                id: this.generateUUID(),
                appId,
                appName: app?.name || 'App',
                bankId: app?.bankId || 0,
                bankName: app?.bankName || 'Banco',
                amount,
            }

            order.appPayments.push(appPayment)
            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        removeBankPayment(paymentId: string) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            order.bankPayments = order.bankPayments.filter(p => p.id !== paymentId)
            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        removeAppPayment(paymentId: string) {
            if (!this.activeOrderId) return

            const order = this.activeOrders.get(this.activeOrderId)!
            order.appPayments = order.appPayments.filter(p => p.id !== paymentId)
            order.isDirty = true
            this.recalculateOrderTotals(order)
        },

        recalculateOrderTotals(order: ActiveOrder) {
            // Calculate subtotal from order details
            order.subtotal = order.orderDetails.reduce((sum, detail) => {
                return sum + (detail.unitPrice * detail.quantity - detail.discount)
            }, 0)

            // Add delivery fee if applicable
            const deliveryFee = order.type === 'delivery' ? (order.deliveryFee || 0) : 0

            order.total = order.subtotal + deliveryFee
        },

        // Search and filters
        setSearchQuery(query: string) {
            this.searchQuery = query || ''
        },

        setSelectedCategory(categoryId: number | null) {
            this.selectedCategory = categoryId
        },

        // Validation
        validateActiveOrder(): { isValid: boolean; errors: string[] } {
            const order = this.activeOrder
            if (!order) {
                return { isValid: false, errors: ['No hay pedido activo'] }
            }

            const errors: string[] = []

            // Check order details
            if (order.orderDetails.length === 0) {
                errors.push('El pedido debe tener al menos un producto')
            }

            // Check customer for delivery
            if (order.type === 'delivery' && !order.customerId) {
                errors.push('Los pedidos delivery requieren un cliente')
            }

            // Check address for delivery
            if (order.type === 'delivery' && !order.addressId) {
                errors.push('Los pedidos delivery requieren una dirección')
            }

            // Check reserved date for reservation
            if (order.type === 'reservation' && !order.reservedFor) {
                errors.push('Las reservaciones requieren una fecha y hora')
            }

            return { isValid: errors.length === 0, errors }
        },

        // Submit active order
        async submitActiveOrder(): Promise<Order | null> {
            const order = this.activeOrder
            if (!order) return null

            const validation = this.validateActiveOrder()
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '))
            }

            const createDto: CreateOrderDto = {
                branchId: order.branchId,
                takenById: order.takenById,
                customerId: order.customerId,
                addressId: order.addressId,
                loyaltyRuleId: order.loyaltyRuleId,
                type: order.type,
                deliveryFee: order.deliveryFee,
                reservedFor: order.reservedFor,
                notes: order.notes,
                orderDetails: order.orderDetails.map(detail => ({
                    productId: detail.productId,
                    quantity: detail.quantity,
                    unitPrice: detail.unitPrice,
                    discount: detail.discount,
                    notes: detail.notes,
                })),
                bankPayments: order.bankPayments.map(payment => ({
                    bankId: payment.bankId,
                    amount: payment.amount,
                })),
                appPayments: order.appPayments.map(payment => ({
                    appId: payment.appId,
                    amount: payment.amount,
                })),
            }

            const createdOrder = await this.create(createDto)

            // Remove from active orders
            this.deleteActiveOrder(order.id)

            return createdOrder
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

        clearActiveOrders() {
            this.activeOrders.clear()
            this.activeOrderId = null
        },

        // Draft Orders System Actions
        createNewTab() {
            if (!this.canAddNewTab) return

            const tabId = `tab-${Date.now()}-${this.nextTabNumber}`
            const tabName = `Pedido ${this.nextTabNumber}`

            const newOrder: DraftOrder = {
                tabId,
                tabName,
                type: 'onsite',
                customerId: null,
                customerName: null,
                customerPhone: null,
                addressId: null,
                addressDescription: null,
                deliveryFee: 0,
                reservedFor: null,
                notes: '',
                orderItems: [],
                bankPayments: [],
                appPayment: null,
                subtotal: 0,
                total: 0,
                discountTotal: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            this.draftOrders.set(tabId, newOrder)
            this.currentTabId = tabId
            this.nextTabNumber++
            this.saveToLocalStorage()
        },

        switchTab(tabId: string) {
            if (this.draftOrders.has(tabId)) {
                this.currentTabId = tabId
                this.saveToLocalStorage()
            }
        },

        closeTab(tabId: string) {
            if (this.draftOrders.has(tabId)) {
                this.draftOrders.delete(tabId)

                // Si era la tab activa, cambiar a otra
                if (this.currentTabId === tabId) {
                    const remainingTabs = Array.from(this.draftOrders.keys())
                    this.currentTabId = remainingTabs.length > 0 ? remainingTabs[0] : null
                }

                this.saveToLocalStorage()
            }
        },

        renameTab(tabId: string, newName: string) {
            const order = this.draftOrders.get(tabId)
            if (order) {
                order.tabName = newName
                order.updatedAt = new Date()
                this.saveToLocalStorage()
            }
        },

        // Gestión de Items
        addProduct(product: Product, quantity: number = 1) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Verificar si el producto ya existe en la orden
            const existingItemIndex = order.orderItems.findIndex(item => item.productId === product.id)

            let updatedItems: OrderItem[]

            if (existingItemIndex !== -1) {
                // Si ya existe, aumentar la cantidad (crear nuevo array inmutable)
                updatedItems = order.orderItems.map((item, index) => {
                    if (index === existingItemIndex) {
                        const newQuantity = item.quantity + quantity
                        const newSubtotal = (newQuantity * item.unitPrice) - item.discount
                        return { ...item, quantity: newQuantity, subtotal: newSubtotal }
                    }
                    return item
                })
            } else {
                // Si no existe, crear nuevo item y agregarlo
                const newItem: OrderItem = {
                    tempId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    productId: product.id,
                    productName: product.name,
                    productPrice: product.price,
                    quantity,
                    unitPrice: product.price,
                    discount: 0,
                    subtotal: product.price * quantity,
                    notes: ''
                }
                updatedItems = [...order.orderItems, newItem]
            }

            // Crear nuevo objeto order
            const updatedOrder = {
                ...order,
                orderItems: updatedItems,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateDraftOrderTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        removeItem(itemTempId: string) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo objeto con items filtrados
            const updatedOrder = {
                ...order,
                orderItems: order.orderItems.filter(item => item.tempId !== itemTempId),
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateDraftOrderTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        updateItemQuantity(itemTempId: string, quantity: number) {
            if (!this.currentTabId || quantity < 1) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo array de items con el item actualizado
            const updatedItems = order.orderItems.map(item => {
                if (item.tempId === itemTempId) {
                    const newSubtotal = (quantity * item.unitPrice) - item.discount
                    return { ...item, quantity, subtotal: newSubtotal }
                }
                return item
            })

            // Crear nuevo objeto order
            const updatedOrder = {
                ...order,
                orderItems: updatedItems,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateDraftOrderTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        updateItemPrice(itemTempId: string, price: number) {
            if (!this.currentTabId || price < 0) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo array de items con el item actualizado
            const updatedItems = order.orderItems.map(item => {
                if (item.tempId === itemTempId) {
                    const newSubtotal = (item.quantity * price) - item.discount
                    return { ...item, unitPrice: price, subtotal: newSubtotal }
                }
                return item
            })

            // Crear nuevo objeto order
            const updatedOrder = {
                ...order,
                orderItems: updatedItems,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateDraftOrderTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        updateItemDiscount(itemTempId: string, discount: number) {
            if (!this.currentTabId || discount < 0) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo array de items con el item actualizado
            const updatedItems = order.orderItems.map(item => {
                if (item.tempId === itemTempId) {
                    const newSubtotal = (item.quantity * item.unitPrice) - discount
                    return { ...item, discount, subtotal: newSubtotal }
                }
                return item
            })

            // Crear nuevo objeto order
            const updatedOrder = {
                ...order,
                orderItems: updatedItems,
                updatedAt: new Date()
            }

            // Recalcular totales (esto también hace el set en el Map)
            this.recalculateDraftOrderTotals(updatedOrder)
            this.saveToLocalStorage()
        },

        updateItemNotes(itemTempId: string, notes: string) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo array de items con el item actualizado
            const updatedItems = order.orderItems.map(item => {
                if (item.tempId === itemTempId) {
                    return { ...item, notes }
                }
                return item
            })

            // Crear nuevo objeto order
            const updatedOrder = {
                ...order,
                orderItems: updatedItems,
                updatedAt: new Date()
            }

            // Reemplazar el objeto completo en el Map
            this.draftOrders.set(this.currentTabId, updatedOrder)
            this.saveToLocalStorage()
        },

        // Gestión de Orden
        updateOrderType(type: OrderType) {
            if (!this.currentTabId) return

            const order = this.draftOrders.get(this.currentTabId)
            if (!order) return

            // Crear nuevo objeto para disparar reactividad
            const updatedOrder = {
                ...order,
                type,
                updatedAt: new Date()
            }

            // Reemplazar el objeto completo en el Map
            this.draftOrders.set(this.currentTabId, updatedOrder)
            this.saveToLocalStorage()
        },

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
            this.recalculateDraftOrderTotals(updatedOrder)
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

        // Cálculos
        recalculateDraftOrderTotals(order: DraftOrder) {
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

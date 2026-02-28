// src/store/ordersDrafts.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProductsStore } from './products'
import { useCustomersStore } from './customers'
import { bankApi } from '@/services/MainAPI/bankApi'
import { appApi } from '@/services/MainAPI/appApi'
import { orderApi } from '@/services/MainAPI/orderApi'
import type {
    DraftOrder,
    OrderTab,
    StoredOrdersState,
    CreateOrderDto,
} from '@/types/order'
import type {
    Customer,
    CustomerAddress,
} from '@/types/customer'
import type {
    Bank,
    App,
} from '@/types/bank'

export const useOrdersDraftsStore = defineStore('ordersDrafts', () => {
    // ===== Estado =====
    const draftOrders = ref(new Map<string, DraftOrder>())
    const currentTabId = ref<string | null>(null)
    const maxTabs = ref(5)
    const nextTabNumber = ref(1)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const searchQuery = ref('')
    const selectedCategory = ref<number | null>(null)
    const customers = ref<Customer[]>([])
    const banks = ref<Bank[]>([])
    const apps = ref<App[]>([])

    // ===== Getters =====
    const currentOrder = computed(() => {
        if (!currentTabId.value) return null
        return draftOrders.value.get(currentTabId.value) || null
    })

    const orderTabs = computed((): OrderTab[] => {
        return Array.from(draftOrders.value.values()).map(order => ({
            tabId: order.tabId,
            tabName: order.tabName,
            itemCount: order.orderItems.length,
            total: order.total,
            type: order.type,
            customerName: order.customerName || undefined,
            isActive: order.tabId === currentTabId.value
        }))
    })

    const hasActiveOrders = computed(() => draftOrders.value.size > 0)

    const canAddNewTab = computed(() => draftOrders.value.size < maxTabs.value)

    // Delegar a productsStore
    const products = computed(() => {
        const productsStore = useProductsStore()
        return productsStore.currentProducts
    })

    const filteredProducts = computed(() => {
        const productsStore = useProductsStore()
        // Filtrar primero los productos activos para evitar mostrar inactivos en la orden
        let filtered = productsStore.currentProducts.filter(product => product.active)

        // Aplicar búsqueda
        if (searchQuery.value) {
            const query = searchQuery.value.toLowerCase()
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.categoryName?.toLowerCase().includes(query)
            )
        }

        // Aplicar filtro de categoría
        if (selectedCategory.value) {
            filtered = filtered.filter(p => p.categoryId === selectedCategory.value)
        }

        return filtered
    })

    const bankOptions = computed(() =>
        banks.value.filter(bank => bank.active).map(bank => ({
            value: bank.id,
            label: bank.name
        }))
    )

    const appOptions = computed(() =>
        apps.value.filter(app => app.active).map(app => ({
            value: app.id,
            label: app.name
        }))
    )

    // ===== Acciones (COPIAR EXACTO de orders.ts) =====

    // Order data - COPIAR líneas 364-465
    const updateCustomer = (customer: Customer | null) => {
        if (!currentTabId.value) {
            console.error('No current tab id')
            return;
        }

        const order = draftOrders.value.get(currentTabId.value)
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
        }

        // Reemplazar el objeto completo en el Map
        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    const updateAddress = (address: any | null) => {
        if (!currentTabId.value) {
            console.error('No current tab id')
            return;
        }

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) {
            return;
        }

        // Crear nuevo objeto para disparar reactividad
        const updatedOrder = {
            ...order,
            addressId: address ? address.id : null,
            addressDescription: address ? address.address : null,
            deliveryFee: address ? (address.deliveryFee || 0) : 0,
        }

        // Recalcular totales (esto también hace el set en el Map)
        recalculateTotals(updatedOrder)
        saveToLocalStorage()
    }

    /** Añade o actualiza una dirección en la lista de clientes del store para que getAddress la encuentre (p. ej. tras crear una nueva). */
    const addAddressToCustomer = (customerId: number, address: CustomerAddress) => {
        const idx = customers.value.findIndex((c) => c.id === customerId)
        if (idx === -1) return
        const customer = customers.value[idx]
        const prev = customer.addresses ?? []
        const existingIdx = prev.findIndex((a) => a.id === address.id)
        const nextAddresses = existingIdx >= 0
            ? prev.map((a, i) => (i === existingIdx ? address : a))
            : [...prev, address]
        customers.value = customers.value.map((c, i) =>
            i === idx ? { ...c, addresses: nextAddresses } : c
        )
    }

    const updateOrderNotes = (notes: string) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        // Crear nuevo objeto para disparar reactividad
        const updatedOrder = {
            ...order,
            notes,
        }

        // Reemplazar el objeto completo en el Map
        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    const updateGuestName = (name: string) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        const updatedOrder = {
            ...order,
            guestName: name,
        }

        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    const updateDeliveryFee = (fee: number) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        // Crear nuevo objeto para disparar reactividad
        const updatedOrder = {
            ...order,
            deliveryFee: fee >= 0 ? fee : 0,
        }

        // Recalcular totales (esto también hace el set en el Map)
        recalculateTotals(updatedOrder)
        saveToLocalStorage()
    }

    // Helper Methods - COPIAR líneas 468-521
    const recalculateTotals = (order: DraftOrder) => {
        const subtotal = order.orderItems.reduce((sum, item) => sum + item.subtotal, 0)
        const discountTotal = order.orderItems.reduce((sum, item) => sum + item.discount, 0)
        const total = subtotal + order.deliveryFee

        // Crear nuevo objeto con totales actualizados
        let updatedOrder = {
            ...order,
            subtotal,
            discountTotal,
            total
        }

        // Auto-ajustar pago único si aplica
        updatedOrder = autoAdjustSinglePayment(updatedOrder)

        // Reemplazar el objeto completo en el Map
        if (currentTabId.value && order.tabId === currentTabId.value) {
            draftOrders.value.set(currentTabId.value, updatedOrder)
        }
    }

    // Auto-ajustar pago único al total del pedido
    const autoAdjustSinglePayment = (order: DraftOrder): DraftOrder => {
        // Contar pagos totales
        const totalPayments = (order.appPayment ? 1 : 0) + order.bankPayments.length

        // Solo proceder si hay exactamente 1 pago
        if (totalPayments !== 1) return order

        // Caso 1: Es un app payment sin edición manual
        if (order.appPayment && !order.appPayment.manuallyEdited) {
            return {
                ...order,
                appPayment: {
                    ...order.appPayment,
                    amount: order.total
                }
            }
        }

        // Caso 2: Es un bank payment sin edición manual
        if (order.bankPayments.length === 1 && !order.bankPayments[0].manuallyEdited) {
            return {
                ...order,
                bankPayments: [{
                    ...order.bankPayments[0],
                    amount: order.total
                }]
            }
        }

        return order
    }

    // Persistence - COPIAR líneas 524-563
    const saveToLocalStorage = () => {
        const state: StoredOrdersState = {
            draftOrders: Array.from(draftOrders.value.values()),
            currentTabId: currentTabId.value,
            nextTabNumber: nextTabNumber.value,
            lastSaved: new Date().toISOString()
        }

        try {
            localStorage.setItem('senor-arroz-draft-orders', JSON.stringify(state))
        } catch (error) {
            console.warn('Error saving to localStorage:', error)
        }
    }

    const loadFromLocalStorage = () => {
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
            draftOrders.value = new Map(data.draftOrders.map(order => [order.tabId, order]))
            currentTabId.value = data.currentTabId
            nextTabNumber.value = data.nextTabNumber
        } catch (error) {
            console.warn('Error loading from localStorage:', error)
            localStorage.removeItem('senor-arroz-draft-orders')
        }
    }

    // Load data - ADAPTAR
    const loadCustomers = async () => {
        const customersStore = useCustomersStore()
        await customersStore.fetch({ page: 1, pageSize: 1000 })
        customers.value = customersStore.list?.items || []
    }

    const loadBanks = async () => {
        try {
            const response = await bankApi.getBanks({ page: 1, pageSize: 100 })
            banks.value = response.items || []
        } catch (error) {
            console.error('Error loading banks:', error)
        }
    }

    const loadApps = async () => {
        try {
            const response = await appApi.getApps({ page: 1, pageSize: 100 })
            apps.value = response.items || []
        } catch (error) {
            console.error('Error loading apps:', error)
        }
    }

    // Search and filters - COPIAR líneas 308-314
    const setSearchQuery = (query: string) => {
        searchQuery.value = query || ''
    }

    const setSelectedCategory = (categoryId: number | null) => {
        selectedCategory.value = categoryId
    }

    // Clear - COPIAR líneas 357-360
    const clear = () => {
        error.value = null
    }

    // Create order - MOVIDO desde ordersData
    const create = async (payload: CreateOrderDto) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.createOrder(payload)
            return response
        } catch (error: any) {
            error.value = error.message || 'Error de conexión'
            throw error
        } finally {
            isLoading.value = false
        }
    }

    return {
        // Estado
        draftOrders,
        currentTabId,
        maxTabs,
        nextTabNumber,
        isLoading,
        error,
        searchQuery,
        selectedCategory,
        customers,
        banks,
        apps,
        // Getters
        currentOrder,
        orderTabs,
        hasActiveOrders,
        canAddNewTab,
        products,
        filteredProducts,
        bankOptions,
        appOptions,
        // Acciones
        updateCustomer,
        updateAddress,
        addAddressToCustomer,
        updateOrderNotes,
        updateGuestName,
        updateDeliveryFee,
        recalculateTotals,
        autoAdjustSinglePayment,
        saveToLocalStorage,
        loadFromLocalStorage,
        loadCustomers,
        loadBanks,
        loadApps,
        setSearchQuery,
        setSelectedCategory,
        clear,
        create
    }
})

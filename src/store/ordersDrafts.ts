// src/store/ordersDrafts.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProductsStore } from './products'
import { useCustomersStore } from './customers'
import { useBanksStore } from './banks'
import { useAppsStore } from './apps'
import { orderApi } from '@/services/MainAPI/orderApi'
import { customerApi } from '@/services/MainAPI/customerApi'
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
import { useProductCategoriesStore } from './productCategories'
import {
    getRiceCategoryIdSet,
    sortProductsByPortionOrder,
} from '@/config/orderPosCategories'
import { useBranchPosSettingsStore } from '@/store/branchPosSettings'
import {
    deliveryDiscountBudget,
    distributeEqualWithCaps,
    lineCapacityCop,
} from '@/composables/useFreeDeliveryDiscount'

/** Si falla la API al rehidratar, reconstruye un cliente mínimo desde el borrador persistido. */
function buildFallbackCustomerForDraft(customerId: number, drafts: DraftOrder[]): Customer | null {
    const order = drafts.find((d) => d.customerId === customerId)
    if (!order?.customerId) return null
    const addresses: CustomerAddress[] = []
    if (order.addressId) {
        addresses.push({
            id: order.addressId,
            customerId: order.customerId,
            neighborhoodId: 0,
            address: order.addressDescription ?? '',
            additionalInfo: order.addressAdditionalInfo ?? undefined,
            isPrimary: true,
            createdAt: '',
            updatedAt: '',
            deliveryFee: order.deliveryFee ?? 0,
        })
    }
    return {
        id: order.customerId,
        name: order.customerName ?? 'Cliente',
        phone1: order.customerPhone ?? '',
        branchId: 0,
        active: true,
        createdAt: '',
        updatedAt: '',
        addresses,
    }
}

export const useOrdersDraftsStore = defineStore('ordersDrafts', () => {
    // ===== Estado =====
    const draftOrders = ref(new Map<string, DraftOrder>())
    const currentTabId = ref<string | null>(null)
    const maxTabs = ref(5)
    const nextTabNumber = ref(1)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const searchQuery = ref('')
    /** null = mostrar todas las categorías; array = unión de categoryId permitidos */
    const selectedCategoryIds = ref<number[] | null>(null)
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
            guestName: order.guestName || undefined,
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

        // Aplicar filtro de categoría (uno o varios ids, p. ej. Paisa + Paisa Chich)
        if (selectedCategoryIds.value?.length) {
            const allowed = new Set(selectedCategoryIds.value)
            filtered = filtered.filter((p) => allowed.has(p.categoryId))
        }

        const catStore = useProductCategoriesStore()
        const catalog =
            catStore.list?.items?.map((c) => ({ id: c.id, name: c.name ?? '' })) ?? []
        const riceIds = getRiceCategoryIdSet(catalog)
        if (
            selectedCategoryIds.value?.length &&
            selectedCategoryIds.value.every((id) => riceIds.has(id))
        ) {
            filtered = sortProductsByPortionOrder(filtered)
        }

        return filtered
    })

    const selectedCategory = computed(() => {
        const ids = selectedCategoryIds.value
        if (!ids || ids.length !== 1) return null
        return ids[0]
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
        const numericAddressId =
            address != null && address.id != null && !Number.isNaN(Number(address.id)) && Number(address.id) > 0
                ? Number(address.id)
                : null
        const updatedOrder = {
            ...order,
            addressId: numericAddressId,
            addressDescription: address ? address.address : null,
            addressAdditionalInfo: address ? (address.additionalInfo ?? null) : null,
            deliveryFee: address ? (address.deliveryFee || 0) : 0,
        }

        // Recalcular totales (esto también hace el set en el Map)
        recalculateTotals(updatedOrder)
        saveToLocalStorage()
    }

    /** Añade o actualiza una dirección en la lista de clientes del store para que getAddress la encuentre (p. ej. tras crear una nueva). */
    const addAddressToCustomer = (
        customerId: number,
        address: CustomerAddress,
        hintCustomer?: Customer | null,
    ) => {
        const mergeInto = (base: Customer, prevAddresses: CustomerAddress[]) => {
            const existingIdx = prevAddresses.findIndex((a) => a.id === address.id)
            return existingIdx >= 0
                ? prevAddresses.map((a, i) => (i === existingIdx ? address : a))
                : [...prevAddresses, address]
        }

        const idx = customers.value.findIndex((c) => c.id === customerId)
        if (idx === -1) {
            if (!hintCustomer || hintCustomer.id !== customerId) return
            const nextAddresses = mergeInto(hintCustomer, hintCustomer.addresses ?? [])
            customers.value = [{ ...hintCustomer, addresses: nextAddresses }, ...customers.value]
            return
        }
        const customer = customers.value[idx]
        const nextAddresses = mergeInto(customer, customer.addresses ?? [])
        customers.value = customers.value.map((c, i) =>
            i === idx ? { ...c, addresses: nextAddresses } : c
        )
    }

    /** Añade un cliente a la lista del store si no está (p. ej. recién creado), para que getCustomer lo encuentre. */
    const ensureCustomerInList = (customer: Customer) => {
        const exists = customers.value.some((c) => c.id === customer.id)
        if (!exists) {
            customers.value = [customer, ...customers.value]
        }
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

    const updateIsLater = (value: boolean) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        const updatedOrder = {
            ...order,
            isLater: value,
            updatedAt: new Date()
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

    const updateReservedFor = (date: Date | null) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        const updatedOrder = {
            ...order,
            reservedFor: date,
        }

        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    const updatePrepareAt = (date: Date | null) => {
        if (!currentTabId.value) return

        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return

        const updatedOrder = {
            ...order,
            prepareAt: date,
        }

        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    const updatePaidInStoreCash = (payload: {
        paidInStoreCash: boolean
        paidInStoreCashAmount?: number | null
    }) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        const bankSum = order.bankPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
        const appSum = order.appPayment ? Number(order.appPayment.amount ?? 0) : 0
        const cap = Math.max(0, order.total - bankSum - appSum)

        const amountKeyPresent = Object.prototype.hasOwnProperty.call(payload, 'paidInStoreCashAmount')

        let nextAmount: number | null | undefined
        if (!payload.paidInStoreCash) {
            nextAmount = null
        } else if (
            typeof payload.paidInStoreCashAmount === 'number' &&
            Number.isFinite(payload.paidInStoreCashAmount)
        ) {
            const v = Math.round(payload.paidInStoreCashAmount)
            nextAmount = cap <= 0 ? 0 : Math.min(cap, Math.max(1, v))
        } else if (amountKeyPresent && (payload.paidInStoreCashAmount === null || payload.paidInStoreCashAmount === undefined)) {
            // Explícito: volver a remanente implícito (sin monto fijado en JSON)
            nextAmount = cap <= 0 ? 0 : null
        } else if (!amountKeyPresent) {
            // Solo paidInStoreCash (p. ej. checkbox): no borrar un monto parcial ya guardado
            const prev = order.paidInStoreCashAmount
            if (typeof prev === 'number' && Number.isFinite(prev)) {
                const v = Math.round(prev)
                nextAmount = cap <= 0 ? 0 : Math.min(cap, Math.max(1, v))
            } else {
                nextAmount = cap <= 0 ? 0 : null
            }
        } else {
            nextAmount = cap <= 0 ? 0 : null
        }

        const updatedOrder = {
            ...order,
            paidInStoreCash: payload.paidInStoreCash,
            paidInStoreCashAmount: nextAmount ?? null,
            updatedAt: new Date(),
        }
        draftOrders.value.set(currentTabId.value, updatedOrder)
        saveToLocalStorage()
    }

    /** Tras total/pagos: si no queda remanente o el monto en tienda lo excede, alinear con el backend. */
    const clampPaidInStoreToRemainder = (order: DraftOrder): DraftOrder => {
        if (!order.paidInStoreCash) return order
        const bankSum = order.bankPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
        const appSum = order.appPayment ? Number(order.appPayment.amount ?? 0) : 0
        const cap = Math.max(0, order.total - bankSum - appSum)
        if (cap < 1) {
            return {
                ...order,
                paidInStoreCash: false,
                paidInStoreCashAmount: null,
                updatedAt: new Date(),
            }
        }
        const amt = order.paidInStoreCashAmount
        if (typeof amt === 'number' && Number.isFinite(amt) && amt > cap) {
            return { ...order, paidInStoreCashAmount: cap, updatedAt: new Date() }
        }
        return order
    }

    const applyFreeDeliveryToOrder = (order: DraftOrder): DraftOrder => {
        const pos = useBranchPosSettingsStore()
        const maxCap = pos.maxFreeDeliveryDiscount
        const items = order.orderItems.map((i) => ({ ...i }))
        const eligible =
            order.freeDeliveryRequested &&
            (order.type === 'delivery' ||
                (order.type === 'reservation' && order.addressId != null)) &&
            items.length > 0

        if (!eligible) {
            const cleared = items.map((i) => {
                const fd = 0
                const sub = Math.max(0, i.quantity * i.unitPrice - i.discount - fd)
                return { ...i, freeDeliveryDiscount: fd, subtotal: sub }
            })
            return { ...order, orderItems: cleared }
        }

        const budget = deliveryDiscountBudget(order.deliveryFee, maxCap)
        const caps = items.map((i) =>
            lineCapacityCop({
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                manualDiscount: i.discount,
            }),
        )
        const shares = distributeEqualWithCaps(budget, caps)
        const next = items.map((i, idx) => {
            const fd = shares[idx] ?? 0
            const sub = Math.max(0, i.quantity * i.unitPrice - i.discount - fd)
            return { ...i, freeDeliveryDiscount: fd, subtotal: sub }
        })
        return { ...order, orderItems: next }
    }

    // Helper Methods - COPIAR líneas 468-521
    const recalculateTotals = (order: DraftOrder) => {
        const withFd = applyFreeDeliveryToOrder(order)
        const subtotal = withFd.orderItems.reduce((sum, item) => sum + item.subtotal, 0)
        const discountTotal = withFd.orderItems.reduce(
            (sum, item) => sum + item.discount + (item.freeDeliveryDiscount ?? 0),
            0,
        )
        const total = subtotal + withFd.deliveryFee

        // Crear nuevo objeto con totales actualizados
        let updatedOrder = {
            ...withFd,
            subtotal,
            discountTotal,
            total,
        }

        // Auto-ajustar pago único si aplica
        updatedOrder = autoAdjustSinglePayment(updatedOrder)
        updatedOrder = clampPaidInStoreToRemainder(updatedOrder)

        if (draftOrders.value.has(order.tabId)) {
            draftOrders.value.set(order.tabId, updatedOrder)
        }
    }

    const updateFreeDeliveryRequested = (value: boolean) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        const updated = { ...order, freeDeliveryRequested: value, updatedAt: new Date() }
        recalculateTotals(updated)
        saveToLocalStorage()
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

            // Cargar datos (migración: asegurar prepareAt e isLater en drafts antiguos)
            const migratedDrafts = data.draftOrders.map((order: any) => ({
                ...order,
                prepareAt: order.prepareAt ?? null,
                isLater: order.isLater ?? false,
                paidInStoreCash: order.paidInStoreCash ?? false,
                paidInStoreCashAmount:
                    typeof order.paidInStoreCashAmount === 'number' ? order.paidInStoreCashAmount : null,
                freeDeliveryRequested: order.freeDeliveryRequested ?? false,
                orderItems: (order.orderItems ?? []).map((it: any) => {
                    const fd = typeof it.freeDeliveryDiscount === 'number' ? it.freeDeliveryDiscount : 0
                    const disc = typeof it.discount === 'number' ? it.discount : 0
                    const q = typeof it.quantity === 'number' ? it.quantity : 0
                    const up = typeof it.unitPrice === 'number' ? it.unitPrice : 0
                    return {
                        ...it,
                        freeDeliveryDiscount: fd,
                        subtotal: Math.max(0, q * up - disc - fd),
                    }
                }),
            }))
            draftOrders.value = new Map(migratedDrafts.map((order: DraftOrder) => [order.tabId, order]))
            for (const o of draftOrders.value.values()) {
                recalculateTotals(o)
            }
            currentTabId.value = data.currentTabId
            nextTabNumber.value = data.nextTabNumber
        } catch (error) {
            console.warn('Error loading from localStorage:', error)
            localStorage.removeItem('senor-arroz-draft-orders')
        }
    }

    /** Tras restaurar borradores: carga clientes (y direcciones) desde la API para rellenar CustomerSection. */
    const rehydrateCustomersFromDrafts = async () => {
        const drafts = Array.from(draftOrders.value.values())
        const ids = [
            ...new Set(
                drafts
                    .map((o) => o.customerId)
                    .filter((id): id is number => id != null && id > 0),
            ),
        ]
        if (ids.length === 0) return

        await Promise.all(
            ids.map(async (id) => {
                try {
                    const res = await customerApi.getCustomerById(id)
                    const c = res.isSuccess ? res.data : null
                    if (!c) {
                        const fallback = buildFallbackCustomerForDraft(id, drafts)
                        if (fallback) ensureCustomerInList(fallback)
                        return
                    }
                    let merged: Customer = c
                    if (!c.addresses?.length) {
                        try {
                            const ar = await customerApi.getCustomerAddresses(id)
                            merged = {
                                ...c,
                                addresses: ar.isSuccess ? ar.data ?? [] : [],
                            }
                        } catch {
                            merged = { ...c, addresses: [] }
                        }
                    }
                    ensureCustomerInList(merged)
                } catch (e) {
                    console.warn('No se pudo rehidratar cliente del borrador', id, e)
                    const fallback = buildFallbackCustomerForDraft(id, drafts)
                    if (fallback) ensureCustomerInList(fallback)
                }
            }),
        )
    }

    const loadBanks = async () => {
        try {
            const banksStore = useBanksStore()
            await banksStore.ensureListLoaded()
            banks.value = banksStore.list?.items ?? []
        } catch (error) {
            console.error('Error loading banks:', error)
        }
    }

    const loadApps = async () => {
        try {
            const appsStore = useAppsStore()
            await appsStore.ensureListLoaded()
            apps.value = appsStore.list?.items ?? []
        } catch (error) {
            console.error('Error loading apps:', error)
        }
    }

    // Search and filters - COPIAR líneas 308-314
    const setSearchQuery = (query: string) => {
        searchQuery.value = query || ''
    }

    const setSelectedCategoryIds = (ids: number[] | null) => {
        selectedCategoryIds.value = !ids?.length ? null : [...ids]
    }

    const setSelectedCategory = (categoryId: number | null) => {
        selectedCategoryIds.value = categoryId == null ? null : [categoryId]
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
        selectedCategoryIds,
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
        ensureCustomerInList,
        updateOrderNotes,
        updateGuestName,
        updateIsLater,
        updateReservedFor,
        updatePrepareAt,
        updatePaidInStoreCash,
        updateDeliveryFee,
        updateFreeDeliveryRequested,
        recalculateTotals,
        autoAdjustSinglePayment,
        saveToLocalStorage,
        loadFromLocalStorage,
        rehydrateCustomersFromDrafts,
        loadBanks,
        loadApps,
        setSearchQuery,
        setSelectedCategoryIds,
        setSelectedCategory,
        clear,
        create
    }
})

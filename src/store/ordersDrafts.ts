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
import type { Product } from '@/types/product'
import { useProductCategoriesStore } from './productCategories'
import {
    getRiceCategoryIdSet,
    sortProductsByPortionOrder,
} from '@/config/orderPosCategories'
import { useBranchPosSettingsStore } from '@/store/branchPosSettings'
import { useAuthStore } from '@/store/auth'
import type { WhatsAppOrderDraft } from '@/types/whatsapp'
import { useDailyPromotionStore } from '@/store/dailyPromotion'
import {
    deliveryDiscountBudget,
    distributeEqualWithCaps,
    lineCapacityCop,
} from '@/composables/useFreeDeliveryDiscount'
import type { DailyPromotion } from '@/types/dailyPromotion'
import type { LoyaltyCycleStep } from '@/types/loyaltyCycle'
import type { DiscountCode } from '@/types/discountCode'

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
        const updatedOrder = clearBenefitEffectsFromOrder({
            ...order,
            customerId: customer ? customer.id : null,
            customerName: customer ? customer.name : null,
            customerPhone: customer ? customer.phone1 : null,
        }, { clearSelection: true, ignoredDailyPromotionId: null, ignoredLoyaltyStepId: null })

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

    const replaceCustomerAddresses = (
        customerId: number,
        addresses: CustomerAddress[],
        hintCustomer?: Customer | null,
    ) => {
        const idx = customers.value.findIndex((c) => c.id === customerId)
        if (idx === -1) {
            if (!hintCustomer || hintCustomer.id !== customerId) return
            customers.value = [{ ...hintCustomer, addresses }, ...customers.value]
            return
        }

        customers.value = customers.value.map((c, i) =>
            i === idx ? { ...c, addresses } : c
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

    const linePromotionDiscount = (item: {
        dailyPromotionDiscount?: number | null
        loyaltyDiscount?: number | null
        discountCodeDiscount?: number | null
    }) =>
        Math.max(0, Math.round(Number(item.dailyPromotionDiscount ?? 0) || 0)) +
        Math.max(0, Math.round(Number(item.loyaltyDiscount ?? 0) || 0)) +
        Math.max(0, Math.round(Number(item.discountCodeDiscount ?? 0) || 0))

    const lineBaseDiscount = (item: {
        discount: number
        dailyPromotionDiscount?: number | null
        loyaltyDiscount?: number | null
        discountCodeDiscount?: number | null
    }) =>
        Math.max(0, Math.round(Number(item.discount ?? 0) || 0)) + linePromotionDiscount(item)

    const lineSubtotal = (item: {
        quantity: number
        unitPrice: number
        discount: number
        dailyPromotionDiscount?: number | null
        loyaltyDiscount?: number | null
        discountCodeDiscount?: number | null
        freeDeliveryDiscount?: number | null
    }) => {
        const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice)
        const discounts = lineBaseDiscount(item) + Math.max(0, Math.round(Number(item.freeDeliveryDiscount ?? 0) || 0))
        return Math.max(0, gross - discounts)
    }

    const purchasedProductsGrossSubtotal = (order: DraftOrder) =>
        order.orderItems
            .filter((item) =>
                item.isDailyPromotionGift !== true &&
                item.isLoyaltyGift !== true &&
                item.isDiscountCodeGift !== true &&
                item.isManualBenefitGift !== true)
            .reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0)

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
                const sub = lineSubtotal({ ...i, freeDeliveryDiscount: fd })
                return { ...i, freeDeliveryDiscount: fd, subtotal: sub }
            })
            return { ...order, orderItems: cleared }
        }

        const budget = deliveryDiscountBudget(order.deliveryFee, maxCap)
        const caps = items.map((i) =>
            lineCapacityCop({
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                manualDiscount: lineBaseDiscount(i),
            }),
        )
        const shares = distributeEqualWithCaps(budget, caps)
        const next = items.map((i, idx) => {
            const fd = shares[idx] ?? 0
            const sub = lineSubtotal({ ...i, freeDeliveryDiscount: fd })
            return { ...i, freeDeliveryDiscount: fd, subtotal: sub }
        })
        return { ...order, orderItems: next }
    }

    // Helper Methods - COPIAR líneas 468-521
    const recalculateTotals = (order: DraftOrder) => {
        const withFd = applyFreeDeliveryToOrder(order)
        const subtotal = withFd.orderItems.reduce((sum, item) => sum + item.subtotal, 0)
        const discountTotal = withFd.orderItems.reduce(
            (sum, item) => sum + item.discount + linePromotionDiscount(item) + (item.freeDeliveryDiscount ?? 0),
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

    const promotionMinimumReached = (order: DraftOrder, promo: DailyPromotion) => {
        const minimum = Math.max(0, Number(promo.minimumOrderValue ?? 0) || 0)
        if (minimum <= 0) return true
        return purchasedProductsGrossSubtotal(order) >= minimum
    }

    const clearBenefitEffectsFromOrder = (
        order: DraftOrder,
        options: { clearSelection?: boolean; ignoredDailyPromotionId?: number | null; ignoredLoyaltyStepId?: number | null } = {},
    ): DraftOrder => {
        const shouldClearFreeDelivery =
            order.appliedDailyPromotionType === 'FreeDelivery' ||
            order.appliedLoyaltyRewardType === 'FreeDelivery' ||
            order.appliedDiscountCodeType === 'FreeDelivery' ||
            (order.appliedBenefitType === 'Manual' && order.appliedBenefitRewardType === 'FreeDelivery')
        const orderItems = order.orderItems
            .filter((item) =>
                item.isDailyPromotionGift !== true &&
                item.isLoyaltyGift !== true &&
                item.isDiscountCodeGift !== true &&
                item.isManualBenefitGift !== true)
            .map((item) => {
                const next = {
                    ...item,
                    dailyPromotionDiscount: 0,
                    dailyPromotionDiscountPercentage: null,
                    loyaltyDiscount: 0,
                    loyaltyDiscountPercentage: null,
                    discountCodeDiscount: 0,
                    discountCodeDiscountPercentage: null,
                    isDailyPromotionGift: false,
                    isLoyaltyGift: false,
                    isDiscountCodeGift: false,
                }
                return { ...next, subtotal: lineSubtotal(next) }
            })

        return {
            ...order,
            orderItems,
            freeDeliveryRequested: shouldClearFreeDelivery ? false : order.freeDeliveryRequested,
            appliedDailyPromotionId: null,
            appliedDailyPromotionType: null,
            appliedDailyPromotionGiftProductId: null,
            appliedDailyPromotionGiftProductName: null,
            appliedDailyPromotionDiscountPercentage: null,
            appliedDailyPromotionDiscountScope: null,
            ignoredDailyPromotionId:
                options.ignoredDailyPromotionId !== undefined
                    ? options.ignoredDailyPromotionId
                    : order.ignoredDailyPromotionId ?? null,
            appliedLoyaltyStepId: null,
            appliedLoyaltyStepIndex: null,
            appliedLoyaltyRewardType: null,
            appliedLoyaltyGiftProductId: null,
            appliedLoyaltyGiftProductName: null,
            appliedLoyaltyDiscountPercentage: null,
            ignoredLoyaltyStepId:
                options.ignoredLoyaltyStepId !== undefined ? options.ignoredLoyaltyStepId : order.ignoredLoyaltyStepId ?? null,
            appliedDiscountCodeId: null,
            appliedDiscountCodeCode: null,
            appliedDiscountCodeType: null,
            appliedDiscountCodeGiftProductId: null,
            appliedDiscountCodeGiftProductName: null,
            appliedDiscountCodeDiscountPercentage: null,
            appliedBenefitType: null,
            appliedBenefitSourceId: null,
            appliedBenefitCode: null,
            appliedBenefitLabel: null,
            appliedBenefitRewardType: null,
            appliedBenefitAmount: null,
            appliedBenefitSnapshot: null,
            manualBenefitReason: null,
            manualBenefitGiftProductId: null,
            selectedBenefitType: options.clearSelection ? null : order.selectedBenefitType ?? null,
            updatedAt: new Date(),
        }
    }

    const setCurrentOrderSelectedBenefit = (type: DraftOrder['selectedBenefitType']) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        draftOrders.value.set(currentTabId.value, { ...order, selectedBenefitType: type ?? null, updatedAt: new Date() })
        saveToLocalStorage()
    }

    const clearAppliedBenefitForCurrentOrder = (options: {
        clearSelection?: boolean
        selectedBenefitType?: DraftOrder['selectedBenefitType']
        ignoredDailyPromotionId?: number | null
        ignoredLoyaltyStepId?: number | null
    } = {}) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        const cleared = clearBenefitEffectsFromOrder(order, {
            clearSelection: options.clearSelection,
            ignoredDailyPromotionId: options.ignoredDailyPromotionId,
            ignoredLoyaltyStepId: options.ignoredLoyaltyStepId,
        })
        const withSelection =
            options.selectedBenefitType !== undefined
                ? { ...cleared, selectedBenefitType: options.selectedBenefitType }
                : cleared
        recalculateTotals(withSelection)
        saveToLocalStorage()
    }

    const applyPercentagePromotion = (order: DraftOrder, promo: DailyPromotion): DraftOrder => {
        const eligibleIds =
            promo.discountScope === 'SpecificProducts'
                ? new Set((promo.discountProducts ?? []).map((p) => p.productId))
                : null
        const percentage = Math.max(0, Number(promo.discountPercentage ?? 0) || 0)

        const orderItems = order.orderItems.map((item) => {
            const eligible =
                item.isDailyPromotionGift !== true &&
                item.isLoyaltyGift !== true &&
                item.isDiscountCodeGift !== true &&
                (eligibleIds == null || eligibleIds.has(item.productId))

            if (!eligible) {
                return item.dailyPromotionDiscount
                    ? {
                        ...item,
                        dailyPromotionDiscount: 0,
                        dailyPromotionDiscountPercentage: null,
                        subtotal: lineSubtotal({ ...item, dailyPromotionDiscount: 0 }),
                    }
                    : item
            }

            const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice)
            const dailyPromotionDiscount = Math.round((gross * percentage) / 100)
            const next = {
                ...item,
                dailyPromotionDiscount,
                dailyPromotionDiscountPercentage: percentage,
            }
            return { ...next, subtotal: lineSubtotal(next) }
        })

        return {
            ...order,
            orderItems,
            appliedDailyPromotionId: promo.id,
            appliedDailyPromotionType: promo.type,
            appliedDailyPromotionGiftProductId: null,
            appliedDailyPromotionGiftProductName: null,
            appliedDailyPromotionDiscountPercentage: percentage,
            appliedDailyPromotionDiscountScope: promo.discountScope ?? null,
            appliedBenefitType: 'DailyPromotion',
            appliedBenefitSourceId: promo.id,
            appliedBenefitCode: null,
            appliedBenefitLabel: `Promocion del dia: ${percentage}% de descuento`,
            appliedBenefitRewardType: promo.type,
            appliedBenefitAmount: percentage,
            appliedBenefitSnapshot: JSON.stringify(promo),
            updatedAt: new Date(),
        }
    }

    const applyPromotionToOrder = (order: DraftOrder, promo: DailyPromotion): DraftOrder | null => {
        if (order.ignoredDailyPromotionId === promo.id) return null

        if (!promotionMinimumReached(order, promo)) return null
        const orderWithoutBenefit = clearBenefitEffectsFromOrder(order)

        if (promo.type === 'GiftProduct') {
            if (!promo.giftProductId) return null
            const alreadyHasGift = orderWithoutBenefit.orderItems.some(
                (item) => item.isDailyPromotionGift === true && item.productId === promo.giftProductId,
            )
            if (alreadyHasGift) {
                return {
                    ...orderWithoutBenefit,
                    appliedDailyPromotionId: promo.id,
                    appliedDailyPromotionType: promo.type,
                    appliedDailyPromotionGiftProductId: promo.giftProductId,
                    appliedDailyPromotionGiftProductName: promo.giftProductName ?? null,
                    appliedBenefitType: 'DailyPromotion',
                    appliedBenefitSourceId: promo.id,
                    appliedBenefitCode: null,
                    appliedBenefitLabel: `Promocion del dia: ${promo.giftProductName ?? 'producto gratis'} gratis`,
                    appliedBenefitRewardType: promo.type,
                    appliedBenefitAmount: null,
                    appliedBenefitSnapshot: JSON.stringify(promo),
                    updatedAt: new Date(),
                }
            }

            const giftItem = {
                tempId: `daily-promo-${promo.id}-${promo.giftProductId}`,
                productId: promo.giftProductId,
                productName: promo.giftProductName ?? 'Promocion del dia',
                productPrice: 0,
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                dailyPromotionDiscount: 0,
                dailyPromotionDiscountPercentage: null,
                loyaltyDiscount: 0,
                loyaltyDiscountPercentage: null,
                discountCodeDiscount: 0,
                discountCodeDiscountPercentage: null,
                freeDeliveryDiscount: 0,
                subtotal: 0,
                notes: 'Promocion del dia',
                isDailyPromotionGift: true,
                isLoyaltyGift: false,
                isDiscountCodeGift: false,
            }

            return {
                ...orderWithoutBenefit,
                orderItems: [...orderWithoutBenefit.orderItems, giftItem],
                appliedDailyPromotionId: promo.id,
                appliedDailyPromotionType: promo.type,
                appliedDailyPromotionGiftProductId: promo.giftProductId,
                appliedDailyPromotionGiftProductName: promo.giftProductName ?? null,
                appliedDailyPromotionDiscountPercentage: null,
                appliedDailyPromotionDiscountScope: null,
                appliedBenefitType: 'DailyPromotion',
                appliedBenefitSourceId: promo.id,
                appliedBenefitCode: null,
                appliedBenefitLabel: `Promocion del dia: ${promo.giftProductName ?? 'producto gratis'} gratis`,
                appliedBenefitRewardType: promo.type,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(promo),
                updatedAt: new Date(),
            }
        }

        if (promo.type === 'FreeDelivery') {
            return {
                ...orderWithoutBenefit,
                freeDeliveryRequested: true,
                appliedDailyPromotionId: promo.id,
                appliedDailyPromotionType: promo.type,
                appliedDailyPromotionGiftProductId: null,
                appliedDailyPromotionGiftProductName: null,
                appliedDailyPromotionDiscountPercentage: null,
                appliedDailyPromotionDiscountScope: null,
                appliedBenefitType: 'DailyPromotion',
                appliedBenefitSourceId: promo.id,
                appliedBenefitCode: null,
                appliedBenefitLabel: 'Promocion del dia: Domicilio gratis',
                appliedBenefitRewardType: promo.type,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(promo),
                updatedAt: new Date(),
            }
        }

        if (promo.type === 'PercentageDiscount') {
            return applyPercentagePromotion(orderWithoutBenefit, promo)
        }

        return null
    }

    const applyDailyPromotionBenefitToCurrentOrder = (promo: DailyPromotion, selectedBenefitType: DraftOrder['selectedBenefitType'] = 'DailyPromotion') => {
        if (!currentTabId.value) return false
        const order = draftOrders.value.get(currentTabId.value)
        if (!order || order.orderItems.filter((item) =>
            item.isDailyPromotionGift !== true &&
            item.isLoyaltyGift !== true &&
            item.isDiscountCodeGift !== true).length === 0) return false

        const updated = applyPromotionToOrder({ ...order, selectedBenefitType }, promo)
        if (!updated) {
            clearAppliedBenefitForCurrentOrder({ clearSelection: true })
            return false
        }

        recalculateTotals({ ...updated, selectedBenefitType })
        saveToLocalStorage()
        return true
    }

    const applyDailyPromotionToCurrentOrder = async () => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order || order.orderItems.filter((item) =>
            item.isDailyPromotionGift !== true &&
            item.isLoyaltyGift !== true &&
            item.isDiscountCodeGift !== true).length === 0) return

        const authStore = useAuthStore()
        const branchId = order.branchId || authStore.branchId
        if (!branchId) return

        const promoStore = useDailyPromotionStore()
        const promo = await promoStore.loadActive(branchId)
        if (!promo) return

        const current = draftOrders.value.get(order.tabId)
        if (!current) return
        applyDailyPromotionBenefitToCurrentOrder(promo, current.selectedBenefitType ?? null)
    }

    const applyLoyaltyPercentageBenefit = (order: DraftOrder, step: LoyaltyCycleStep): DraftOrder => {
        const percentage = Math.max(0, Number(step.discountPercentage ?? 0) || 0)
        const orderItems = order.orderItems.map((item) => {
            if (item.isDailyPromotionGift === true || item.isLoyaltyGift === true || item.isDiscountCodeGift === true) {
                return item
            }

            const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice)
            const loyaltyDiscount = Math.round((gross * percentage) / 100)
            const next = {
                ...item,
                loyaltyDiscount,
                loyaltyDiscountPercentage: percentage,
            }
            return { ...next, subtotal: lineSubtotal(next) }
        })

        return {
            ...order,
            orderItems,
            appliedLoyaltyStepId: step.id,
            appliedLoyaltyStepIndex: step.stepIndex,
            appliedLoyaltyRewardType: 'PercentageDiscount',
            appliedLoyaltyGiftProductId: null,
            appliedLoyaltyGiftProductName: null,
            appliedLoyaltyDiscountPercentage: percentage,
            appliedBenefitType: 'Loyalty',
            appliedBenefitSourceId: step.id,
            appliedBenefitCode: null,
            appliedBenefitLabel: step.rewardLabel || `Fidelizacion: ${percentage}% de descuento`,
            appliedBenefitRewardType: 'PercentageDiscount',
            appliedBenefitAmount: percentage,
            appliedBenefitSnapshot: JSON.stringify(step),
            updatedAt: new Date(),
        }
    }

    const applyLoyaltyBenefitToCurrentOrder = (step: LoyaltyCycleStep, selectedBenefitType: DraftOrder['selectedBenefitType'] = 'Loyalty') => {
        if (!currentTabId.value) return false
        const order = draftOrders.value.get(currentTabId.value)
        if (!order || order.orderItems.filter((item) =>
            item.isDailyPromotionGift !== true &&
            item.isLoyaltyGift !== true &&
            item.isDiscountCodeGift !== true).length === 0) return false
        if (order.ignoredLoyaltyStepId === step.id || step.isActive === false) return false

        const rewardType = step.rewardType ?? 'GiftProduct'
        const orderWithoutBenefit = clearBenefitEffectsFromOrder({ ...order, selectedBenefitType })
        let updated: DraftOrder | null = null

        if (rewardType === 'GiftProduct') {
            if (!step.giftProductId) return false
            const giftItem = {
                tempId: `loyalty-${step.id}-${step.giftProductId}`,
                productId: step.giftProductId,
                productName: step.giftProductName ?? step.rewardLabel ?? 'Premio de fidelizacion',
                productPrice: 0,
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                dailyPromotionDiscount: 0,
                dailyPromotionDiscountPercentage: null,
                loyaltyDiscount: 0,
                loyaltyDiscountPercentage: null,
                discountCodeDiscount: 0,
                discountCodeDiscountPercentage: null,
                freeDeliveryDiscount: 0,
                subtotal: 0,
                notes: 'Fidelizacion',
                isDailyPromotionGift: false,
                isLoyaltyGift: true,
                isDiscountCodeGift: false,
            }
            updated = {
                ...orderWithoutBenefit,
                orderItems: [...orderWithoutBenefit.orderItems, giftItem],
                appliedLoyaltyStepId: step.id,
                appliedLoyaltyStepIndex: step.stepIndex,
                appliedLoyaltyRewardType: rewardType,
                appliedLoyaltyGiftProductId: step.giftProductId,
                appliedLoyaltyGiftProductName: step.giftProductName ?? null,
                appliedLoyaltyDiscountPercentage: null,
                appliedBenefitType: 'Loyalty',
                appliedBenefitSourceId: step.id,
                appliedBenefitCode: null,
                appliedBenefitLabel: step.rewardLabel || `Fidelizacion: ${step.giftProductName ?? 'producto gratis'} gratis`,
                appliedBenefitRewardType: rewardType,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(step),
                updatedAt: new Date(),
            }
        } else if (rewardType === 'FreeDelivery') {
            updated = {
                ...orderWithoutBenefit,
                freeDeliveryRequested: true,
                appliedLoyaltyStepId: step.id,
                appliedLoyaltyStepIndex: step.stepIndex,
                appliedLoyaltyRewardType: rewardType,
                appliedLoyaltyGiftProductId: null,
                appliedLoyaltyGiftProductName: null,
                appliedLoyaltyDiscountPercentage: null,
                appliedBenefitType: 'Loyalty',
                appliedBenefitSourceId: step.id,
                appliedBenefitCode: null,
                appliedBenefitLabel: step.rewardLabel || 'Fidelizacion: Domicilio gratis',
                appliedBenefitRewardType: rewardType,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(step),
                updatedAt: new Date(),
            }
        } else if (rewardType === 'PercentageDiscount') {
            updated = applyLoyaltyPercentageBenefit(orderWithoutBenefit, step)
        }

        if (!updated) return false
        recalculateTotals({ ...updated, selectedBenefitType })
        saveToLocalStorage()
        return true
    }

    const discountCodeMinimumReached = (order: DraftOrder, code: DiscountCode) => {
        const minimum = Math.max(0, Number(code.minimumOrderValue ?? 0) || 0)
        if (minimum <= 0) return true
        return purchasedProductsGrossSubtotal(order) >= minimum
    }

    const discountCodeIsCurrentlyValid = (order: DraftOrder, code: DiscountCode) => {
        if (!code.isActive) return false
        const now = Date.now()
        const startsAt = new Date(code.startsAt).getTime()
        const endsAt = code.endsAt ? new Date(code.endsAt).getTime() : null
        if (Number.isFinite(startsAt) && startsAt > now) return false
        if (endsAt != null && Number.isFinite(endsAt) && endsAt <= now) return false
        return discountCodeMinimumReached(order, code)
    }

    const setCurrentOrderDiscountCodeInput = (value: string) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        draftOrders.value.set(currentTabId.value, {
            ...order,
            discountCodeInput: value,
            discountCodeError: null,
            updatedAt: new Date(),
        })
        saveToLocalStorage()
    }

    const setCurrentOrderActiveDiscountCode = (code: DiscountCode | null, errorMessage: string | null = null) => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        let next = clearBenefitEffectsFromOrder(order, { clearSelection: code == null })
        next = {
            ...next,
            activeDiscountCode: code,
            discountCodeInput: code?.code ?? order.discountCodeInput ?? null,
            discountCodeError: errorMessage,
            selectedBenefitType: null,
            updatedAt: new Date(),
        }
        recalculateTotals(next)
        saveToLocalStorage()
    }

    const clearCurrentOrderDiscountCode = () => {
        if (!currentTabId.value) return
        const order = draftOrders.value.get(currentTabId.value)
        if (!order) return
        let next = clearBenefitEffectsFromOrder(order, { clearSelection: true })
        next = {
            ...next,
            activeDiscountCode: null,
            discountCodeInput: '',
            discountCodeError: null,
            selectedBenefitType: null,
            updatedAt: new Date(),
        }
        recalculateTotals(next)
        saveToLocalStorage()
    }

    const applyDiscountCodePercentageBenefit = (order: DraftOrder, code: DiscountCode): DraftOrder => {
        const percentage = Math.max(0, Number(code.discountPercentage ?? 0) || 0)
        const orderItems = order.orderItems.map((item) => {
            if (item.isDailyPromotionGift === true || item.isLoyaltyGift === true || item.isDiscountCodeGift === true) {
                return item
            }

            const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice)
            const discountCodeDiscount = Math.round((gross * percentage) / 100)
            const next = {
                ...item,
                discountCodeDiscount,
                discountCodeDiscountPercentage: percentage,
            }
            return { ...next, subtotal: lineSubtotal(next) }
        })

        return {
            ...order,
            orderItems,
            appliedDiscountCodeId: code.id,
            appliedDiscountCodeCode: code.code,
            appliedDiscountCodeType: code.type,
            appliedDiscountCodeGiftProductId: null,
            appliedDiscountCodeGiftProductName: null,
            appliedDiscountCodeDiscountPercentage: percentage,
            appliedBenefitType: 'DiscountCode',
            appliedBenefitSourceId: code.id,
            appliedBenefitCode: code.code,
            appliedBenefitLabel: code.label || `Codigo ${code.code}: ${percentage}% de descuento`,
            appliedBenefitRewardType: code.type,
            appliedBenefitAmount: percentage,
            appliedBenefitSnapshot: JSON.stringify(code),
            updatedAt: new Date(),
        }
    }

    const applyDiscountCodeBenefitToCurrentOrder = (
        code: DiscountCode,
        selectedBenefitType: DraftOrder['selectedBenefitType'] = 'DiscountCode',
    ) => {
        if (!currentTabId.value) return false
        const order = draftOrders.value.get(currentTabId.value)
        if (!order || order.orderItems.filter((item) =>
            item.isDailyPromotionGift !== true &&
            item.isLoyaltyGift !== true &&
            item.isDiscountCodeGift !== true).length === 0) return false
        if (!discountCodeIsCurrentlyValid(order, code)) {
            setCurrentOrderActiveDiscountCode(null, 'El codigo ya no cumple las condiciones del pedido.')
            return false
        }

        const orderWithoutBenefit = clearBenefitEffectsFromOrder({
            ...order,
            activeDiscountCode: code,
            selectedBenefitType,
        })
        let updated: DraftOrder | null = null

        if (code.type === 'GiftProduct') {
            if (!code.giftProductId) return false
            const giftItem = {
                tempId: `discount-code-${code.id}-${code.giftProductId}`,
                productId: code.giftProductId,
                productName: code.giftProductName ?? code.label ?? 'Codigo promocional',
                productPrice: 0,
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                dailyPromotionDiscount: 0,
                dailyPromotionDiscountPercentage: null,
                loyaltyDiscount: 0,
                loyaltyDiscountPercentage: null,
                discountCodeDiscount: 0,
                discountCodeDiscountPercentage: null,
                freeDeliveryDiscount: 0,
                subtotal: 0,
                notes: `Codigo ${code.code}`,
                isDailyPromotionGift: false,
                isLoyaltyGift: false,
                isDiscountCodeGift: true,
            }
            updated = {
                ...orderWithoutBenefit,
                orderItems: [...orderWithoutBenefit.orderItems, giftItem],
                appliedDiscountCodeId: code.id,
                appliedDiscountCodeCode: code.code,
                appliedDiscountCodeType: code.type,
                appliedDiscountCodeGiftProductId: code.giftProductId,
                appliedDiscountCodeGiftProductName: code.giftProductName ?? null,
                appliedDiscountCodeDiscountPercentage: null,
                appliedBenefitType: 'DiscountCode',
                appliedBenefitSourceId: code.id,
                appliedBenefitCode: code.code,
                appliedBenefitLabel: code.label || `Codigo ${code.code}: producto gratis`,
                appliedBenefitRewardType: code.type,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(code),
                updatedAt: new Date(),
            }
        } else if (code.type === 'FreeDelivery') {
            updated = {
                ...orderWithoutBenefit,
                freeDeliveryRequested: true,
                appliedDiscountCodeId: code.id,
                appliedDiscountCodeCode: code.code,
                appliedDiscountCodeType: code.type,
                appliedDiscountCodeGiftProductId: null,
                appliedDiscountCodeGiftProductName: null,
                appliedDiscountCodeDiscountPercentage: null,
                appliedBenefitType: 'DiscountCode',
                appliedBenefitSourceId: code.id,
                appliedBenefitCode: code.code,
                appliedBenefitLabel: code.label || `Codigo ${code.code}: Domicilio gratis`,
                appliedBenefitRewardType: code.type,
                appliedBenefitAmount: null,
                appliedBenefitSnapshot: JSON.stringify(code),
                updatedAt: new Date(),
            }
        } else if (code.type === 'PercentageDiscount') {
            updated = applyDiscountCodePercentageBenefit(orderWithoutBenefit, code)
        }

        if (!updated) return false
        recalculateTotals({ ...updated, activeDiscountCode: code, selectedBenefitType })
        saveToLocalStorage()
        return true
    }

    const applyManualGiftBenefitToCurrentOrder = (product: Product, reason: string) => {
        const order = currentOrder.value
        if (!order || !reason.trim()) return false
        const base = clearBenefitEffectsFromOrder(order)
        const giftItem = {
            tempId: `manual-benefit-${Date.now()}-${product.id}`,
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            dailyPromotionDiscount: 0,
            loyaltyDiscount: 0,
            discountCodeDiscount: 0,
            freeDeliveryDiscount: 0,
            subtotal: 0,
            notes: `Regalo manual: ${reason.trim()}`,
            isManualBenefitGift: true,
        }
        recalculateTotals({
            ...base,
            orderItems: [...base.orderItems, giftItem],
            selectedBenefitType: 'Manual',
            appliedBenefitType: 'Manual',
            appliedBenefitLabel: `Regalo manual: ${product.name}`,
            appliedBenefitRewardType: 'GiftProduct',
            appliedBenefitSnapshot: JSON.stringify({ giftProductId: product.id, giftProductName: product.name }),
            manualBenefitReason: reason.trim(),
            manualBenefitGiftProductId: product.id,
            updatedAt: new Date(),
        })
        saveToLocalStorage()
        return true
    }

    const applyManualFreeDeliveryBenefitToCurrentOrder = (reason: string) => {
        const order = currentOrder.value
        if (!order || !reason.trim()) return false
        const eligible = order.type === 'delivery' || (order.type === 'reservation' && order.addressId != null)
        if (!eligible) return false
        const base = clearBenefitEffectsFromOrder(order)
        recalculateTotals({
            ...base,
            freeDeliveryRequested: true,
            selectedBenefitType: 'Manual',
            appliedBenefitType: 'Manual',
            appliedBenefitLabel: 'Regalo manual: Domicilio gratis',
            appliedBenefitRewardType: 'FreeDelivery',
            manualBenefitReason: reason.trim(),
            manualBenefitGiftProductId: null,
            updatedAt: new Date(),
        })
        saveToLocalStorage()
        return true
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
                branchId: order.branchId ?? null,
                source: order.source ?? null,
                whatsappConversationId: order.whatsappConversationId ?? null,
                prepareAt: order.prepareAt ?? null,
                isLater: order.isLater ?? false,
                paidInStoreCash: order.paidInStoreCash ?? false,
                paidInStoreCashAmount:
                    typeof order.paidInStoreCashAmount === 'number' ? order.paidInStoreCashAmount : null,
                appliedDailyPromotionId:
                    typeof order.appliedDailyPromotionId === 'number' ? order.appliedDailyPromotionId : null,
                appliedDailyPromotionType: order.appliedDailyPromotionType ?? null,
                appliedDailyPromotionGiftProductId:
                    typeof order.appliedDailyPromotionGiftProductId === 'number'
                        ? order.appliedDailyPromotionGiftProductId
                        : null,
                appliedDailyPromotionGiftProductName: order.appliedDailyPromotionGiftProductName ?? null,
                appliedDailyPromotionDiscountPercentage:
                    typeof order.appliedDailyPromotionDiscountPercentage === 'number'
                        ? order.appliedDailyPromotionDiscountPercentage
                        : null,
                appliedDailyPromotionDiscountScope: order.appliedDailyPromotionDiscountScope ?? null,
                ignoredDailyPromotionId:
                    typeof order.ignoredDailyPromotionId === 'number' ? order.ignoredDailyPromotionId : null,
                selectedBenefitType: order.selectedBenefitType ?? null,
                appliedBenefitType: order.appliedBenefitType ?? null,
                appliedBenefitSourceId:
                    typeof order.appliedBenefitSourceId === 'number' ? order.appliedBenefitSourceId : null,
                appliedBenefitCode: order.appliedBenefitCode ?? null,
                appliedBenefitLabel: order.appliedBenefitLabel ?? null,
                appliedBenefitRewardType: order.appliedBenefitRewardType ?? null,
                appliedBenefitAmount:
                    typeof order.appliedBenefitAmount === 'number' ? order.appliedBenefitAmount : null,
                appliedBenefitSnapshot: order.appliedBenefitSnapshot ?? null,
                appliedLoyaltyStepId:
                    typeof order.appliedLoyaltyStepId === 'number' ? order.appliedLoyaltyStepId : null,
                appliedLoyaltyStepIndex:
                    typeof order.appliedLoyaltyStepIndex === 'number' ? order.appliedLoyaltyStepIndex : null,
                appliedLoyaltyRewardType: order.appliedLoyaltyRewardType ?? null,
                appliedLoyaltyGiftProductId:
                    typeof order.appliedLoyaltyGiftProductId === 'number'
                        ? order.appliedLoyaltyGiftProductId
                        : null,
                appliedLoyaltyGiftProductName: order.appliedLoyaltyGiftProductName ?? null,
                appliedLoyaltyDiscountPercentage:
                    typeof order.appliedLoyaltyDiscountPercentage === 'number'
                        ? order.appliedLoyaltyDiscountPercentage
                        : null,
                ignoredLoyaltyStepId:
                    typeof order.ignoredLoyaltyStepId === 'number' ? order.ignoredLoyaltyStepId : null,
                discountCodeInput: order.discountCodeInput ?? '',
                activeDiscountCode: order.activeDiscountCode ?? null,
                discountCodeError: order.discountCodeError ?? null,
                appliedDiscountCodeId:
                    typeof order.appliedDiscountCodeId === 'number' ? order.appliedDiscountCodeId : null,
                appliedDiscountCodeCode: order.appliedDiscountCodeCode ?? null,
                appliedDiscountCodeType: order.appliedDiscountCodeType ?? null,
                appliedDiscountCodeGiftProductId:
                    typeof order.appliedDiscountCodeGiftProductId === 'number'
                        ? order.appliedDiscountCodeGiftProductId
                        : null,
                appliedDiscountCodeGiftProductName: order.appliedDiscountCodeGiftProductName ?? null,
                appliedDiscountCodeDiscountPercentage:
                    typeof order.appliedDiscountCodeDiscountPercentage === 'number'
                        ? order.appliedDiscountCodeDiscountPercentage
                        : null,
                freeDeliveryRequested: order.freeDeliveryRequested ?? false,
                orderItems: (order.orderItems ?? []).map((it: any) => {
                    const fd = typeof it.freeDeliveryDiscount === 'number' ? it.freeDeliveryDiscount : 0
                    const disc = typeof it.discount === 'number' ? it.discount : 0
                    const dp = typeof it.dailyPromotionDiscount === 'number' ? it.dailyPromotionDiscount : 0
                    const loyalty = typeof it.loyaltyDiscount === 'number' ? it.loyaltyDiscount : 0
                    const codeDiscount = typeof it.discountCodeDiscount === 'number' ? it.discountCodeDiscount : 0
                    const q = typeof it.quantity === 'number' ? it.quantity : 0
                    const up = typeof it.unitPrice === 'number' ? it.unitPrice : 0
                    return {
                        ...it,
                        discount: disc,
                        dailyPromotionDiscount: dp,
                        dailyPromotionDiscountPercentage:
                            typeof it.dailyPromotionDiscountPercentage === 'number'
                                ? it.dailyPromotionDiscountPercentage
                                : null,
                        isDailyPromotionGift: it.isDailyPromotionGift === true,
                        loyaltyDiscount: loyalty,
                        loyaltyDiscountPercentage:
                            typeof it.loyaltyDiscountPercentage === 'number'
                                ? it.loyaltyDiscountPercentage
                                : null,
                        isLoyaltyGift: it.isLoyaltyGift === true,
                        discountCodeDiscount: codeDiscount,
                        discountCodeDiscountPercentage:
                            typeof it.discountCodeDiscountPercentage === 'number'
                                ? it.discountCodeDiscountPercentage
                                : null,
                        isDiscountCodeGift: it.isDiscountCodeGift === true,
                        freeDeliveryDiscount: fd,
                        subtotal: Math.max(0, q * up - disc - dp - loyalty - codeDiscount - fd),
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

    /**
     * Tarifa de envío de la dirección elegida (cliente + addressId en memoria). 0 sin dirección o sin match.
     * Misma lógica que al elegir dirección en `updateAddress`.
     */
    const resolveDeliveryFeeFromSelectedAddress = (
        o: Pick<DraftOrder, 'customerId' | 'addressId'>,
    ): number => {
        if (o.customerId == null || o.addressId == null) return 0
        const c = customers.value.find((x) => x.id === o.customerId)
        const a = c?.addresses?.find((x) => x.id === o.addressId)
        return a ? (a.deliveryFee ?? 0) : 0
    }

    const createOrReuseWhatsAppDraft = (payload: {
        conversationId: number
        branchId: number
        customer: Customer
        address?: CustomerAddress | null
        draft: WhatsAppOrderDraft
    }): DraftOrder | null => {
        const existing = Array.from(draftOrders.value.values())
            .find((order) => order.whatsappConversationId === payload.conversationId)
        if (existing) {
            currentTabId.value = existing.tabId
            saveToLocalStorage()
            return existing
        }

        if (draftOrders.value.size >= maxTabs.value) {
            error.value = `Solo puedes tener ${maxTabs.value} pedidos abiertos.`
            return null
        }

        const authStore = useAuthStore()
        const tabId = `tab-${Date.now()}-${nextTabNumber.value}`
        const tabName = `WhatsApp ${nextTabNumber.value}`
        const deliveryFee = payload.draft.orderType === 'delivery' ? payload.draft.deliveryFee : 0
        const orderItems = payload.draft.items.map((item) => ({
            tempId: `whatsapp-${payload.conversationId}-${item.productId}`,
            productId: item.productId,
            productName: item.name,
            productPrice: item.unitPrice,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            freeDeliveryDiscount: 0,
            subtotal: item.subtotal,
            notes: item.notes ?? '',
        }))
        const newOrder: DraftOrder = {
            tabId,
            tabName,
            branchId: payload.branchId || authStore.branchId || null,
            source: 'WhatsApp',
            whatsappConversationId: payload.conversationId,
            type: payload.draft.orderType ?? 'onsite',
            customerId: payload.customer.id,
            customerName: payload.customer.name,
            customerPhone: payload.customer.phone1,
            guestName: payload.customer.name,
            addressId: payload.address?.id ?? null,
            addressDescription: payload.address?.address ?? null,
            addressAdditionalInfo: payload.address?.additionalInfo ?? null,
            deliveryFee,
            freeDeliveryRequested: false,
            reservedFor: null,
            prepareAt: null,
            isLater: false,
            notes: '',
            orderItems,
            bankPayments: [],
            appPayment: null,
            subtotal: payload.draft.subtotal,
            total: payload.draft.total,
            discountTotal: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            paidInStoreCash: false,
            paidInStoreCashAmount: null,
            selectedBenefitType: null,
            appliedBenefitType: null,
            appliedBenefitSourceId: null,
            appliedBenefitCode: null,
            appliedBenefitLabel: null,
            appliedBenefitRewardType: null,
            appliedBenefitAmount: null,
            appliedBenefitSnapshot: null,
            appliedDailyPromotionId: null,
            appliedDailyPromotionType: null,
            appliedDailyPromotionGiftProductId: null,
            appliedDailyPromotionGiftProductName: null,
            appliedDailyPromotionDiscountPercentage: null,
            appliedDailyPromotionDiscountScope: null,
            ignoredDailyPromotionId: null,
            appliedLoyaltyStepId: null,
            appliedLoyaltyStepIndex: null,
            appliedLoyaltyRewardType: null,
            appliedLoyaltyGiftProductId: null,
            appliedLoyaltyGiftProductName: null,
            appliedLoyaltyDiscountPercentage: null,
            ignoredLoyaltyStepId: null,
            discountCodeInput: '',
            activeDiscountCode: null,
            discountCodeError: null,
            appliedDiscountCodeId: null,
            appliedDiscountCodeCode: null,
            appliedDiscountCodeType: null,
            appliedDiscountCodeGiftProductId: null,
            appliedDiscountCodeGiftProductName: null,
            appliedDiscountCodeDiscountPercentage: null,
        }

        const customerWithAddress = {
            ...payload.customer,
            addresses: payload.customer.addresses?.length || !payload.address
                ? payload.customer.addresses
                : [payload.address],
        }
        ensureCustomerInList(customerWithAddress)
        if (payload.address) addAddressToCustomer(payload.customer.id, payload.address, customerWithAddress)
        draftOrders.value.set(tabId, newOrder)
        currentTabId.value = tabId
        nextTabNumber.value++
        saveToLocalStorage()
        return newOrder
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
        replaceCustomerAddresses,
        ensureCustomerInList,
        updateOrderNotes,
        updateGuestName,
        updateIsLater,
        updateReservedFor,
        updatePrepareAt,
        updatePaidInStoreCash,
        updateDeliveryFee,
        updateFreeDeliveryRequested,
        setCurrentOrderSelectedBenefit,
        clearAppliedBenefitForCurrentOrder,
        setCurrentOrderDiscountCodeInput,
        setCurrentOrderActiveDiscountCode,
        clearCurrentOrderDiscountCode,
        applyDailyPromotionBenefitToCurrentOrder,
        applyDailyPromotionToCurrentOrder,
        applyLoyaltyBenefitToCurrentOrder,
        applyDiscountCodeBenefitToCurrentOrder,
        applyManualGiftBenefitToCurrentOrder,
        applyManualFreeDeliveryBenefitToCurrentOrder,
        resolveDeliveryFeeFromSelectedAddress,
        createOrReuseWhatsAppDraft,
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

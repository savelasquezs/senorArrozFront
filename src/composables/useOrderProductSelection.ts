import { computed, ref, type Ref } from 'vue'
import type { OrderItem, OrderProductAddition, Product } from '@/types/order'
import { createOrderItem, orderItemSubtotal } from '@/helpers/orderItem'
import { discountAmountFromPercentage, discountPercentageFromAmount } from '@/helpers/orderProductDiscount'

export function useOrderProductSelection(products: Ref<Product[]>, existingProductIds: Ref<number[]>) {
    const items = ref<OrderItem[]>([])
    const notice = ref('')
    const productById = computed(() => new Map(products.value.map(product => [product.id, product])))
    const errors = computed(() => items.value.flatMap(item => {
        const product = productById.value.get(item.productId)
        if (!product?.active || product.availabilityPending) return [`Confirma la disponibilidad de ${item.productName}.`]
        if (existingProductIds.value.includes(item.productId)) return [`${item.productName} ya está en el pedido. Modifica su cantidad desde el detalle.`]
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) return ['La cantidad debe ser un entero entre 1 y 999.']
        if (product.stock != null && item.quantity > product.stock) return [`Stock insuficiente de ${item.productName}: disponible ${Math.max(0, product.stock)}.`]
        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) return ['El precio debe ser un número mayor o igual a cero.']
        if (!Number.isFinite(item.discount) || item.discount < 0 || item.discount > item.quantity * item.unitPrice) return ['El descuento no puede superar el valor del producto.']
        return []
    }))
    const total = computed(() => items.value.reduce((sum, item) => sum + orderItemSubtotal(item), 0))
    const units = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))

    function add(product: Product) {
        notice.value = ''
        const current = productById.value.get(product.id)
        if (!current?.active || current.availabilityPending || existingProductIds.value.includes(product.id)) return
        const item = items.value.find(item => item.productId === product.id)
        const quantity = (item?.quantity ?? 0) + 1
        if (quantity > 999 || current.stock != null && quantity > current.stock) {
            notice.value = `No hay disponibilidad para agregar más unidades de ${current.name}.`
            return
        }
        if (item) updateQuantity(item.tempId, quantity)
        else items.value.push(createOrderItem(current))
    }

    function updateQuantity(id: string, quantity: number) {
        const item = items.value.find(item => item.tempId === id)
        if (!item) return
        const percentage = discountPercentageFromAmount(item.quantity * item.unitPrice, item.discount)
        item.quantity = Number(quantity)
        item.discount = discountAmountFromPercentage(item.quantity * item.unitPrice, percentage)
        item.subtotal = orderItemSubtotal(item)
    }

    function updatePrice(id: string, price: number) {
        const item = items.value.find(item => item.tempId === id)
        if (!item) return
        const percentage = discountPercentageFromAmount(item.quantity * item.unitPrice, item.discount)
        item.unitPrice = Number(price)
        item.discount = discountAmountFromPercentage(item.quantity * item.unitPrice, percentage)
        item.subtotal = orderItemSubtotal(item)
    }

    function updateDiscount(id: string, discount: number) {
        const item = items.value.find(item => item.tempId === id)
        if (!item) return
        item.discount = discount
        item.subtotal = orderItemSubtotal(item)
    }

    function remove(id: string) { items.value = items.value.filter(item => item.tempId !== id); notice.value = '' }
    function reset() { items.value = []; notice.value = '' }
    function additions(): OrderProductAddition[] {
        if (errors.value.length) return []
        return items.value.map(item => ({
            id: 0, productId: item.productId, productName: item.productName,
            productDescription: productById.value.get(item.productId)?.categoryName ?? null,
            quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, notes: item.notes,
        }))
    }

    return { items, notice, errors, total, units, add, updateQuantity, updatePrice, updateDiscount, remove, reset, additions }
}

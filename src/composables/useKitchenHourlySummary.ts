import type { OrderDetailItem, OrderListItem } from '@/types/order'
import { formatKitchenProductDisplayName } from '@/composables/useKitchenProductDisplayName'
import { sortProductsByPortionOrder } from '@/config/orderPosCategories'
import { defaultBusinessCalendar } from '@/utils/datetime'

const ACTIVE_SUMMARY_STATUSES = new Set(['taken', 'in_preparation'])
const NO_CATEGORY_LABEL = 'Sin categoría'
const NO_PRODUCT_LABEL = 'Sin producto'

export interface KitchenHourlySummaryLine {
    name: string
    quantity: number
}

export interface KitchenHourlySummaryCategoryCard {
    key: string
    title: string
    totalQuantity: number
    lines: KitchenHourlySummaryLine[]
}

export interface KitchenHourlySummaryHourSlot {
    key: string
    hour: number
    label: string
    orderCount: number
}

export interface KitchenHourlySummaryResult {
    hourSlots: KitchenHourlySummaryHourSlot[]
    groupedByHour: Record<string, KitchenHourlySummaryCategoryCard[]>
    defaultHourKey: string
    totalOrderCount: number
}

type KitchenSummaryCategoryAccumulator = Map<
    string,
    { title: string; lines: Map<string, number>; totalQuantity: number }
>

function getBusinessDateKey(instant: string | null | undefined): string | null {
    if (!instant) return null
    const date = new Date(instant)
    if (Number.isNaN(date.getTime())) return null
    return defaultBusinessCalendar.formatYmd(date)
}

function getBusinessHour(instant: Date | string): number | null {
    const hhmm = defaultBusinessCalendar.formatTime(instant)
    const hour = Number.parseInt(hhmm.slice(0, 2), 10)
    return Number.isNaN(hour) ? null : hour
}

function formatHourLabel(hour: number): string {
    const normalizedHour = ((hour % 24) + 24) % 24
    const suffix = normalizedHour < 12 ? 'am' : 'pm'
    const displayHour = normalizedHour % 12 || 12
    return `${displayHour} ${suffix}`
}

function hourKeyFromHour(hour: number): string {
    return String(hour).padStart(2, '0')
}

function orderMatchesSelectedDate(order: OrderListItem, selectedDate: string): boolean {
    const anchor = order.prepareAt || order.createdAt
    return getBusinessDateKey(anchor) === selectedDate
}

function getOrderHourKey(order: OrderListItem, now: Date): string | null {
    const hour = order.prepareAt ? getBusinessHour(order.prepareAt) : getBusinessHour(now)
    return hour == null ? null : hourKeyFromHour(hour)
}

function getCategoryTitle(categoryName: string | null | undefined): string {
    const normalized = categoryName?.trim()
    if (!normalized) return NO_CATEGORY_LABEL
    return formatKitchenProductDisplayName(normalized) || normalized
}

function getProductLineName(productName: string | null | undefined): string {
    const normalized = productName?.trim()
    if (!normalized) return NO_PRODUCT_LABEL
    return formatKitchenProductDisplayName(normalized) || normalized
}

function sortCategoryCards(cards: KitchenHourlySummaryCategoryCard[]): KitchenHourlySummaryCategoryCard[] {
    return [...cards].sort((a, b) => {
        if (a.title === NO_CATEGORY_LABEL && b.title !== NO_CATEGORY_LABEL) return 1
        if (b.title === NO_CATEGORY_LABEL && a.title !== NO_CATEGORY_LABEL) return -1
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
    })
}

function createCategoryAccumulator(): KitchenSummaryCategoryAccumulator {
    return new Map()
}

function getSummaryEligibleOrders(orders: OrderListItem[], selectedDate: string): OrderListItem[] {
    return orders.filter(
        (order) => ACTIVE_SUMMARY_STATUSES.has(order.status) && orderMatchesSelectedDate(order, selectedDate),
    )
}

function accumulateOrderItems(
    categories: KitchenSummaryCategoryAccumulator,
    orderItems: OrderDetailItem[],
): void {
    for (const item of orderItems) {
        const categoryKey = (item.productCategoryName?.trim() || NO_CATEGORY_LABEL).toLocaleLowerCase('es')
        const categoryTitle = getCategoryTitle(item.productCategoryName)
        const lineName = getProductLineName(item.productName)

        if (!categories.has(categoryKey)) {
            categories.set(categoryKey, {
                title: categoryTitle,
                lines: new Map(),
                totalQuantity: 0,
            })
        }

        const category = categories.get(categoryKey)!
        category.lines.set(lineName, (category.lines.get(lineName) ?? 0) + item.quantity)
        category.totalQuantity += item.quantity
    }
}

function buildCategoryCards(
    categories: KitchenSummaryCategoryAccumulator,
): KitchenHourlySummaryCategoryCard[] {
    const cards = [...categories.entries()].map(([categoryKey, category]) => ({
        key: categoryKey,
        title: category.title,
        totalQuantity: category.totalQuantity,
        lines: sortProductsByPortionOrder(
            [...category.lines.entries()].map(([name, quantity]) => ({ name, quantity })),
        ),
    }))

    return sortCategoryCards(cards)
}

export function buildKitchenDailyCategorySummary(
    orders: OrderListItem[],
    orderItemsMap: Map<number, OrderDetailItem[]>,
    selectedDate: string,
): KitchenHourlySummaryCategoryCard[] {
    const categories = createCategoryAccumulator()

    for (const order of getSummaryEligibleOrders(orders, selectedDate)) {
        accumulateOrderItems(categories, orderItemsMap.get(order.id) ?? [])
    }

    return buildCategoryCards(categories)
}

export function buildKitchenHourlySummary(
    orders: OrderListItem[],
    orderItemsMap: Map<number, OrderDetailItem[]>,
    selectedDate: string,
    now: Date = new Date(),
): KitchenHourlySummaryResult {
    const perHourCategories = new Map<string, KitchenSummaryCategoryAccumulator>()
    const hourOrderCount = new Map<string, number>()
    const currentHourKey = hourKeyFromHour(getBusinessHour(now) ?? 0)

    for (const order of getSummaryEligibleOrders(orders, selectedDate)) {
        const hourKey = getOrderHourKey(order, now)
        if (!hourKey) continue

        hourOrderCount.set(hourKey, (hourOrderCount.get(hourKey) ?? 0) + 1)

        if (!perHourCategories.has(hourKey)) {
            perHourCategories.set(hourKey, createCategoryAccumulator())
        }
        const categoriesForHour = perHourCategories.get(hourKey)!
        accumulateOrderItems(categoriesForHour, orderItemsMap.get(order.id) ?? [])
    }

    const hourSlots = [...hourOrderCount.entries()]
        .map(([key, orderCount]) => {
            const hour = Number.parseInt(key, 10)
            return {
                key,
                hour,
                label: formatHourLabel(hour),
                orderCount,
            }
        })
        .sort((a, b) => a.hour - b.hour)

    const groupedByHour = Object.fromEntries(
        [...perHourCategories.entries()].map(([hourKey, categories]) => {
            return [hourKey, buildCategoryCards(categories)]
        }),
    ) as Record<string, KitchenHourlySummaryCategoryCard[]>

    const defaultHourKey = hourSlots.some((slot) => slot.key === currentHourKey)
        ? currentHourKey
        : (hourSlots[0]?.key ?? '')

    return {
        hourSlots,
        groupedByHour,
        defaultHourKey,
        totalOrderCount: [...hourOrderCount.values()].reduce((sum, count) => sum + count, 0),
    }
}

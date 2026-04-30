import type { OrderListItem, OrderStatus } from '@/types/order'

/**
 * Aplica "marcar listo" en cocina: si el pedido está en Tomado, encadena
 * in_preparation → listo; si ya está en Preparación, solo listo.
 * getStatus se consulta al inicio de cada id (y tras in_preparation el store debería reflejarlo).
 */
export async function applyMarkReadySequence(
    orderIds: number[],
    getStatus: (id: number) => OrderListItem['status'] | undefined,
    updateStatus: (id: number, status: OrderStatus) => Promise<unknown>
): Promise<void> {
    for (const id of orderIds) {
        let s = getStatus(id)
        if (s === 'taken') {
            await updateStatus(id, 'in_preparation')
            s = 'in_preparation'
        }
        if (s === 'in_preparation') {
            await updateStatus(id, 'ready')
        }
    }
}

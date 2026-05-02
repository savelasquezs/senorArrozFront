/** Payload camelCase desde SignalR (OrderModified.kitchenChanges). */
export interface KitchenOrderModificationSummary {
    addedLines?: Array<{ productName: string; quantity: number }>
    removedLines?: Array<{ productName: string }>
    quantityChanges?: Array<{ productName: string; previousQuantity: number; newQuantity: number }>
    productReplacements?: Array<{ previousProductName: string; newProductName: string }>
    scheduleChanged?: boolean
    notesChanged?: boolean
    scheduleChangeKind?: 'reservation' | 'prepare_now' | 'updated'
}

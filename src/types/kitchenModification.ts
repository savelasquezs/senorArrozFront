/** Payload camelCase desde SignalR (OrderModified.kitchenChanges). */
export interface KitchenOrderModificationSummary {
    addedLines?: Array<{ productName: string; quantity: number; notes?: string | null }>
    removedLines?: Array<{ productName: string }>
    quantityChanges?: Array<{ productName: string; previousQuantity: number; newQuantity: number }>
    productReplacements?: Array<{ previousProductName: string; newProductName: string; newQuantity?: number; newNotes?: string | null }>
    lineNoteChanges?: Array<{ productName: string; quantity: number; previousNotes?: string | null; notes?: string | null }>
    scheduleChanged?: boolean
    notesChanged?: boolean
    scheduleChangeKind?: 'reservation' | 'prepare_now' | 'updated'
}

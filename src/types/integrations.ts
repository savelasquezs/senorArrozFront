export interface RappiConnection {
  id: number; branchId: number; provider: 'rappi'; environment: string; displayName: string
  clientId: string; clientSecretConfigured: boolean; externalStoreId: string; financialAppId: number
  financialAppName?: string; defaultCookingTimeMinutes: number; isActive: boolean; isVerified: boolean
  webhookConfigured: boolean; lastVerifiedAt?: string; lastCatalogSyncAt?: string; lastError?: string
  mappingComplete: boolean; ready: boolean; mappedCount: number; mappingCount: number; webhookUrl: string
}
export interface DeliveryProviderCard { key: string; name: string; available: boolean; connection?: RappiConnection | null }
export interface RappiMapping { id: number; externalProductId: string; externalSku: string; externalName: string; itemType: string; isActive: boolean; productId?: number; productName?: string }
export interface RappiMappings { mappings: RappiMapping[]; products: Array<{ id: number; name: string }>; complete: boolean }
export interface RappiOrderLine { externalProductId: string; sku: string; name: string; itemType: string; quantity: number; unitPrice: number; notes?: string }
export interface RappiExternalOrder { id: number; externalOrderId: string; status: string; customerName: string; customerPhone?: string; deliveryAddress?: string; deliveryMethod: string; paymentMethod: string; total: number; cookingTimeMinutes: number; lines: RappiOrderLine[]; internalOrderId?: number; lastError?: string; createdAt: string }
export interface UpsertRappiConnection { displayName: string; environment: string; clientId: string; clientSecret?: string; externalStoreId: string; financialAppId: number; defaultCookingTimeMinutes: number; isActive: boolean }

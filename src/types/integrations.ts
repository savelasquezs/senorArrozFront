export interface RappiStore {
  id: number
  rappiStoreId: string
  storeIntegrationId?: string
  name: string
  isParent: boolean
  manualReadyForPickupEnabled: boolean
  connectivityEnabled: boolean
  lastPingAt?: string
  lastConnectivityAt?: string
  lastError?: string
}

export interface RappiWebhookSubscription {
  eventType: string
  active: boolean
  lastReceivedAt?: string
  lastError?: string
}

export interface RappiConnection {
  id: number
  branchId: number
  provider: 'rappi'
  environment: string
  displayName: string
  credentialsConfigured: boolean
  financialAppId: number
  financialAppName?: string
  customerId: number
  customerName?: string
  technicalUserId?: number
  technicalUserName?: string
  defaultCookingTimeMinutes: number
  estimatedCommissionRate: number
  isActive: boolean
  isVerified: boolean
  webhookConfigured: boolean
  menuApproved: boolean
  catalogDirty: boolean
  storeIdsComplete: boolean
  ready: boolean
  lastVerifiedAt?: string
  lastMenuPublishedAt?: string
  lastAvailabilitySyncAt?: string
  lastWebhookAt?: string
  lastError?: string
  stores: RappiStore[]
  subscriptions: RappiWebhookSubscription[]
  selectedProductCount: number
  publishedProductCount: number
  webhookBaseUrl: string
}

export interface DeliveryProviderCard {
  key: string
  name: string
  available: boolean
  connection?: RappiConnection | null
}

export interface RappiCatalogProduct {
  id: number
  name: string
  price: number
  active: boolean
  stock: number
  categoryName: string
  sku: string
  categorySku: string
  isSelected: boolean
  overrideName?: string
  overrideDescription?: string
  overrideImageUrl?: string
  overridePrice?: number
  publishedName?: string
  publishedDescription?: string
  publishedImageUrl?: string
  publishedPrice?: number
  publishedAt?: string
  effectiveName: string
  effectiveDescription?: string
  effectiveImageUrl?: string
  effectivePrice: number
}

export interface RappiCatalog {
  products: RappiCatalogProduct[]
  selectedCount: number
  publishedCount: number
}

export interface RappiMenuCategory {
  id: string
  min: number
  max: number
  name: string
  position: number
}

export interface RappiMenuItem {
  category: RappiMenuCategory
  toppings: unknown[]
  name: string
  description?: string
  price: number
  sku: string
  position: number
  type: string
  imageUrl?: string
}

export interface RappiMenuPreview {
  storeId: string
  items: RappiMenuItem[]
}

export interface RappiOrderLine {
  externalProductId?: string
  sku: string
  name: string
  itemType?: string
  quantity: number
  unitPrice: number
  total?: number
  notes?: string
  subitems?: RappiOrderLine[]
}

export interface RappiDiscount {
  title?: string
  description?: string
  type?: string
  value: number
  amountByPartner?: number
  amountByRappi?: number
}

export interface RappiExternalOrder {
  id: number
  externalOrderId: string
  status: string
  storeName?: string
  customerName: string
  customerPhone?: string
  deliveryAddress?: string
  deliveryMethod: string
  paymentMethod: string
  total: number
  totalProducts: number
  totalDiscounts: number
  totalDiscountByPartner: number
  totalDiscountByRappi: number
  totalCharges: number
  cookingTimeMinutes: number
  lines: RappiOrderLine[]
  discounts: RappiDiscount[]
  validationErrors: string[]
  internalOrderId?: number
  lastError?: string
  acceptedAt?: string
  piiPurgedAt?: string
  createdAt: string
}

export interface UpsertRappiStore {
  rappiStoreId: string
  storeIntegrationId: string
  name: string
  isParent: boolean
  manualReadyForPickupEnabled: boolean
}

export interface UpsertRappiConnection {
  displayName: string
  financialAppId: number
  customerId: number
  technicalUserId?: number
  defaultCookingTimeMinutes: number
  estimatedCommissionRate: number
  isActive: boolean
  stores: UpsertRappiStore[]
}

export interface UpdateRappiCatalogProduct {
  isSelected: boolean
  overrideName?: string
  overrideDescription?: string
  overrideImageUrl?: string
  overridePrice?: number
}

export interface WompiEnvironmentConfiguration {
  publicKey?: string | null
  integritySecretConfigured: boolean
  eventsSecretConfigured: boolean
  lastWebhookAt?: string | null
}

export interface WompiPaymentIntegration {
  id: number
  branchId: number
  financialAppId: number
  financialAppName?: string | null
  activeEnvironment: 'sandbox' | 'production'
  isEnabled: boolean
  estimatedCommissionRate: number
  sandbox: WompiEnvironmentConfiguration
  production: WompiEnvironmentConfiguration
  lastTestedAt?: string | null
  lastError?: string | null
}

export interface WompiFinancialApp {
  id: number
  name: string
  bankName: string
}

export interface WompiIntegrationSettings {
  integration: WompiPaymentIntegration | null
  financialApps: WompiFinancialApp[]
}

export interface UpsertWompiPaymentIntegration {
  financialAppId: number
  activeEnvironment: 'sandbox' | 'production'
  isEnabled: boolean
  estimatedCommissionRate: number
  sandbox: WompiEnvironmentCredentials
  production: WompiEnvironmentCredentials
}

export interface WompiEnvironmentCredentials {
  publicKey?: string
  integritySecret?: string
  eventsSecret?: string
}

export interface WompiPaymentReview {
  id: number
  orderId: number
  reference: string
  amount: number
  manualReviewReason?: string | null
  approvedAt?: string | null
  expiresAt: string
  createdAt: string
  canApprove: boolean
}

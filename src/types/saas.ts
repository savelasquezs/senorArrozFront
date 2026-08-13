export interface PlatformUser { id: number; name: string; email: string }
export interface TenantUsage { orders: number; storageBytes: number; aiInputTokens: number; aiOutputTokens: number; aiEstimatedCostUsd: number }
export interface PlanVersion { id: number; versionNumber: number; status: string; currency: string; monthlyPrice: number | null; annualPrice: number | null; branchLimit: number | null; userLimit: number | null; modules: string[]; publishedAt: string | null; createdAt: string }
export interface Plan { id: number; code: string; name: string; description: string; active: boolean; versions: PlanVersion[] }
export interface CatalogItem { id: number; code: string; name: string; description: string; category: string; active: boolean; displayOrder: number }
export interface TenantListItem { id: number; publicId: string; name: string; slug: string; status: string; contactEmail: string; planName: string; branchCount: number; userCount: number; createdAt: string }
export interface TenantDetail extends TenantListItem { contactName: string; contactPhone?: string; legalName?: string; taxId?: string; billingAddress?: string; statusReason?: string; plan: PlanVersion; addons: string[]; branches: Array<{ id: number; name: string; address: string; active: boolean }>; users: Array<{ id: number; name: string; email: string; role: string; active: boolean }>; usage: TenantUsage; updatedAt: string }
export interface TenantContext { tenantId: number; publicId: string; name: string; slug: string; status: string; planCode: string; planName: string; planVersion: number; branchLimit: number | null; userLimit: number | null; branchCount: number; userCount: number; modules: string[]; addons: string[]; usage: TenantUsage }
export interface TrustedDevice { publicId: string; name: string; userAgent: string; ipAddress: string; lastUsedAt: string; expiresAt: string }
export interface AuditEntry { id: number; actor: string; action: string; entityType: string; entityId: string; beforeJson: string; afterJson: string; ipAddress: string; correlationId: string; createdAt: string }

export interface CreateTenantPayload {
  name: string; slug: string; contactName: string; contactEmail: string; contactPhone?: string; legalName?: string; taxId?: string; billingAddress?: string;
  planVersionId: number; branchName: string; branchAddress: string; branchPhone: string; adminName: string; adminEmail: string; adminPhone: string; addons: string[];
}

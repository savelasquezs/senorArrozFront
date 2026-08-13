import axios from 'axios'
import type { AuditEntry, CatalogItem, CreateTenantPayload, Plan, PlanVersion, PlatformUser, TenantContext, TenantDetail, TenantListItem, TrustedDevice } from '@/types/saas'
import { getAccessToken } from '@/services/auth/authSession'

const csrfKey = 'sa_platform_csrf'
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api', withCredentials: true, timeout: 15000 })
client.interceptors.request.use(config => {
  const csrf = sessionStorage.getItem(csrfKey) || readCookie(csrfKey)
  if (csrf && config.method && !['get', 'head', 'options'].includes(config.method)) config.headers['X-Platform-CSRF'] = csrf
  return config
})
client.interceptors.response.use(response => response, error => {
  const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Error de plataforma'
  return Promise.reject(new Error(message))
})

function saveCsrf(value?: string | null) { if (value) sessionStorage.setItem(csrfKey, value) }
function readCookie(name: string) { return document.cookie.split('; ').find(value => value.startsWith(`${name}=`))?.split('=').slice(1).join('=') || '' }

export const platformApi = {
  async login(payload: { email: string; password: string; deviceName?: string }) { const { data } = await client.post('/platform/auth/login', payload); saveCsrf(data.csrfToken); return data as { otpRequired: boolean; challengeId?: string; challengeExpiresAt?: string; user?: PlatformUser } },
  async verifyOtp(payload: { challengeId: string; code: string; deviceName?: string }) { const { data } = await client.post('/platform/auth/otp', payload); saveCsrf(data.csrfToken); return data.user as PlatformUser },
  async session() { const { data } = await client.get('/platform/auth/session'); return data as PlatformUser },
  async logout() { await client.post('/platform/auth/logout'); sessionStorage.removeItem(csrfKey) },
  async devices() { const { data } = await client.get('/platform/auth/devices'); return data as TrustedDevice[] },
  async revokeDevice(id: string) { await client.delete(`/platform/auth/devices/${id}`) },
  async tenants(search = '', status = '') { const { data } = await client.get('/platform/tenants', { params: { search: search || undefined, status: status || undefined } }); return data as TenantListItem[] },
  async tenant(id: number) { const { data } = await client.get(`/platform/tenants/${id}`); return data as TenantDetail },
  async createTenant(payload: CreateTenantPayload) { const { data } = await client.post('/platform/tenants', payload); return data as TenantDetail },
  async changeStatus(id: number, status: string, reason?: string) { const { data } = await client.put(`/platform/tenants/${id}/status`, { status, reason }); return data as TenantDetail },
  async changeSubscription(id: number, planVersionId: number) { const { data } = await client.put(`/platform/tenants/${id}/subscription`, { planVersionId }); return data as TenantDetail },
  async setAddon(id: number, code: string, active: boolean) { const { data } = await client.put(`/platform/tenants/${id}/addons/${code}`, { active }); return data as TenantDetail },
  async resendInvitation(id: number) { await client.post(`/platform/tenants/${id}/invitation`) },
  async plans() { const { data } = await client.get('/platform/plans'); return data as Plan[] },
  async createPlan(payload: { code: string; name: string; description: string }) { const { data } = await client.post('/platform/plans', payload); return data as Plan },
  async createVersion(planId: number, payload: Partial<PlanVersion>) { const { data } = await client.post(`/platform/plans/${planId}/versions`, payload); return data as PlanVersion },
  async updateVersion(versionId: number, payload: Partial<PlanVersion>) { const { data } = await client.put(`/platform/plans/versions/${versionId}`, payload); return data as PlanVersion },
  async publishVersion(versionId: number) { const { data } = await client.post(`/platform/plans/versions/${versionId}/publish`); return data as PlanVersion },
  async retireVersion(versionId: number) { const { data } = await client.post(`/platform/plans/versions/${versionId}/retire`); return data as PlanVersion },
  async modules() { const { data } = await client.get('/platform/modules'); return data as CatalogItem[] },
  async addons() { const { data } = await client.get('/platform/addons'); return data as CatalogItem[] },
  async createModule(payload: Omit<CatalogItem, 'id'>) { const { data } = await client.post('/platform/modules', payload); return data as CatalogItem },
  async updateModule(id: number, payload: Omit<CatalogItem, 'id'>) { const { data } = await client.put(`/platform/modules/${id}`, payload); return data as CatalogItem },
  async createAddon(payload: Omit<CatalogItem, 'id'>) { const { data } = await client.post('/platform/addons', payload); return data as CatalogItem },
  async updateAddon(id: number, payload: Omit<CatalogItem, 'id'>) { const { data } = await client.put(`/platform/addons/${id}`, payload); return data as CatalogItem },
  async settings() { const { data } = await client.get('/platform/settings'); return data as Record<string, string> },
  async updateSettings(payload: Record<string, string>) { const { data } = await client.put('/platform/settings', payload); return data as Record<string, string> },
  async audit(page = 1) { const { data } = await client.get('/platform/audit', { params: { page, pageSize: 100 } }); return data as AuditEntry[] },
  async acceptInvitation(payload: { invitationId: string; token: string; password: string }) { await client.post('/tenant-invitations/accept', payload) },
}

export const tenantContextApi = {
  async get() { const { data } = await client.get('/tenant/context', { withCredentials: false, headers: { Authorization: `Bearer ${getAccessToken() || ''}` } }); return data as TenantContext },
}

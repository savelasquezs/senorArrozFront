import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { platformApi } from '@/services/platformApi'
import type { PlatformUser } from '@/types/saas'

export const usePlatformStore = defineStore('platform', () => {
  const user = ref<PlatformUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref('')
  const authenticated = computed(() => !!user.value)

  async function restore() {
    if (initialized.value) return authenticated.value
    try { user.value = await platformApi.session() } catch { user.value = null }
    finally { initialized.value = true }
    return authenticated.value
  }
  async function login(email: string, password: string, deviceName?: string) {
    loading.value = true; error.value = ''
    try { const result = await platformApi.login({ email, password, deviceName }); if (result.user) user.value = result.user; return result }
    catch (e) { error.value = e instanceof Error ? e.message : 'No fue posible iniciar sesión'; throw e }
    finally { loading.value = false }
  }
  async function verifyOtp(challengeId: string, code: string, deviceName?: string) { user.value = await platformApi.verifyOtp({ challengeId, code, deviceName }); initialized.value = true }
  async function logout() { try { await platformApi.logout() } finally { user.value = null; initialized.value = true } }
  return { user, initialized, loading, error, authenticated, restore, login, verifyOtp, logout }
})

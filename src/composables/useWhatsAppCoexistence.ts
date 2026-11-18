import { onBeforeUnmount, ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'

export interface CoexistenceStatus {
  configured: boolean
  enabled: boolean
  state: 'pending' | 'connected' | 'syncing' | 'degraded' | 'disconnected'
  error?: string | null
  displayPhoneNumber?: string | null
  historyStatus: string
  contactsStatus: string
  lastSyncAt?: string | null
  pilotCallbackAvailable?: boolean
  pilotRecoveryAvailable?: boolean
}
const signupLifetimeMs = 15 * 60_000

type Signup = { appId: string; configurationId: string; graphApiVersion: string; session: string }
type Sdk = { init(options: object): void; login(callback: (result: { authResponse?: { code?: string } }) => void, options: object): void }
type MetaWindow = Window & { FB?: Sdk; fbAsyncInit?: () => void }
let sdkRequest: Promise<Sdk> | undefined

function loadSdk(): Promise<Sdk> {
  if (sdkRequest) return sdkRequest
  const meta = window as MetaWindow
  sdkRequest = new Promise<Sdk>((resolve, reject) => {
    const previousInit = meta.fbAsyncInit
    const script = document.createElement('script')
    meta.fbAsyncInit = () => {
      meta.fbAsyncInit = previousInit
      if (meta.FB) resolve(meta.FB)
      else reject(new Error('Meta no pudo iniciar. Recarga esta página para reintentar.'))
      previousInit?.()
    }
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'
    script.async = true
    script.onerror = () => {
      meta.fbAsyncInit = previousInit
      script.remove()
      reject(new Error('No se pudo cargar Meta. Recarga esta página para reintentar.'))
    }
    document.head.appendChild(script)
  }).catch(error => { sdkRequest = undefined; throw error })
  return sdkRequest
}

function waitForSdk(): Promise<Sdk> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Meta tarda en cargar. Recarga esta página para reintentar.'))
    }, 15_000)
    void loadSdk().then(resolve, reject).finally(() => window.clearTimeout(timeout))
  })
}

export function useWhatsAppCoexistence(branchId: number) {
  const status = ref<CoexistenceStatus | null>(null), error = ref(''), busy = ref(false), ready = ref(false)
  const preparing = ref(false)
  const authorizing = ref(false)
  const linePhone = ref('')
  let signup: Signup | undefined, sdk: Sdk | undefined, disposed = false
  let expiresAt = 0
  let statusOperation = 0
  let cleanup = () => {}
  async function refresh() {
    const currentStatusOperation = statusOperation
    const response = await whatsappApi.getCoexistence(branchId)
    if (!disposed && currentStatusOperation === statusOperation) {
      status.value = response.data
      if (!linePhone.value) linePhone.value = response.data.displayPhoneNumber ?? ''
    }
  }
  async function prepare() {
    ready.value = false
    preparing.value = true
    const currentStatusOperation = statusOperation
    try {
      await refresh()
      if (!status.value?.configured) return
      const requestedAt = Date.now()
      const [loaded, response] = await Promise.all([waitForSdk(), whatsappApi.startCoexistenceSignup(branchId)])
      if (disposed) return
      sdk = loaded; signup = response.data
      expiresAt = requestedAt + signupLifetimeMs
      sdk.init({ appId: signup.appId, version: signup.graphApiVersion, autoLogAppEvents: false, xfbml: false })
      ready.value = true
    } catch (failure: any) {
      if (!disposed && currentStatusOperation === statusOperation) {
        error.value = failure.message || 'No se pudo preparar la conexión.'
      }
    } finally {
      preparing.value = false
    }
  }
  function connect() {
    if (!sdk || !signup || !ready.value || busy.value) return
    const remaining = expiresAt - Date.now()
    if (remaining < 60_000) {
      error.value = 'Estoy renovando el registro. Cuando se habilite, pulsa Conectar con Meta de nuevo.'
      void prepare()
      return
    }
    if (!/^[1-9]\d{7,14}$/.test(linePhone.value.replace(/\D/g, ''))) {
      error.value = 'Escribe el número que vas a conectar, incluyendo el código de país.'
      return
    }
    error.value = ''; busy.value = true; ready.value = false; authorizing.value = true
    const session = signup.session, displayPhoneNumber = linePhone.value
    let code: string | undefined, assets: { waba_id: string; phone_number_id?: string } | undefined, completing = false, ended = false
    const finish = async () => {
      if (!code || !assets || completing || ended || disposed) return
      completing = true; cleanup()
      try {
        const response = await whatsappApi.connectCoexistence(branchId, { session, code, wabaId: assets.waba_id, phoneNumberId: assets.phone_number_id, displayPhoneNumber })
        if (!disposed) status.value = response.data
      } catch (failure: any) { if (!disposed) error.value = failure.message || 'No se pudo conectar la línea.' }
      finally { busy.value = false; if (!disposed) await prepare() }
    }
    const listener = (event: MessageEvent) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return
      let data = event.data
      try { if (typeof data === 'string') data = JSON.parse(data) } catch { return }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return
      if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' && /^\d+$/.test(data.data?.waba_id)) {
        assets = data.data; void finish()
      } else if (data.event === 'FINISH') {
        cleanup(); busy.value = false
        error.value = 'Meta abrió el registro estándar. Vuelve a iniciar y elige conectar una cuenta existente de WhatsApp Business.'
        void prepare()
      } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
        cleanup(); busy.value = false; error.value = 'La conexión no se completó.'; void prepare()
      }
    }
    const timeout = window.setTimeout(() => {
      cleanup(); busy.value = false; error.value = 'El registro expiró. Consulta el estado e inicia nuevamente.'; void prepare()
    }, remaining)
    cleanup = () => {
      ended = true
      authorizing.value = false
      window.removeEventListener('message', listener)
      window.clearTimeout(timeout)
    }
    window.addEventListener('message', listener)
    try {
      sdk.login(result => {
        if (ended || disposed) return
        code = result?.authResponse?.code
        if (code) void finish()
        else { cleanup(); busy.value = false; void prepare() }
      }, { config_id: signup.configurationId, response_type: 'code', override_default_response_type: true,
        extras: { setup: {}, version: 'v4', featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' } })
    } catch {
      cleanup()
      busy.value = false
      error.value = 'No se pudo abrir el registro de Meta. Inténtalo de nuevo.'
      void prepare()
    }
  }
  function cancelSignup() {
    if (!authorizing.value) return
    cleanup()
    busy.value = false
    void prepare()
  }
  async function updateStatus(request: () => Promise<{ data: CoexistenceStatus }>, failureMessage: string) {
    if (busy.value || disposed) return
    statusOperation++
    busy.value = true
    error.value = ''
    try {
      const { data } = await request()
      if (!disposed) status.value = data
    } catch (failure: unknown) {
      if (!disposed) error.value = failure instanceof Error && failure.message ? failure.message : failureMessage
    } finally {
      busy.value = false
    }
  }
  function check() {
    return updateStatus(() => whatsappApi.checkCoexistence(branchId), 'No se pudo comprobar la línea.')
  }
  function recoverPilot() {
    if (!status.value?.pilotRecoveryAvailable) return
    return updateStatus(() => whatsappApi.recoverCoexistencePilot(branchId), 'No se pudo recuperar la conexión de Santander.')
  }
  const callbackActive = ref<boolean | null>(null)
  async function setPilotCallback(active: boolean) {
    if (busy.value) return
    busy.value = true; error.value = ''
    try { callbackActive.value = (await whatsappApi.setCoexistencePilotCallback(branchId, active)).data.active }
    catch (failure: any) { error.value = failure.message || 'Revisa el callback de Santander en Meta.' }
    finally { busy.value = false }
  }
  onBeforeUnmount(() => { disposed = true; cleanup() })
  return { status, error, busy, ready, preparing, authorizing, linePhone, prepare, connect, cancelSignup, check, recoverPilot, refresh, callbackActive, setPilotCallback }
}

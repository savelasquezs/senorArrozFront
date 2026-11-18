import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { useWhatsAppCoexistence } from '../useWhatsAppCoexistence'

const api = vi.hoisted(() => ({
  getCoexistence: vi.fn(),
  startCoexistenceSignup: vi.fn(),
  connectCoexistence: vi.fn(),
  checkCoexistence: vi.fn(),
  recoverCoexistencePilot: vi.fn(),
}))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
const state = { configured: true, enabled: false, state: 'pending', historyStatus: 'not_started', contactsStatus: 'not_started' }
let instance: ReturnType<typeof useWhatsAppCoexistence>
let useCoexistence: typeof useWhatsAppCoexistence
let loginCallback: (result: { authResponse?: { code?: string } }) => void
const sdk = { init: vi.fn(), login: vi.fn((callback: (result: { authResponse?: { code?: string } }) => void, _options: object) => { loginCallback = callback }) }
const meta = window as Window & { FB?: typeof sdk; fbAsyncInit?: () => void }
let sdkScript: HTMLScriptElement | undefined
const event = (origin = 'https://www.facebook.com') => new MessageEvent('message', { origin,
  data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', data: { waba_id: '123', phone_number_id: '456' } }) })
beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  useCoexistence = (await import('../useWhatsAppCoexistence')).useWhatsAppCoexistence
  const appendChild = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
    if (node instanceof HTMLScriptElement && node.src === 'https://connect.facebook.net/es_LA/sdk.js') {
      sdkScript = node
      return node
    }
    return appendChild(node)
  })
  api.getCoexistence.mockResolvedValue({ data: state })
  api.startCoexistenceSignup.mockResolvedValue({ data: { appId: '1', configurationId: '2', graphApiVersion: 'v27.0', session: 'protected-session' } })
  api.connectCoexistence.mockResolvedValue({ data: { ...state, enabled: true, state: 'syncing' } })
})
afterEach(() => {
  sdkScript = undefined
  delete meta.FB
  delete meta.fbAsyncInit
  vi.restoreAllMocks()
  vi.useRealTimers()
})
function setup() {
  return mount(defineComponent({ setup() { instance = useCoexistence(7); instance.linePhone.value = '573111111111'; return () => h('div') } }))
}
async function prepare() {
  const preparing = instance.prepare()
  await Promise.resolve()
  await Promise.resolve()
  meta.FB = sdk
  meta.fbAsyncInit?.()
  await preparing
}
describe('WhatsApp coexistence signup', () => {
  it('enables the button only after Meta initializes the SDK', async () => {
    const wrapper = setup()
    const preparing = instance.prepare()
    await flushPromises()
    meta.FB = sdk
    expect(sdkScript).toBeDefined()
    sdkScript?.dispatchEvent(new Event('load'))
    instance.connect()
    expect(instance.ready.value).toBe(false)
    expect(sdk.login).not.toHaveBeenCalled()
    meta.fbAsyncInit?.()
    await preparing
    expect(instance.ready.value).toBe(true)
    instance.connect()
    expect(sdk.login).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('allows a new attempt without waiting for the previous one to expire', async () => {
    const wrapper = setup()
    await prepare()
    instance.connect()
    const firstCallback = loginCallback
    expect(instance.authorizing.value).toBe(true)
    instance.cancelSignup()
    await flushPromises()
    expect(instance.authorizing.value).toBe(false)
    expect(instance.ready.value).toBe(true)
    instance.connect()
    firstCallback({ authResponse: { code: 'from-cancelled-attempt' } })
    window.dispatchEvent(event())
    await flushPromises()
    expect(api.connectCoexistence).not.toHaveBeenCalled()
    loginCallback({ authResponse: { code: 'from-current-attempt' } })
    await flushPromises()
    expect(api.connectCoexistence).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('waits for both the Meta code and a trusted session event before connecting once', async () => {
    const wrapper = setup(); await prepare(); instance.connect()
    loginCallback({ authResponse: { code: 'temporary-code' } })
    window.dispatchEvent(event('https://attacker.invalid')); await flushPromises()
    expect(api.connectCoexistence).not.toHaveBeenCalled()
    window.dispatchEvent(event()); window.dispatchEvent(event()); await flushPromises()
    expect(api.connectCoexistence).toHaveBeenCalledTimes(1)
    expect(api.connectCoexistence).toHaveBeenCalledWith(7, { session: 'protected-session', code: 'temporary-code', wabaId: '123', phoneNumberId: '456', displayPhoneNumber: '573111111111' })
    expect(sdk.login.mock.calls[0][1]).toMatchObject({ extras: { version: 'v4', featureType: 'whatsapp_business_app_onboarding' } })
    wrapper.unmount()
  })
  it('does not exchange the code returned by a standard signup', async () => {
    const wrapper = setup(); await prepare(); instance.connect()
    loginCallback({ authResponse: { code: 'standard-code' } })
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://www.facebook.com',
      data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: '123' } }),
    }))
    await flushPromises()
    expect(api.connectCoexistence).not.toHaveBeenCalled()
    expect(instance.error.value).toContain('registro estándar')
    wrapper.unmount()
  })

  it('keeps the registration open past three minutes for cellular verification', async () => {
    vi.useFakeTimers()
    const wrapper = setup()
    await prepare()
    instance.connect()
    vi.advanceTimersByTime(4 * 60_000)
    expect(instance.busy.value).toBe(true)
    loginCallback({ authResponse: { code: 'after-cellular-verification' } })
    window.dispatchEvent(event())
    await flushPromises()
    expect(api.connectCoexistence).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('ignores late callbacks after the component is unmounted', async () => {
    const wrapper = setup(); await prepare(); instance.connect(); window.dispatchEvent(event()); wrapper.unmount()
    loginCallback({ authResponse: { code: 'late-code' } }); await flushPromises()
    expect(api.connectCoexistence).not.toHaveBeenCalled()
  })
  it('does not launch signup when server configuration is incomplete', async () => {
    api.getCoexistence.mockResolvedValue({ data: { ...state, configured: false } })
    const wrapper = setup(); await instance.prepare(); instance.connect()
    expect(instance.ready.value).toBe(false); expect(sdk.login).not.toHaveBeenCalled(); wrapper.unmount()
  })
})

describe('Santander coexistence recovery', () => {
  it('hides recovery when the server has not enabled it', async () => {
    const panel = (await import('@/components/whatsapp/WhatsAppCoexistencePanel.vue')).default
    api.getCoexistence.mockResolvedValue({ data: { ...state, configured: false } })
    const wrapper = mount(panel, { props: { branchId: 7 } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Recuperar conexión de Santander')
    expect(api.recoverCoexistencePilot).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('recovers the pinned line while the SDK is unavailable and shows the callback action', async () => {
    const panel = (await import('@/components/whatsapp/WhatsAppCoexistencePanel.vue')).default
    api.getCoexistence.mockResolvedValue({ data: { ...state, pilotRecoveryAvailable: true } })
    api.recoverCoexistencePilot.mockResolvedValue({
      data: { ...state, enabled: true, state: 'connected', pilotCallbackAvailable: true },
    })
    const wrapper = mount(panel, { props: { branchId: 7 } })
    await flushPromises()
    const recovery = wrapper.findAll('button').find(button => button.text() === 'Recuperar conexión de Santander')
    expect(recovery?.attributes('disabled')).toBeUndefined()
    await recovery!.trigger('click')
    sdkScript?.dispatchEvent(new Event('error'))
    await flushPromises()
    expect(api.recoverCoexistencePilot).toHaveBeenCalledExactlyOnceWith(7)
    expect(sdk.login).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Recuperar conexión de Santander')
    expect(wrapper.text()).toContain('Conectada en coexistencia')
    expect(wrapper.text()).toContain('Activar webhook local')
    expect(wrapper.text()).not.toContain('Cargando Meta…')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the recovered status when an earlier status request finishes late', async () => {
    const wrapper = setup()
    const pending = { data: { ...state, pilotRecoveryAvailable: true } }
    api.getCoexistence.mockResolvedValue(pending)
    api.recoverCoexistencePilot.mockResolvedValue({ data: { ...state, enabled: true, state: 'connected' } })
    await instance.refresh()
    let completeRefresh!: (response: typeof pending) => void
    api.getCoexistence.mockImplementationOnce(() => new Promise<typeof pending>(resolve => {
      completeRefresh = resolve
    }))
    const refreshing = instance.refresh()
    await instance.recoverPilot()
    completeRefresh(pending)
    await refreshing
    expect(instance.status.value?.state).toBe('connected')
    wrapper.unmount()
  })
})

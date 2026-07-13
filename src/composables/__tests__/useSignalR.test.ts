import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const connection = {
    state: 'Disconnected',
    start: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  }
  const builder = {
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    configureLogging: vi.fn(),
    build: vi.fn(),
  }
  builder.withUrl.mockReturnValue(builder)
  builder.withAutomaticReconnect.mockReturnValue(builder)
  builder.configureLogging.mockReturnValue(builder)
  builder.build.mockReturnValue(connection)

  return {
    connection,
    builder,
    HubConnectionBuilder: vi.fn(function HubConnectionBuilder() {
      return builder
    }),
  }
})

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: mocks.HubConnectionBuilder,
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Connected: 'Connected',
    Disconnecting: 'Disconnecting',
    Reconnecting: 'Reconnecting',
  },
  LogLevel: { Information: 2 },
}))

vi.mock('@/services/auth/authSession', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
}))

import { useSignalR } from '@/composables/useSignalR'

function mountSignalR() {
  let signalR!: ReturnType<typeof useSignalR>
  const wrapper = mount(defineComponent({
    setup() {
      signalR = useSignalR('/hubs/whatsapp')
      return () => h('div')
    },
  }))
  return { wrapper, get signalR() { return signalR } }
}

describe('useSignalR', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.connection.state = 'Disconnected'
    mocks.connection.start.mockImplementation(async () => {
      mocks.connection.state = 'Connected'
    })
    mocks.connection.stop.mockImplementation(async () => {
      mocks.connection.state = 'Disconnected'
    })
    mocks.builder.withUrl.mockReturnValue(mocks.builder)
    mocks.builder.withAutomaticReconnect.mockReturnValue(mocks.builder)
    mocks.builder.configureLogging.mockReturnValue(mocks.builder)
    mocks.builder.build.mockReturnValue(mocks.connection)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('exposes reconnecting and connected states and clears transient errors', async () => {
    const mounted = mountSignalR()
    await flushPromises()

    expect(mounted.signalR.connectionState.value).toBe('connected')
    const onReconnecting = mocks.connection.onreconnecting.mock.calls[0][0]
    const onReconnected = mocks.connection.onreconnected.mock.calls[0][0]

    onReconnecting(new Error('Red interrumpida'))
    expect(mounted.signalR.connectionState.value).toBe('reconnecting')
    expect(mounted.signalR.error.value).toBe('Red interrumpida')

    onReconnected()
    expect(mounted.signalR.connectionState.value).toBe('connected')
    expect(mounted.signalR.error.value).toBeNull()
    mounted.wrapper.unmount()
  })

  it('retries an initial connection failure after three seconds', async () => {
    mocks.connection.start
      .mockRejectedValueOnce(new Error('Hub no disponible'))
      .mockImplementationOnce(async () => {
        mocks.connection.state = 'Connected'
      })
    const mounted = mountSignalR()
    await flushPromises()

    expect(mounted.signalR.connectionState.value).toBe('error')
    expect(mounted.signalR.error.value).toBe('Hub no disponible')

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(mocks.connection.start).toHaveBeenCalledTimes(2)
    expect(mounted.signalR.connectionState.value).toBe('connected')
    mounted.wrapper.unmount()
  })

  it('starts a fresh connection when onclose is reached after reconnect attempts', async () => {
    const mounted = mountSignalR()
    await flushPromises()
    const onClose = mocks.connection.onclose.mock.calls[0][0]
    mocks.connection.state = 'Disconnected'

    onClose(new Error('Reconexión agotada'))
    expect(mounted.signalR.connectionState.value).toBe('error')

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(mocks.connection.start).toHaveBeenCalledTimes(2)
    expect(mounted.signalR.connectionState.value).toBe('connected')
    mounted.wrapper.unmount()
  })
})

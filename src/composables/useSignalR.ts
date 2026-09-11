import { onMounted, onUnmounted, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import * as signalR from '@microsoft/signalr'
import { getValidAccessToken, getStoredUser } from '@/services/auth/authSession'
import { getSelectedBranchIdForRequest } from '@/services/branchContextSession'
import { useNetworkActivityManager } from '@/composables/useNetworkActivityManager'

export type SignalRConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

const RECONNECT_DELAYS_MS = [3_000, 10_000, 30_000, 60_000]

interface SharedSignalRHub {
  connection: ShallowRef<signalR.HubConnection | null>
  isConnected: Ref<boolean>
  error: Ref<string | null>
  connectionState: Ref<SignalRConnectionState>
  isPageVisible: Ref<boolean>
  isOnline: Ref<boolean>
  handlers: Map<string, Set<(...args: any[]) => void>>
  subscribers: number
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  reconnectNow: () => void
}

const sharedHubs = new Map<string, SharedSignalRHub>()

export function nextSignalRRetryDelay(previousRetryCount: number, random = Math.random) {
  const base = RECONNECT_DELAYS_MS[Math.min(previousRetryCount, RECONNECT_DELAYS_MS.length - 1)]
  return Math.round(base * (0.9 + random() * 0.2))
}

function createSharedHub(hubUrl: string): SharedSignalRHub {
  const { isPageVisible, isOnline } = useNetworkActivityManager()
  const connection = shallowRef<signalR.HubConnection | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const connectionState = ref<SignalRConnectionState>('disconnected')
  const handlers = new Map<string, Set<(...args: any[]) => void>>()
  let isConnecting = false
  let reconnectTimer: number | undefined
  let shouldReconnect = true
  let initialReconnectAttempt = 0

  const hub: SharedSignalRHub = {
    connection,
    isConnected,
    error,
    connectionState,
    isPageVisible,
    isOnline,
    handlers,
    subscribers: 0,
    connect,
    disconnect,
    reconnectNow,
  }

  function scopedHubUrl() {
    const user = getStoredUser()
    const branchId = getSelectedBranchIdForRequest()
    const separator = hubUrl.includes('?') ? '&' : '?'
    const branchScope = user?.role?.toLowerCase() === 'superadmin' && branchId
      ? `&branchId=${encodeURIComponent(branchId)}`
      : ''
    return `${hubUrl}${separator}client=web${branchScope}`
  }

  function registerHandlers() {
    if (!connection.value) return
    handlers.forEach((callbacks, eventName) => {
      connection.value?.off(eventName)
      callbacks.forEach(callback => connection.value?.on(eventName, callback))
    })
  }

  function scheduleReconnect() {
    if (!shouldReconnect || hub.subscribers === 0 || !isOnline.value || reconnectTimer) return
    const delay = nextSignalRRetryDelay(initialReconnectAttempt++)
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      void connect()
    }, delay)
  }

  async function connect() {
    shouldReconnect = true
    if (hub.subscribers === 0 || isConnecting || connection.value?.state === signalR.HubConnectionState.Connected) return
    if (connection.value?.state && connection.value.state !== signalR.HubConnectionState.Disconnected) return
    isConnecting = true
    connectionState.value = 'connecting'
    error.value = null
    try {
      connection.value = new signalR.HubConnectionBuilder()
        .withUrl(scopedHubUrl(), {
          accessTokenFactory: async () => (await getValidAccessToken()) || '',
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: context => nextSignalRRetryDelay(context.previousRetryCount),
        })
        .configureLogging(signalR.LogLevel.Information)
        .build()
      registerHandlers()
      connection.value.onreconnecting((reconnectError) => {
        isConnected.value = false
        connectionState.value = 'reconnecting'
        error.value = reconnectError?.message ?? null
      })
      connection.value.onreconnected(() => {
        initialReconnectAttempt = 0
        isConnected.value = true
        connectionState.value = 'connected'
        error.value = null
      })
      connection.value.onclose((closeError) => {
        isConnected.value = false
        connectionState.value = closeError ? 'error' : 'disconnected'
        error.value = closeError?.message ?? null
        scheduleReconnect()
      })
      await connection.value.start()
      isConnected.value = true
      connectionState.value = 'connected'
      error.value = null
      initialReconnectAttempt = 0
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    } catch (connectError: any) {
      const failedConnection = connection.value
      connection.value = null
      try {
        await failedConnection?.stop()
      } catch {}
      error.value = connectError.message || 'Error al conectar'
      connectionState.value = 'error'
      isConnected.value = false
      scheduleReconnect()
    } finally {
      isConnecting = false
    }
  }

  async function disconnect() {
    shouldReconnect = false
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = undefined
    if (connection.value) await connection.value.stop()
    connection.value = null
    isConnected.value = false
    connectionState.value = 'disconnected'
    error.value = null
  }

  function reconnectNow() {
    if (!shouldReconnect || hub.subscribers === 0 || !isOnline.value) return
    if (connection.value?.state === signalR.HubConnectionState.Connected
      || connection.value?.state === signalR.HubConnectionState.Connecting
      || connection.value?.state === signalR.HubConnectionState.Reconnecting) return
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = undefined
    initialReconnectAttempt = 0
    void connect()
  }

  return hub
}

export function useSignalR(hubUrl: string) {
  const hub = sharedHubs.get(hubUrl) ?? createSharedHub(hubUrl)
  sharedHubs.set(hubUrl, hub)
  const localHandlers = new Map<string, Set<(...args: any[]) => void>>()

  const on = (eventName: string, callback: (...args: any[]) => void) => {
    const local = localHandlers.get(eventName) ?? new Set<(...args: any[]) => void>()
    if (local.has(callback)) return
    local.add(callback)
    localHandlers.set(eventName, local)
    const shared = hub.handlers.get(eventName) ?? new Set<(...args: any[]) => void>()
    shared.add(callback)
    hub.handlers.set(eventName, shared)
    hub.connection.value?.on(eventName, callback)
  }

  const off = (eventName: string, callback?: (...args: any[]) => void) => {
    const local = localHandlers.get(eventName)
    const callbacks = callback ? [callback] : [...(local ?? [])]
    callbacks.forEach(item => {
      local?.delete(item)
      hub.handlers.get(eventName)?.delete(item)
      hub.connection.value?.off(eventName, item)
    })
    if (!local?.size) localHandlers.delete(eventName)
    if (!hub.handlers.get(eventName)?.size) hub.handlers.delete(eventName)
  }

  onMounted(() => {
    hub.subscribers++
    void hub.connect()
  })

  onUnmounted(() => {
    localHandlers.forEach((_, eventName) => off(eventName))
    hub.subscribers = Math.max(0, hub.subscribers - 1)
    if (hub.subscribers === 0) {
      sharedHubs.delete(hubUrl)
      void hub.disconnect()
    }
  })

  watch([hub.isPageVisible, hub.isOnline], ([visible, online], [wasVisible, wasOnline]) => {
    if (visible && online && (!wasVisible || !wasOnline)) hub.reconnectNow()
  })

  return {
    connection: hub.connection,
    isConnected: hub.isConnected,
    connectionState: hub.connectionState,
    error: hub.error,
    connect: hub.connect,
    disconnect: hub.disconnect,
    reconnectNow: hub.reconnectNow,
    on,
    off,
  }
}

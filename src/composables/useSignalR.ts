import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as signalR from '@microsoft/signalr'
import { getValidAccessToken, getStoredUser } from '@/services/auth/authSession'
import { getSelectedBranchIdForRequest } from '@/services/branchContextSession'
import { useNetworkActivityManager } from '@/composables/useNetworkActivityManager'

export type SignalRConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

const RECONNECT_DELAYS_MS = [3_000, 10_000, 30_000, 60_000]

export function nextSignalRRetryDelay(previousRetryCount: number, random = Math.random) {
    const base = RECONNECT_DELAYS_MS[Math.min(previousRetryCount, RECONNECT_DELAYS_MS.length - 1)]
    return Math.round(base * (0.9 + random() * 0.2))
}

export function useSignalR(hubUrl: string) {
    const { isPageVisible, isOnline } = useNetworkActivityManager()
    const connection = ref<signalR.HubConnection | null>(null)
    const isConnected = ref(false)
    const error = ref<string | null>(null)
    const connectionState = ref<SignalRConnectionState>('disconnected')
    const handlers = new Map<string, Set<(...args: any[]) => void>>()
    let isConnecting = false
    let reconnectTimer: number | undefined
    let shouldReconnect = true
    let initialReconnectAttempt = 0

    const scopedHubUrl = () => {
        const user = getStoredUser()
        const branchId = getSelectedBranchIdForRequest()
        const separator = hubUrl.includes('?') ? '&' : '?'
        const branchScope = user?.role?.toLowerCase() === 'superadmin' && branchId
            ? `&branchId=${encodeURIComponent(branchId)}`
            : ''
        return `${hubUrl}${separator}client=web${branchScope}`
    }

    const registerHandlers = () => {
        if (!connection.value) return
        handlers.forEach((callbacks, eventName) => {
            connection.value?.off(eventName)
            callbacks.forEach(callback => connection.value?.on(eventName, callback))
        })
    }

    const scheduleReconnect = () => {
        if (!shouldReconnect || !isOnline.value || reconnectTimer) return
        const delay = nextSignalRRetryDelay(initialReconnectAttempt++)
        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = undefined
            void connect()
        }, delay)
    }

    const connect = async () => {
        shouldReconnect = true
        if (isConnecting || connection.value?.state === signalR.HubConnectionState.Connected) return
        if (connection.value?.state && connection.value.state !== signalR.HubConnectionState.Disconnected) return

        isConnecting = true
        connectionState.value = 'connecting'
        error.value = null
        try {
            connection.value = null
            connection.value = new signalR.HubConnectionBuilder()
                .withUrl(scopedHubUrl(), {
                    accessTokenFactory: async () => (await getValidAccessToken()) || ''
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: context =>
                        nextSignalRRetryDelay(context.previousRetryCount)
                })
                .configureLogging(signalR.LogLevel.Information)
                .build()

            registerHandlers()

            connection.value.onreconnecting((reconnectError) => {
                isConnected.value = false
                connectionState.value = 'reconnecting'
                error.value = reconnectError?.message ?? null
                console.log('SignalR: Reconectando...')
            })

            connection.value.onreconnected(() => {
                initialReconnectAttempt = 0
                isConnected.value = true
                connectionState.value = 'connected'
                error.value = null
                console.log('SignalR: Reconectado')
            })

            connection.value.onclose((closeError) => {
                isConnected.value = false
                connectionState.value = closeError ? 'error' : 'disconnected'
                error.value = closeError?.message ?? null
                if (closeError) console.error('SignalR cerrado con error:', closeError)
                scheduleReconnect()
            })

            await connection.value.start()
            isConnected.value = true
            connectionState.value = 'connected'
            error.value = null
            initialReconnectAttempt = 0
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer)
                reconnectTimer = undefined
            }
            console.log(`SignalR: Conectado a ${hubUrl}`)
        } catch (err: any) {
            const failedConnection = connection.value
            connection.value = null
            try {
                await failedConnection?.stop()
            } catch {
                // La conexión ya falló; conservar el error original es más útil.
            }
            error.value = err.message || 'Error al conectar'
            connectionState.value = 'error'
            isConnected.value = false
            console.error('Error SignalR:', err)
            scheduleReconnect()
        } finally {
            isConnecting = false
        }
    }

    const disconnect = async () => {
        shouldReconnect = false
        if (reconnectTimer) {
            window.clearTimeout(reconnectTimer)
            reconnectTimer = undefined
        }
        if (connection.value) {
            await connection.value.stop()
            connection.value = null
            isConnected.value = false
        }
        connectionState.value = 'disconnected'
        error.value = null
    }

    const reconnectNow = () => {
        if (!shouldReconnect || !isOnline.value) return
        if (connection.value?.state === signalR.HubConnectionState.Connected) return
        if (connection.value?.state === signalR.HubConnectionState.Connecting
            || connection.value?.state === signalR.HubConnectionState.Reconnecting) return
        if (reconnectTimer) window.clearTimeout(reconnectTimer)
        reconnectTimer = undefined
        initialReconnectAttempt = 0
        void connect()
    }

    watch([isPageVisible, isOnline], ([visible, online], [wasVisible, wasOnline]) => {
        if (visible && online && (!wasVisible || !wasOnline)) reconnectNow()
    })

    const on = (eventName: string, callback: (...args: any[]) => void) => {
        const callbacks = handlers.get(eventName) ?? new Set<(...args: any[]) => void>()
        callbacks.add(callback)
        handlers.set(eventName, callbacks)
        connection.value?.on(eventName, callback)
    }

    const off = (eventName: string, callback?: (...args: any[]) => void) => {
        if (callback) {
            handlers.get(eventName)?.delete(callback)
            connection.value?.off(eventName, callback)
            return
        }

        handlers.delete(eventName)
        connection.value?.off(eventName)
    }

    onMounted(() => {
        connect()
    })

    onUnmounted(() => {
        disconnect()
    })

    return { connection, isConnected, connectionState, error, connect, disconnect, reconnectNow, on, off }
}


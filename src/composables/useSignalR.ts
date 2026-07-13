import { ref, onMounted, onUnmounted } from 'vue'
import * as signalR from '@microsoft/signalr'
import { getAccessToken } from '@/services/auth/authSession'

export type SignalRConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export function useSignalR(hubUrl: string) {
    const connection = ref<signalR.HubConnection | null>(null)
    const isConnected = ref(false)
    const error = ref<string | null>(null)
    const connectionState = ref<SignalRConnectionState>('disconnected')
    const handlers = new Map<string, Set<(...args: any[]) => void>>()
    let isConnecting = false
    let reconnectTimer: number | undefined
    let shouldReconnect = true

    const registerHandlers = () => {
        if (!connection.value) return
        handlers.forEach((callbacks, eventName) => {
            connection.value?.off(eventName)
            callbacks.forEach(callback => connection.value?.on(eventName, callback))
        })
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
                .withUrl(hubUrl, {
                    accessTokenFactory: () => {
                        return getAccessToken() || ''
                    }
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: () => 3000
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
                if (shouldReconnect && !reconnectTimer) {
                    reconnectTimer = window.setTimeout(() => {
                        reconnectTimer = undefined
                        void connect()
                    }, 3000)
                }
            })

            await connection.value.start()
            isConnected.value = true
            connectionState.value = 'connected'
            error.value = null
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
            if (shouldReconnect && !reconnectTimer) {
                reconnectTimer = window.setTimeout(() => {
                    reconnectTimer = undefined
                    void connect()
                }, 3000)
            }
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

    return { connection, isConnected, connectionState, error, connect, disconnect, on, off }
}


import { ref, onMounted, onUnmounted } from 'vue'
import * as signalR from '@microsoft/signalr'
import { getAccessToken } from '@/services/auth/authSession'

export function useSignalR(hubUrl: string) {
    const connection = ref<signalR.HubConnection | null>(null)
    const isConnected = ref(false)
    const error = ref<string | null>(null)
    const handlers = new Map<string, Set<(...args: any[]) => void>>()

    const registerHandlers = () => {
        if (!connection.value) return
        handlers.forEach((callbacks, eventName) => {
            connection.value?.off(eventName)
            callbacks.forEach(callback => connection.value?.on(eventName, callback))
        })
    }

    const connect = async () => {
        try {
            if (connection.value) return
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

            connection.value.onreconnecting(() => {
                isConnected.value = false
                console.log('SignalR: Reconectando...')
            })

            connection.value.onreconnected(() => {
                isConnected.value = true
                console.log('SignalR: Reconectado')
            })

            connection.value.onclose((error) => {
                isConnected.value = false
                if (error) console.error('SignalR cerrado con error:', error)
            })

            await connection.value.start()
            isConnected.value = true
            console.log('SignalR: Conectado al hub de pedidos')
        } catch (err: any) {
            error.value = err.message || 'Error al conectar'
            console.error('Error SignalR:', err)
        }
    }

    const disconnect = async () => {
        if (connection.value) {
            await connection.value.stop()
            connection.value = null
            isConnected.value = false
        }
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

    return { connection, isConnected, error, connect, disconnect, on, off }
}


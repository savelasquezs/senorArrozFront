import { ref, onMounted, onUnmounted } from 'vue'
import * as signalR from '@microsoft/signalr'

export function useSignalR(hubUrl: string) {
    const connection = ref<signalR.HubConnection | null>(null)
    const isConnected = ref(false)
    const error = ref<string | null>(null)

    const connect = async () => {
        try {
            connection.value = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => {
                        const token = localStorage.getItem('auth_token') || ''
                        return token
                    }
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: () => 3000
                })
                .configureLogging(signalR.LogLevel.Information)
                .build()

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
        if (connection.value) {
            connection.value.on(eventName, callback)
        }
    }

    const off = (eventName: string) => {
        if (connection.value) {
            connection.value.off(eventName)
        }
    }

    onMounted(() => {
        connect()
    })

    onUnmounted(() => {
        disconnect()
    })

    return { connection, isConnected, error, connect, disconnect, on, off }
}


import { ref } from 'vue'

export function useNotifications() {
    const isSupported = ref(typeof window !== 'undefined' && 'Notification' in window)
    const permission = ref<NotificationPermission>(
        isSupported.value ? Notification.permission : 'denied'
    )

    const requestPermission = async (): Promise<NotificationPermission> => {
        if (!isSupported.value) return 'denied'
        const result = await Notification.requestPermission()
        permission.value = result
        return result
    }

    const notify = (title: string, options?: { body?: string; tag?: string; icon?: string }) => {
        if (!isSupported.value || permission.value !== 'granted') return

        const n = new Notification(title, {
            body: options?.body,
            tag: options?.tag,
            icon: options?.icon || '/vite.svg'
        })

        n.onclick = () => {
            window.focus()
            n.close()
        }
    }

    return { isSupported, permission, requestPermission, notify }
}

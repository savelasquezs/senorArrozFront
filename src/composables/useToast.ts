// src/composables/useToast.ts
import { ref } from 'vue'

export interface Toast {
  id: string
  title: string
  message?: string
  variant: 'success' | 'error' | 'warning' | 'info'
  duration: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    }

    toasts.value.push(newToast)

    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAllToasts = () => {
    toasts.value = []
  }

  // Convenience methods
  const success = (title: string, duration: number, message?: string) => {
    return addToast({ title, message, variant: 'success', duration })
  }

  const error = (title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'error', duration: duration ?? 8000 })
  }

  const warning = (title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'warning', duration: duration ?? 6000 })
  }

  const info = (title: string, message?: string, duration?: number) => {
    return addToast({ title, message, variant: 'info', duration: duration ?? 5000 })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  }
}
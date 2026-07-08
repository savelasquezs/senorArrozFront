function apiRootFromApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  return String(apiUrl).replace(/\/api\/?$/, '')
}

export const ORDERS_SIGNALR_HUB_URL =
  import.meta.env.VITE_SIGNALR_HUB_URL || `${apiRootFromApiUrl()}/hubs/orders`

export const WHATSAPP_SIGNALR_HUB_URL =
  import.meta.env.VITE_WHATSAPP_SIGNALR_HUB_URL
  || (import.meta.env.VITE_SIGNALR_HUB_URL
    ? String(import.meta.env.VITE_SIGNALR_HUB_URL).replace(/\/hubs\/orders\/?$/, '/hubs/whatsapp')
    : `${apiRootFromApiUrl()}/hubs/whatsapp`)

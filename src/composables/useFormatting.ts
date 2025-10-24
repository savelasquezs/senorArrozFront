// src/composables/useFormatting.ts
/**
 * Composable para funciones de formateo y utilidades de texto
 * Funciones puras sin estado - solo lógica de formateo
 */

/**
 * Formatea un número como moneda colombiana
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

/**
 * Formatea un número con separadores de miles
 */
export const formatNumber = (number: number): string => {
    return new Intl.NumberFormat('es-CO').format(number)
}

/**
 * Formatea una fecha a formato legible
 */
export const formatDateTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj)
}

/**
 * Formatea una fecha a formato corto
 */
export const formatDateShort = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(dateObj)
}

/**
 * Formatea solo la hora de una fecha
 */
export const formatTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj)
}

/**
 * Formatea una fecha a tiempo relativo humanizado ("hace X tiempo")
 */
export const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'hace unos segundos'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`

    const days = Math.floor(hours / 24)
    if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`

    const weeks = Math.floor(days / 7)
    return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
}

/**
 * Trunca texto a una longitud específica
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

/**
 * Capitaliza la primera letra de un texto
 */
export const capitalizeFirst = (text: string): string => {
    if (!text) return text
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Obtiene el nombre de display para un OrderStatus
 */
export const getOrderStatusDisplayName = (status: string): string => {
    const displayNames: Record<string, string> = {
        'taken': 'Tomado',
        'in_preparation': 'En preparación',
        'inPreparation': 'En preparación',
        'ready': 'Listo',
        'on_the_way': 'En camino',
        'onTheWay': 'En camino',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    }
    return displayNames[status] || status
}

/**
 * Obtiene el nombre de display para un OrderType
 */
export const getOrderTypeDisplayName = (type: string): string => {
    const displayNames: Record<string, string> = {
        'onsite': 'En el local',
        'delivery': 'Domicilio',
        'reservation': 'Reserva'
    }
    return displayNames[type] || type
}

// Exportar como objeto para uso en composables
export const useFormatting = () => {
    return {
        formatCurrency,
        formatNumber,
        formatDateTime,
        formatDateShort,
        formatTime,
        formatTimeAgo,
        truncateText,
        capitalizeFirst,
        getOrderStatusDisplayName,
        getOrderTypeDisplayName
    }
}
// src/composables/useFormatting.ts
/**
 * Composable para funciones de formateo y utilidades de texto
 * Funciones puras sin estado - solo lógica de formateo
 */

import type { OrderStatus } from '@/types/order'
import { defaultBusinessCalendar } from '@/utils/datetime'

/** Clave en `statusTimes` del backend (C# guarda `InPreparation` → `inpreparation`). */
export const orderStatusToStatusTimesKey = (status: OrderStatus): string => {
    if (status === 'in_preparation') return 'inpreparation'
    if (status === 'on_the_way') return 'ontheway'
    return status
}

/** ISO del momento en que el pedido entró al estado actual, si existe en el mapa. */
export const getStatusTimeFromRecord = (
    statusTimes: Record<string, string> | undefined,
    status: OrderStatus
): string | undefined => {
    if (!statusTimes) return undefined
    const key = orderStatusToStatusTimesKey(status)
    return statusTimes[key] ?? statusTimes[status]
}

/**
 * Cuánto tiempo lleva en el estado actual: "hace 20 min", "hace 2 horas 30 min".
 */
export const formatDurationInCurrentStatus = (isoDate: string, nowMs: number = Date.now()): string => {
    const t = new Date(isoDate).getTime()
    if (Number.isNaN(t)) return ''
    let ms = nowMs - t
    if (ms < 0) ms = 0
    const totalMin = Math.floor(ms / 60000)
    if (totalMin < 1) return 'hace menos de 1 min'
    if (totalMin < 60) {
        return `hace ${totalMin} min`
    }
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    if (hours < 24) {
        if (mins === 0) {
            return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
        }
        return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'} ${mins} min`
    }
    const days = Math.floor(totalMin / (60 * 24))
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

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
 * Formatea una fecha a formato legible (zona de negocio + locale es).
 */
export const formatDateTime = (date: string | Date): string => {
    return defaultBusinessCalendar.formatDateTime(date)
}

/**
 * Formatea una fecha a formato corto dd/MM/yyyy (zona de negocio).
 */
export const formatDateShort = (date: string | Date): string => {
    return defaultBusinessCalendar.formatDateShort(date)
}

/**
 * Formatea solo la hora HH:mm (zona de negocio).
 */
export const formatTime = (date: string | Date): string => {
    return defaultBusinessCalendar.formatTime(date)
}

/** Hora 12 h con sufijo a. m. / p. m. (zona de negocio). */
export const formatTime12h = (date: string | Date): string => {
    return defaultBusinessCalendar.formatTime12h(date)
}

/** Fecha larga sin hora (zona de negocio). */
export const formatDateLong = (date: string | Date): string => {
    return defaultBusinessCalendar.formatDateLong(date)
}

/** dd/MM/yyyy, HH:mm (zona de negocio). */
export const formatDateTimeCompact = (date: string | Date): string => {
    return defaultBusinessCalendar.formatDateTimeCompact(date)
}

/** Día y mes corto, p. ej. gráficos. */
export const formatDayShortMonth = (date: string | Date): string => {
    return defaultBusinessCalendar.formatDayShortMonth(date)
}

/** Mes y año cortos. */
export const formatShortMonthYear = (date: string | Date): string => {
    return defaultBusinessCalendar.formatShortMonthYear(date)
}

/**
 * Tiempo relativo con meses/años (útil para “desde primer pedido”).
 */
export const formatTimeAgoCalendar = (dateString: string | undefined | null): string => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    if (days < 0) return '—'
    if (days === 0) return 'hoy'
    if (days === 1) return 'ayer'
    if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
    if (days < 30) {
        const w = Math.floor(days / 7)
        return `hace ${w} ${w === 1 ? 'semana' : 'semanas'}`
    }
    if (days < 365) {
        const months = Math.floor(days / 30)
        return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
    }
    const years = Math.floor(days / 365)
    return `hace ${years} ${years === 1 ? 'año' : 'años'}`
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
        formatDateLong,
        formatDateShort,
        formatDateTimeCompact,
        formatDayShortMonth,
        formatShortMonthYear,
        formatTime,
        formatTime12h,
        formatTimeAgo,
        formatTimeAgoCalendar,
        formatDurationInCurrentStatus,
        orderStatusToStatusTimesKey,
        getStatusTimeFromRecord,
        truncateText,
        capitalizeFirst,
        getOrderStatusDisplayName,
        getOrderTypeDisplayName
    }
}
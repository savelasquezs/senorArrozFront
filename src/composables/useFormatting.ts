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
export const formatDate = (date: string | Date): string => {
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

// Exportar como objeto para uso en composables
export const useFormatting = () => {
    return {
        formatCurrency,
        formatNumber,
        formatDate,
        formatDateShort,
        truncateText,
        capitalizeFirst
    }
}
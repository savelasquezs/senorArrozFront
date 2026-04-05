export interface ParsedMapsCoords {
    lat: number
    lng: number
}

function validateLatLng(lat: number, lng: number): string | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return 'Las coordenadas del enlace no son números válidos.'
    }
    if (lat < -90 || lat > 90) {
        return 'La latitud debe estar entre -90 y 90.'
    }
    if (lng < -180 || lng > 180) {
        return 'La longitud debe estar entre -180 y 180.'
    }
    return null
}

/**
 * Extrae lat/lng de una URL de Google Maps copiada del navegador.
 * Prioridad: par !3d…!4d… (pin del lugar), luego @lat,lng del centro de vista.
 * Enlaces acortados: no se resuelven en el cliente.
 */
export function parseGoogleMapsUrl(raw: string): { ok: true; coords: ParsedMapsCoords } | { ok: false; message: string } {
    const url = raw.trim()
    if (!url) {
        return { ok: false, message: 'Pega un enlace de Google Maps.' }
    }

    let decoded = url
    try {
        decoded = decodeURIComponent(url)
    } catch {
        decoded = url
    }

    const pinMatch = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
    if (pinMatch) {
        const lat = parseFloat(pinMatch[1])
        const lng = parseFloat(pinMatch[2])
        const err = validateLatLng(lat, lng)
        if (err) return { ok: false, message: err }
        return { ok: true, coords: { lat, lng } }
    }

    const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (atMatch) {
        const lat = parseFloat(atMatch[1])
        const lng = parseFloat(atMatch[2])
        const err = validateLatLng(lat, lng)
        if (err) return { ok: false, message: err }
        return { ok: true, coords: { lat, lng } }
    }

    return {
        ok: false,
        message:
            'No se encontraron coordenadas en el enlace. Copia la URL completa desde el navegador (los enlaces acortados no funcionan aquí) o busca la dirección arriba.',
    }
}

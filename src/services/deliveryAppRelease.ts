/** Debe alinearse con el entero después de `+` en delivery_app/pubspec.yaml. */
export const DELIVERY_APP_ACK_STORAGE_KEY = 'delivery_app_ack_build'

export interface DeliveryAppReleaseManifest {
	versionName: string
	buildNumber: number
	apkFileName: string
	apkUrl: string
	minimumBuild: number
	message: string
}

function isManifest(x: unknown): x is DeliveryAppReleaseManifest {
	if (!x || typeof x !== 'object') return false
	const o = x as Record<string, unknown>
	return (
		typeof o.versionName === 'string' &&
		typeof o.buildNumber === 'number' &&
		Number.isFinite(o.buildNumber) &&
		typeof o.apkFileName === 'string' &&
		typeof o.apkUrl === 'string' &&
		typeof o.minimumBuild === 'number' &&
		Number.isFinite(o.minimumBuild) &&
		typeof o.message === 'string'
	)
}

export async function fetchDeliveryAppRelease(): Promise<DeliveryAppReleaseManifest> {
	const res = await fetch(`/delivery-app-release.json?t=${Date.now()}`)
	if (!res.ok) {
		throw new Error('No se pudo obtener la información de versión de la app')
	}
	const data: unknown = await res.json()
	if (!isManifest(data)) {
		throw new Error('Manifiesto de versión inválido')
	}
	return data
}

export function getDeliveryAppAckBuild(): number | null {
	const v = localStorage.getItem(DELIVERY_APP_ACK_STORAGE_KEY)
	if (v == null || v === '') return null
	const n = parseInt(v, 10)
	return Number.isFinite(n) ? n : null
}

export function setDeliveryAppAckBuild(buildNumber: number): void {
	localStorage.setItem(DELIVERY_APP_ACK_STORAGE_KEY, String(buildNumber))
}

export function needsDeliveryAppUpdate(manifest: DeliveryAppReleaseManifest): boolean {
	const ack = getDeliveryAppAckBuild()
	if (ack === null) return manifest.buildNumber > 0
	return manifest.buildNumber > ack
}

/**
 * Si el usuario no ha reconocido al menos minimumBuild, no puede posponer el aviso
 * (solo descargar o, tras actualizar el ack, continuar).
 */
export function canDeferDeliveryAppUpdate(manifest: DeliveryAppReleaseManifest): boolean {
	const ack = getDeliveryAppAckBuild()
	const effectiveAck = ack ?? 0
	return effectiveAck >= manifest.minimumBuild
}

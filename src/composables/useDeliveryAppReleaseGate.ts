import { ref, computed } from 'vue'
import {
	fetchDeliveryAppRelease,
	needsDeliveryAppUpdate,
	canDeferDeliveryAppUpdate,
	type DeliveryAppReleaseManifest,
} from '@/services/deliveryAppRelease'

/** Una comprobación por pestaña tras login ya existente (sin pasar por LoginForm). */
export const DELIVERY_APP_RELEASE_SESSION_KEY = 'delivery_app_release_checked_this_session'

export function useDeliveryAppReleaseGate() {
	const showReleaseDialog = ref(false)
	const releaseManifest = ref<DeliveryAppReleaseManifest | null>(null)
	let releaseDoneResolver: (() => void) | null = null

	const allowReleaseClose = computed(() =>
		releaseManifest.value ? canDeferDeliveryAppUpdate(releaseManifest.value) : false
	)

	function onReleaseDone() {
		releaseDoneResolver?.()
		releaseDoneResolver = null
	}

/**
	 * Si hay versión publicada más nueva que el último ack en localStorage,
	 * abre el diálogo y resuelve cuando el usuario descarga o cierra (según reglas).
	 */
	async function runGateIfNeeded(): Promise<void> {
		try {
			const manifest = await fetchDeliveryAppRelease()
			if (!needsDeliveryAppUpdate(manifest)) return
			releaseManifest.value = manifest
			showReleaseDialog.value = true
			await new Promise<void>((resolve) => {
				releaseDoneResolver = resolve
			})
		} catch (e) {
			console.warn('[deliveryAppRelease]', e)
		}
	}

	return {
		showReleaseDialog,
		releaseManifest,
		allowReleaseClose,
		onReleaseDone,
		runGateIfNeeded,
	}
}

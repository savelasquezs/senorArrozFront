<template>
	<BaseDialog
		:model-value="modelValue"
		title="Actualizar app de domiciliarios"
		size="md"
		:show-close-button="allowClose"
		:close-on-backdrop="allowClose"
		@update:model-value="onDialogModelUpdate"
	>
		<div class="space-y-3 text-sm text-gray-700">
			<p class="font-medium text-gray-900">
				Versión publicada: {{ manifest.versionName }} (build {{ manifest.buildNumber }})
			</p>
			<p>{{ manifest.message }}</p>
		</div>
		<template #footer>
			<BaseButton type="button" variant="outline" size="sm" :disabled="!canDefer" @click="onDefer">
				Continuar sin descargar
			</BaseButton>
			<a
				:href="manifest.apkUrl"
				class="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
				download
				@click="onDownloadClick"
			>
				Descargar APK
			</a>
		</template>
	</BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { DeliveryAppReleaseManifest } from '@/services/deliveryAppRelease'
import { canDeferDeliveryAppUpdate, setDeliveryAppAckBuild } from '@/services/deliveryAppRelease'
import { computed } from 'vue'

const props = defineProps<{
	modelValue: boolean
	manifest: DeliveryAppReleaseManifest
	/** Si false, no se cierra con X ni backdrop (obligatorio usar Descargar). */
	allowClose?: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	done: []
}>()

const canDefer = computed(() => canDeferDeliveryAppUpdate(props.manifest))

function onDialogModelUpdate(v: boolean) {
	emit('update:modelValue', v)
	if (!v) {
		if (canDefer.value) {
			setDeliveryAppAckBuild(props.manifest.buildNumber)
		}
		emit('done')
	}
}

function onDefer() {
	if (!canDefer.value) return
	setDeliveryAppAckBuild(props.manifest.buildNumber)
	emit('update:modelValue', false)
	emit('done')
}

function onDownloadClick() {
	setDeliveryAppAckBuild(props.manifest.buildNumber)
	emit('update:modelValue', false)
	emit('done')
}
</script>

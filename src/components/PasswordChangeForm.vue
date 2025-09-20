<!-- src/components/PasswordChangeForm.vue -->
<template>
	<BaseCard class="w-full max-w-md mx-auto" padding="lg" shadow="lg">
		<template #header>
			<div class="text-center">
				<div
					class="mx-auto h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mb-4"
				>
					<LockClosedIcon class="h-6 w-6 text-primary-600" />
				</div>
				<h2 class="text-2xl font-bold text-gray-900">Cambiar Contraseña</h2>
				<p class="mt-2 text-sm text-gray-600">
					Actualiza tu contraseña de acceso
				</p>
			</div>
		</template>

		<form @submit.prevent="handleSubmit" class="space-y-6">
			<!-- Alertas de error -->
			<div
				v-if="authStore.error"
				class="bg-red-50 border border-red-200 rounded-md p-4"
			>
				<div class="flex">
					<XCircleIcon class="h-5 w-5 text-red-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<p class="mt-1 text-sm text-red-700">{{ authStore.error }}</p>
					</div>
				</div>
			</div>

			<!-- Alertas de éxito -->
			<div
				v-if="successMessage"
				class="bg-green-50 border border-green-200 rounded-md p-4"
			>
				<div class="flex">
					<CheckCircleIcon class="h-5 w-5 text-green-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-green-800">Éxito</h3>
						<p class="mt-1 text-sm text-green-700">{{ successMessage }}</p>
					</div>
				</div>
			</div>

			<!-- Inputs -->
			<BaseInput
				v-model="form.currentPassword"
				label="Contraseña actual"
				type="password"
				placeholder="••••••••"
				required
				:error="errors.currentPassword"
				@blur="validateCurrentPassword"
			>
				<template #icon>
					<LockClosedIcon class="h-5 w-5 text-gray-400" />
				</template>
			</BaseInput>

			<BaseInput
				v-model="form.newPassword"
				label="Nueva contraseña"
				type="password"
				placeholder="••••••••"
				required
				:error="errors.newPassword"
				@blur="validateNewPassword"
			>
				<template #icon>
					<LockClosedIcon class="h-5 w-5 text-gray-400" />
				</template>
			</BaseInput>

			<BaseInput
				v-model="form.confirmPassword"
				label="Confirmar nueva contraseña"
				type="password"
				placeholder="••••••••"
				required
				:error="errors.confirmPassword"
				@blur="validateConfirmPassword"
			>
				<template #icon>
					<LockClosedIcon class="h-5 w-5 text-gray-400" />
				</template>
			</BaseInput>

			<!-- Botón de envío -->
			<BaseButton
				type="submit"
				variant="primary"
				size="lg"
				full-width
				:loading="authStore.isLoading"
				loading-text="Cambiando contraseña..."
				:disabled="!isFormValid"
			>
				Cambiar Contraseña
			</BaseButton>
		</form>
	</BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// ✅ Componentes base
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

// ✅ Heroicons
import {
	LockClosedIcon,
	XCircleIcon,
	CheckCircleIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
});

const errors = ref({
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
});

const successMessage = ref('');

const isFormValid = computed(() => {
	return (
		form.currentPassword &&
		form.newPassword &&
		form.confirmPassword &&
		!errors.value.currentPassword &&
		!errors.value.newPassword &&
		!errors.value.confirmPassword
	);
});

const validateCurrentPassword = () => {
	errors.value.currentPassword = '';
	if (!form.currentPassword) {
		errors.value.currentPassword = 'La contraseña actual es requerida';
	} else if (form.currentPassword.length < 6) {
		errors.value.currentPassword =
			'La contraseña debe tener al menos 6 caracteres';
	}
};

const validateNewPassword = () => {
	errors.value.newPassword = '';
	if (!form.newPassword) {
		errors.value.newPassword = 'La nueva contraseña es requerida';
	} else if (form.newPassword.length < 6) {
		errors.value.newPassword = 'La contraseña debe tener al menos 6 caracteres';
	} else if (form.newPassword === form.currentPassword) {
		errors.value.newPassword =
			'La nueva contraseña debe ser diferente a la actual';
	}
	if (form.confirmPassword) validateConfirmPassword();
};

const validateConfirmPassword = () => {
	errors.value.confirmPassword = '';
	if (!form.confirmPassword) {
		errors.value.confirmPassword = 'La confirmación de contraseña es requerida';
	} else if (form.confirmPassword !== form.newPassword) {
		errors.value.confirmPassword = 'Las contraseñas no coinciden';
	}
};

const handleSubmit = async () => {
	authStore.clearError();
	successMessage.value = '';

	validateCurrentPassword();
	validateNewPassword();
	validateConfirmPassword();

	if (!isFormValid.value) return;

	try {
		await authStore.changePassword({
			currentPassword: form.currentPassword,
			newPassword: form.newPassword,
			confirmPassword: form.confirmPassword,
		});
		successMessage.value = 'Contraseña actualizada correctamente';
		form.currentPassword = '';
		form.newPassword = '';
		form.confirmPassword = '';
		setTimeout(() => router.push('/dashboard'), 1500);
	} catch (error) {
		console.error('Error al cambiar contraseña:', error);
	}
};
</script>

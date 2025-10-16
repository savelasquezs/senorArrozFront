<template>
	<BaseCard class="w-full max-w-md mx-auto">
		<template #header>
			<h2 class="text-xl font-bold text-gray-800">Restablecer contraseña</h2>
		</template>

		<div class="space-y-5">
			<p class="text-sm text-gray-600">
				Ingresa tu nueva contraseña para restablecer tu cuenta.
			</p>

			<BaseInput
				v-model="form.newPassword"
				label="Nueva contraseña"
				type="password"
				placeholder="Ingresa tu nueva contraseña"
				:error="errors.newPassword"
				@blur="validateNewPassword"
			/>

			<BaseInput
				v-model="form.confirmPassword"
				label="Confirmar contraseña"
				type="password"
				placeholder="Confirma tu nueva contraseña"
				:error="errors.confirmPassword"
				@blur="validateConfirmPassword"
			/>

			<BaseAlert
				v-if="authStore.error"
				type="error"
				:message="authStore.error"
			/>

			<BaseAlert
				v-if="successMessage"
				type="success"
				:message="successMessage"
			/>
		</div>

		<template #footer>
			<BaseButton
				@click="handleSubmit"
				:loading="authStore.isLoading"
				:disabled="!isFormValid || authStore.isLoading"
				full-width
			>
				Restablecer contraseña
			</BaseButton>
		</template>
	</BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue'; // ✅ Nuevo componente

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Estado del formulario
const form = reactive({
	token: '',
	email: '',
	newPassword: '',
	confirmPassword: '',
});

const errors = reactive({
	newPassword: '',
	confirmPassword: '',
});

const successMessage = ref('');
const tokenValid = ref(true);

onMounted(() => {
	const token = route.query.token as string;
	const email = route.query.email as string;

	if (!token || !email) {
		tokenValid.value = false;
		authStore.error = 'Enlace de restablecimiento inválido o expirado';
		return;
	}

	form.token = token;
	form.email = email;
});

const validateNewPassword = () => {
	errors.newPassword = '';

	if (!form.newPassword) {
		errors.newPassword = 'La nueva contraseña es requerida';
	} else if (form.newPassword.length < 6) {
		errors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
	}

	if (form.confirmPassword) {
		validateConfirmPassword();
	}
};

const validateConfirmPassword = () => {
	errors.confirmPassword = '';

	if (!form.confirmPassword) {
		errors.confirmPassword = 'La confirmación de contraseña es requerida';
	} else if (form.confirmPassword !== form.newPassword) {
		errors.confirmPassword = 'Las contraseñas no coinciden';
	}
};

const isFormValid = computed(() => {
	return (
		tokenValid.value &&
		form.token &&
		form.email &&
		form.newPassword &&
		form.confirmPassword &&
		!errors.newPassword &&
		!errors.confirmPassword
	);
});

const handleSubmit = async () => {
	authStore.clearError();
	successMessage.value = '';

	validateNewPassword();
	validateConfirmPassword();

	if (!isFormValid.value) return;

	try {
		await authStore.resetPassword({
			token: form.token,
			email: form.email,
			newPassword: form.newPassword,
			confirmPassword: form.confirmPassword,
		});

		successMessage.value = 'Contraseña restablecida correctamente';

		setTimeout(() => {
			router.push('/login');
		}, 2000);
	} catch (error) {
		// Error ya se maneja en el store
	}
};
</script>

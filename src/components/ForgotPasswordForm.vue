<template>
	<BaseCard class="w-full max-w-md mx-auto">
		<template #header>
			<h2 class="text-xl font-bold text-[#009639]">Recuperar contraseña</h2>
		</template>

		<div class="space-y-5">
			<p class="text-sm text-gray-600">
				Ingresa tu correo electrónico y te enviaremos un enlace para restablecer
				tu contraseña.
			</p>

			<BaseInput
				v-model="email"
				label="Correo electrónico"
				type="email"
				placeholder="correo@ejemplo.com"
				:error="errors.email"
				@blur="validateEmail"
			/>

			<BaseAlert
				v-if="authStore.error"
				type="error"
				:message="authStore.error"
			/>

			<BaseAlert
				v-if="successMessage"
				type="success"
				class="!bg-[#E6F4EA] !text-[#009639] !border-[#B5E0C1]"
				:message="successMessage"
			/>
		</div>

		<template #footer>
			<div class="flex justify-between items-center">
				<RouterLink
					to="/login"
					class="text-sm text-[#009639] hover:text-[#007A30] font-medium transition-colors"
				>
					Volver al inicio de sesión
				</RouterLink>

				<BaseButton
					@click="handleSubmit"
					variant="primary"
					class="bg-[#009639] hover:bg-[#007A30] focus:ring-[#009639]"
					:loading="authStore.isLoading"
					:disabled="!isFormValid || authStore.isLoading"
				>
					Enviar enlace
				</BaseButton>
			</div>
		</template>
	</BaseCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/auth';

import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const authStore = useAuthStore();

const email = ref('');
const errors = ref({ email: '' });
const successMessage = ref('');

const validateEmail = () => {
	errors.value.email = '';

	if (!email.value) {
		errors.value.email = 'El correo electrónico es requerido';
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
		errors.value.email = 'Ingresa un correo electrónico válido';
	}
};

const isFormValid = computed(() => email.value && !errors.value.email);

const handleSubmit = async () => {
	authStore.clearError();
	successMessage.value = '';

	validateEmail();

	if (!isFormValid.value) return;

	try {
		const response = await authStore.forgotPassword(email.value);
		successMessage.value = response.message;
		email.value = '';
	} catch (error) {
		// Se maneja en el store
	}
};
</script>

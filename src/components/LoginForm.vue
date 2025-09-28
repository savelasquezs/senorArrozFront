<!-- src/components/LoginForm.vue -->
<template>
	<BaseCard class="w-full max-w-md mx-auto" padding="lg" shadow="lg">
		<template #header>
			<div class="text-center">
				<div class="mx-auto h-12 w-12 bg-[#FFF5F0] rounded-full flex items-center justify-center">
					<UserIcon class="h-6 w-6 text-[#E94E1B]" />
				</div>
			</div>
		</template>

		<form @submit.prevent="handleSubmit" class="space-y-6">
			<BaseAlert v-if="authStore.error" type="error" :message="authStore.error" title="Error de autenticación" />

			<BaseInput v-model="form.email" label="Correo electrónico" type="email" placeholder="tu-email@ejemplo.com"
				required :error="errors.email" @blur="validateEmail">
				<template #icon>
					<AtSymbolIcon class="h-5 w-5 text-gray-400" />
				</template>
			</BaseInput>

			<BaseInput v-model="form.password" label="Contraseña" type="password" placeholder="••••••••" required
				:error="errors.password" @blur="validatePassword">
				<template #icon>
					<LockClosedIcon class="h-5 w-5 text-gray-400" />
				</template>
			</BaseInput>

			<div class="flex items-center justify-between">
				<label class="flex items-center">
					<input v-model="form.rememberMe" type="checkbox"
						class="h-4 w-4 text-[#E94E1B] focus:ring-[#E94E1B] border-gray-300 rounded" />
					<span class="ml-2 block text-sm text-gray-900">Recordarme</span>
				</label>

				<RouterLink to="/forgot-password"
					class="text-sm text-[#E94E1B] hover:text-[#D04417] font-medium transition-colors">
					¿Olvidaste tu contraseña?
				</RouterLink>
			</div>

			<BaseButton type="submit" variant="primary" size="lg" full-width :loading="authStore.isLoading"
				loading-text="Iniciando sesión..." :disabled="!isFormValid"
				class="bg-[#009639] hover:bg-[#007A30] focus:ring-[#009639]">
				Iniciar Sesión
			</BaseButton>
		</form>
	</BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/composables/useToast';

import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

import {
	UserIcon,
	AtSymbolIcon,
	LockClosedIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();
const { success, error: showError } = useToast();

const form = reactive({
	email: '',
	password: '',
	rememberMe: false,
});

const errors = ref({
	email: '',
	password: '',
});

const isFormValid = computed(() => {
	return (
		form.email && form.password && !errors.value.email && !errors.value.password
	);
});

const validateEmail = () => {
	errors.value.email = '';
	if (!form.email) {
		errors.value.email = 'El correo electrónico es requerido';
	} else if (!/\S+@\S+\.\S+/.test(form.email)) {
		errors.value.email = 'El correo electrónico no es válido';
	}
};

const validatePassword = () => {
	errors.value.password = '';
	if (!form.password) {
		errors.value.password = 'La contraseña es requerida';
	} else if (form.password.length < 6) {
		errors.value.password = 'La contraseña debe tener al menos 6 caracteres';
	}
};

const handleSubmit = async () => {
	authStore.clearError();
	validateEmail();
	validatePassword();

	if (!isFormValid.value) return;

	try {
		await authStore.login({
			email: form.email,
			password: form.password,
		});

		success('Inicio de sesión exitoso', 3000, `Bienvenido ${authStore.user?.name || ''}`);
		const redirectPath = getRedirectPath(authStore.userRole);
		await router.push(redirectPath);
	} catch (error: any) {
		console.error('Login failed:', error);
		showError('Error de autenticación', error.message || 'Credenciales incorrectas');
	}
};

const getRedirectPath = (role: string | null): string => {
	switch (role) {
		case 'superadmin':
			return '/dashboard/global';
		case 'admin':
			return '/dashboard/branch';
		case 'cashier':
			return '/orders';
		case 'kitchen':
			return '/kitchen';
		case 'deliveryman':
			return '/delivery';
		default:
			return '/dashboard';
	}
};

onMounted(() => {
	authStore.clearError();
	if (import.meta.env.DEV) {
		form.email = 'santyvano@outlook.com';
	}
});
</script>

<template>
	<div class="relative" ref="menuRef">
		<button
			type="button"
			class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
			@click="open = !open"
		>
			<div
				class="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm"
			>
				<span class="text-sm font-medium text-white">{{ initials }}</span>
			</div>
			<span class="ml-2 text-sm font-medium text-gray-700">{{ userName }}</span>
			<svg
				class="ml-1 h-4 w-4 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</button>

		<div
			v-if="open"
			class="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-lg bg-white border border-gray-100 z-50"
		>
			<div class="py-1">
				<router-link
					to="/profile"
					class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
					@click="open = false"
				>
					👤 Mi perfil
				</router-link>
				<router-link
					to="/change-password"
					class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
					@click="open = false"
				>
					🔑 Cambiar contraseña
				</router-link>
				<button
					@click="logout"
					class="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
				>
					🚪 Cerrar sesión
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
const router = useRouter();

const open = ref(false);
const menuRef = ref<HTMLElement>();
const userName = computed(() => authStore.userName);
const initials = computed(() =>
	authStore.userName
		.split(' ')
		.map((n) => n[0])
		.join('')
		.substring(0, 2)
);

const logout = async () => {
	await authStore.logout();
	await router.push('/login');
};

const handleClickOutside = (e: Event) => {
	if (menuRef.value && !menuRef.value.contains(e.target as Node))
		open.value = false;
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

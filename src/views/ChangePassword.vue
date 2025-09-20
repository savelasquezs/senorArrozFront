<!-- src/views/ChangePassword.vue -->
<template>
	<MainLayout>
		<div
			class="h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
		>
			<div class="sm:mx-auto sm:w-full sm:max-w-md">
				<h1 class="text-center text-3xl font-extrabold text-gray-900">
					Señor Arroz
				</h1>
			</div>
			<PasswordChangeForm />
		</div>
	</MainLayout>
</template>

<script setup lang="ts">
import PasswordChangeForm from '@/components/PasswordChangeForm.vue';
import MainLayout from '@/components/layout/MainLayout.vue';
</script>

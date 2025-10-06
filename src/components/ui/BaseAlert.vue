<template>
	<div
		:class="[
			'p-3 rounded-md text-sm flex items-center gap-2',
			type === 'error' && 'bg-red-100 text-red-700',
			type === 'success' && 'bg-green-100 text-green-700',
			type === 'info' && 'bg-blue-100 text-blue-700',
			type === 'warning' && 'bg-yellow-100 text-yellow-700',
		]"
	>
		<slot>
			{{ message }}
		</slot>
	</div>
</template>

<script setup lang="ts">
interface Props {
	type?: 'error' | 'success' | 'info' | 'warning';
	message?: string;
}

withDefaults(defineProps<Props>(), {
	type: 'info',
	message: '',
});
</script>

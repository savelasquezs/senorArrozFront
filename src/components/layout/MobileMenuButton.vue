<template>
	<button
		type="button"
		class="lg:hidden p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
		@click="$emit('toggle')"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	</button>
</template>

<script setup lang="ts">
defineEmits<{ toggle: [] }>();
</script>

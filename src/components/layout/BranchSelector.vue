<template>
	<select
		class="text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
	>
		<option>{{ branchName }}</option>
		<!-- Se pueden renderizar otras sucursales si vienen del store -->
	</select>
</template>

<script setup lang="ts">
defineProps<{ branchName: string }>();
</script>

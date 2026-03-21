<template>
	<BaseCard title="Gastos" :padding="'md'">
		<p class="text-sm text-gray-600">
			Esta sección mostrará el resumen de gastos cuando exista el endpoint correspondiente. Por ahora no hay
			datos cargados aquí (carga por vista, sin query monolítica del dashboard).
		</p>
	</BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
</script>

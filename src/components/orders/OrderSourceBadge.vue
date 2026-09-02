<template>
    <span
        v-if="isWebOrder"
        class="inline-flex shrink-0 items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-inset ring-sky-200"
        title="Pedido recibido desde la página web"
    >
        Web
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    source?: string | null
}>()

const isWebOrder = computed(() => props.source?.trim().toLowerCase() === 'web')
</script>

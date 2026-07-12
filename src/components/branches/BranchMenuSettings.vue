<template>
  <BaseCard>
    <h3 class="text-base font-semibold text-gray-900">Carta pública</h3>
    <p class="mt-1 text-sm text-gray-500">Carga hasta dos imágenes. La dirección pública permanece igual cuando las reemplazas.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div v-for="slot in ([1, 2] as const)" :key="slot" class="rounded-lg border border-gray-200 p-3">
        <p class="mb-2 text-sm font-medium">Imagen {{ slot }}</p>
        <img v-if="image(slot)" :src="image(slot)!" class="mb-3 max-h-64 w-full rounded-lg object-contain bg-gray-50" :alt="`Carta ${slot}`" />
        <div class="flex flex-wrap gap-2"><label class="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">{{ image(slot) ? 'Reemplazar' : 'Cargar' }}<input type="file" accept="image/*" class="hidden" @change="upload(slot, $event)" /></label><BaseButton v-if="image(slot)" variant="danger" size="sm" @click="remove(slot)">Eliminar</BaseButton></div>
      </div>
    </div>
    <a :href="publicUrl" target="_blank" rel="noopener" class="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">Ver carta pública</a>
  </BaseCard>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'; import BaseButton from '@/components/ui/BaseButton.vue'
import { branchMenuApi, type BranchMenu } from '@/services/MainAPI/branchMenuApi'
const props = defineProps<{ branchId: number }>(); const menu = ref<BranchMenu | null>(null)
const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '')
const publicUrl = computed(() => `${apiBase}/api/public/menu?branchId=${props.branchId}`)
const image = (slot: 1 | 2) => slot === 1 ? menu.value?.imageUrl1 : menu.value?.imageUrl2
async function load() { menu.value = (await branchMenuApi.getMenu(props.branchId)).data }
async function upload(slot: 1 | 2, event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) menu.value = (await branchMenuApi.upload(props.branchId, slot, file)).data }
async function remove(slot: 1 | 2) { await branchMenuApi.remove(props.branchId, slot); await load() }
onMounted(load)
</script>

<template>
  <button v-if="imageUrl" type="button" class="wa-avatar wa-avatar-photo"
    :aria-label="`Ver foto de ${name}`" :title="`Ver foto de ${name}`" @click.stop="emit('open', imageUrl)">
    <img :src="imageUrl" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="failedUrl = imageUrl" />
  </button>
  <span v-else class="wa-avatar" aria-hidden="true">
    <span v-if="initials">{{ initials }}</span>
    <UserIcon v-else class="size-3.5" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UserIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ name: string; url?: string | null }>()
const emit = defineEmits<{ open: [url: string] }>()
const failedUrl = ref<string | null>()
const imageUrl = computed(() => props.url && props.url !== failedUrl.value ? props.url : null)
const initials = computed(() => props.name.match(/\p{L}[\p{L}\p{M}]*/gu)?.slice(0, 2)
  .map(word => Array.from(word)[0]).join('').toLocaleUpperCase('es-CO'))
</script>

<style scoped>
.wa-avatar {
  display: inline-grid; width: var(--wa-avatar-size, 1.375rem); height: var(--wa-avatar-size, 1.375rem);
  flex: none; place-items: center; overflow: hidden; border-radius: 50%; border: 1px solid var(--wa-line);
  background: var(--wa-selected); color: var(--wa-focus); font-size: .625rem; font-weight: 700;
}
.wa-avatar-photo { position: relative; z-index: 20; cursor: zoom-in; }
.wa-avatar-photo img { width: 100%; height: 100%; object-fit: cover; }
</style>

<template>
  <div class="message-actions flex items-center gap-0.5 rounded-lg border border-emerald-100 bg-white p-0.5 text-slate-600 shadow-sm"
    :class="{ 'is-open': open }">
    <button v-if="canSend" type="button" class="message-action" title="Responder a este mensaje" aria-label="Responder a este mensaje"
      :disabled="busy" @click="emit('reply')">
      <ArrowUturnLeftIcon class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
    <div v-if="canSend" class="relative" @keydown.esc.stop="open && emit('toggle')">
      <button type="button" class="message-action" title="Reaccionar" aria-label="Reaccionar"
        :aria-expanded="open" :disabled="busy" @click="emit('toggle')">
        <FaceSmileIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <Transition name="reaction-pop">
        <div v-if="open" class="absolute top-full z-30 mt-1 flex gap-1 rounded-xl border border-emerald-100 bg-white p-1 shadow-lg"
          :class="outbound ? 'right-0' : 'left-0'" role="group" aria-label="Reacciones disponibles">
          <button v-for="{ emoji, label } in choices" :key="emoji" type="button"
            class="reaction-option grid size-8 shrink-0 place-items-center rounded-lg text-xl leading-none hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            :class="{ 'bg-emerald-100 ring-1 ring-emerald-300': currentReaction === emoji }"
            :title="currentReaction === emoji ? `Quitar ${label}` : label"
            :aria-label="currentReaction === emoji ? `Quitar ${label}` : label" :aria-pressed="currentReaction === emoji"
            :disabled="busy" @click="emit('react', currentReaction === emoji ? '' : emoji)">{{ emoji }}</button>
        </div>
      </Transition>
    </div>
    <button type="button" class="message-action hover:text-red-700" title="Ocultar en el POS" aria-label="Ocultar en el POS"
      :disabled="busy" @click="emit('hide')">
      <TrashIcon class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowUturnLeftIcon, FaceSmileIcon, TrashIcon } from '@heroicons/vue/24/outline'

defineProps<{ canSend: boolean; open: boolean; outbound: boolean; busy: boolean; currentReaction?: string | null }>()
const emit = defineEmits<{ reply: []; toggle: []; hide: []; react: [emoji: string] }>()
const choices = [
  { emoji: '👍', label: 'Me gusta' },
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '😂', label: 'Me divierte' },
  { emoji: '😮', label: 'Sorpresa' },
  { emoji: '😢', label: 'Tristeza' },
  { emoji: '🙌', label: 'Celebrar' },
]
</script>

<style scoped>
.message-action {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border-radius: .375rem;
}
.message-action:hover { background: var(--color-emerald-50); }
.message-action:focus-visible { outline: 2px solid var(--color-emerald-700); }
.message-action:disabled { opacity: .5; }
.reaction-pop-enter-active, .reaction-pop-leave-active { transition: transform 140ms ease, opacity 140ms ease; }
.reaction-pop-enter-from, .reaction-pop-leave-to { transform: translateY(-.22rem) scale(.94); opacity: 0; }
.reaction-option { transition: transform 140ms ease, background-color 140ms ease; }
.reaction-option:hover, .reaction-option:focus-visible { transform: translateY(-.125rem) scale(1.13); }
@media (prefers-reduced-motion: reduce) {
  .reaction-pop-enter-active, .reaction-pop-leave-active, .reaction-option { transition: none; }
  .reaction-option:hover, .reaction-option:focus-visible { transform: none; }
}
</style>

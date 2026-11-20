<template>
  <div ref="tools" class="message-tools" :class="{ 'wa-tools-open': open || touchOpen, outbound }"
    @keydown.esc.stop="closeMenu" @focusout="closeTouchOnBlur">
    <button ref="touchTrigger" type="button" class="message-touch-toggle message-action" aria-label="Acciones del mensaje"
      :aria-expanded="touchOpen" @click="touchOpen = !touchOpen">
      <EllipsisHorizontalIcon class="size-4" aria-hidden="true" />
    </button>
    <div class="message-actions" role="group" aria-label="Acciones del mensaje">
      <button type="button" class="message-action" :title="sendUnavailableReason || 'Responder a este mensaje'" aria-label="Responder a este mensaje"
        :aria-description="sendUnavailableReason" :aria-disabled="!canSend || busy" :tabindex="canSend ? 0 : -1"
        @click="canSend && !busy && emit('reply')">
        <ArrowUturnLeftIcon class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button ref="reactionTrigger" type="button" class="message-action" :title="sendUnavailableReason || 'Reaccionar'" aria-label="Reaccionar"
        :aria-description="sendUnavailableReason" :aria-expanded="canSend ? open : undefined" :aria-disabled="!canSend || busy"
        :tabindex="canSend ? 0 : -1" @click="canSend && !busy && emit('toggle')">
        <FaceSmileIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <button v-if="canCopy" type="button" class="message-action" title="Copiar mensaje" aria-label="Copiar mensaje"
        @click="emit('copy')">
        <ClipboardDocumentIcon class="size-3.5" aria-hidden="true" />
      </button>
      <button v-if="stickerAction" type="button" class="message-action"
        :title="stickerLabel" :aria-label="stickerLabel" :aria-pressed="stickerAction === 'remove'"
        :disabled="stickerBusy" @click="emit('sticker')">
        <component :is="stickerAction === 'remove' ? FilledStarIcon : StarIcon" class="size-3.5" aria-hidden="true" />
      </button>
      <button v-if="canForward" type="button" class="message-action" title="Reenviar mensaje" aria-label="Reenviar mensaje"
        :disabled="busy" @click="emit('forward')">
        <ArrowUturnRightIcon class="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" class="message-action hover:text-red-700" :title="hideUnavailableReason || 'Ocultar en el POS'" aria-label="Ocultar en el POS"
        :aria-description="hideUnavailableReason" :aria-disabled="!!hideUnavailableReason || busy" :tabindex="hideUnavailableReason ? -1 : 0"
        @click="!hideUnavailableReason && !busy && emit('hide')">
        <TrashIcon class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
    <Transition name="reaction-pop">
      <div v-if="canSend && open" class="reaction-choices flex flex-wrap gap-1 rounded-xl p-1"
        role="group" aria-label="Reacciones disponibles">
        <button v-for="{ emoji, label } in choices" :key="emoji" type="button"
          class="reaction-option grid size-8 shrink-0 place-items-center rounded-lg text-xl leading-none hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          :class="{ 'bg-emerald-100 ring-1 ring-emerald-300': currentReaction === emoji }"
          :title="currentReaction === emoji ? `Quitar ${label}` : label"
          :aria-label="currentReaction === emoji ? `Quitar ${label}` : label" :aria-pressed="currentReaction === emoji"
          :disabled="busy" @click="emit('react', currentReaction === emoji ? '' : emoji)">{{ emoji }}</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, ClipboardDocumentIcon, EllipsisHorizontalIcon, FaceSmileIcon, StarIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { StarIcon as FilledStarIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  sendUnavailableReason?: string; hideUnavailableReason?: string; open: boolean; outbound: boolean; busy: boolean; currentReaction?: string | null
  stickerAction?: 'save' | 'remove'; stickerBusy?: boolean; canForward?: boolean; canCopy?: boolean
}>()
const canSend = computed(() => !props.sendUnavailableReason)
const stickerLabel = computed(() => props.stickerAction === 'remove' ? 'Quitar sticker de guardados' : 'Guardar sticker')
const emit = defineEmits<{ reply: []; toggle: []; hide: []; react: [emoji: string]; sticker: []; forward: []; copy: [] }>()
const tools = ref<HTMLElement>()
const touchTrigger = ref<HTMLButtonElement>()
const reactionTrigger = ref<HTMLButtonElement>()
const touchOpen = ref(false)

function closeMenu() {
  if (props.open) {
    emit('toggle')
    reactionTrigger.value?.focus()
  } else if (touchOpen.value) {
    touchOpen.value = false
    touchTrigger.value?.focus()
  }
}

function closeTouchOnBlur(event: FocusEvent) {
  if (!props.open && !tools.value?.contains(event.relatedTarget as Node | null)) touchOpen.value = false
}
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
.message-actions, .message-touch-toggle {
  position: absolute; z-index: 5; top: 50%; inset-inline-start: calc(100% + 4px);
  transform: translateY(-50%); border: 1px solid var(--wa-line); background: var(--wa-panel);
  box-shadow: 0 .25rem .875rem var(--wa-shadow); color: var(--wa-text);
}
.outbound :is(.message-actions, .message-touch-toggle) { inset-inline-start: auto; inset-inline-end: calc(100% + 4px); }
.message-actions {
  display: flex; gap: 1px; padding: 2px; border-radius: .5rem;
  opacity: 0; pointer-events: none; transform: translate(-3px, -50%) scale(.96);
  transition: opacity 110ms ease, transform 150ms cubic-bezier(.2, 0, .38, .9);
}
.outbound .message-actions { transform: translate(3px, -50%) scale(.96); }
.message-actions::before {
  position: absolute; content: ''; inset-block: -.1875rem; inset-inline-end: 100%; width: 6px;
}
.outbound .message-actions::before { inset-inline-end: auto; inset-inline-start: 100%; }
.message-tools .message-touch-toggle { display: none; z-index: 4; border-radius: .5rem; }
.wa-tools-open .message-actions, .message-actions:focus-within {
  opacity: 1; pointer-events: auto; transform: translateY(-50%);
}
@media (hover: none), (pointer: coarse) {
  .message-tools:not(.wa-tools-open) .message-actions { visibility: hidden; }
  .message-tools .message-touch-toggle { display: grid; }
}
.message-action {
  display: grid;
  width: 1.4375rem;
  height: 1.4375rem;
  place-items: center;
  border-radius: .375rem;
}
.message-action:hover { background: var(--wa-raised); }
.message-action[aria-pressed="true"] { color: var(--wa-warning); }
.message-action:disabled { opacity: .55; cursor: wait; }
.message-action:focus-visible { outline: 2px solid var(--wa-focus); }
.message-action[aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
.message-action svg { transition: transform 130ms ease; }
.message-action:is(:hover, :focus-visible) svg { transform: scale(1.16); }
.reaction-choices {
  position: absolute; z-index: 6; top: calc(100% + 4px); inset-inline-start: 0;
  width: max-content; max-width: calc(100vw - 2rem); background: var(--wa-panel);
  border: 1px solid var(--wa-line); box-shadow: 0 .375rem 1rem var(--wa-shadow);
}
.outbound .reaction-choices { inset-inline-start: auto; inset-inline-end: 0; }
.reaction-pop-enter-active, .reaction-pop-leave-active { transition: transform 140ms ease, opacity 140ms ease; }
.reaction-pop-enter-from, .reaction-pop-leave-to { transform: translateY(-.22rem) scale(.94); opacity: 0; }
.reaction-option { transition: transform 140ms ease, background-color 140ms ease; }
.reaction-option:hover, .reaction-option:focus-visible { transform: translateY(-.125rem) scale(1.13); }
@media (prefers-reduced-motion: reduce) {
  .message-actions, .message-action svg, .reaction-pop-enter-active, .reaction-pop-leave-active, .reaction-option { transition: none; }
  .message-action:is(:hover, :focus-visible) svg { transform: none; }
  .reaction-option:hover, .reaction-option:focus-visible { transform: none; }
}
</style>

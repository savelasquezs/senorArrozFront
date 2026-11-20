<template>
  <div ref="root" class="wa-picker-tools" @keydown.esc="onEscape">
    <button ref="emojiTrigger" type="button" class="wa-picker-trigger" aria-label="Elegir emoji" title="Emojis"
      :aria-expanded="mode === 'emoji'" :aria-controls="mode === 'emoji' ? panelId : undefined"
      :disabled="!canType" @click="toggle('emoji')">
      <FaceSmileIcon class="size-4" aria-hidden="true" />
    </button>
    <button ref="stickerTrigger" type="button" class="wa-picker-trigger" aria-label="Stickers guardados" title="Stickers"
      :aria-expanded="mode === 'stickers'" :aria-controls="mode === 'stickers' ? panelId : undefined" @click="toggle('stickers')">
      <Square2StackIcon class="size-4" aria-hidden="true" />
    </button>
  </div>
  <Teleport v-if="panelTarget" :to="panelTarget">
    <Transition name="wa-picker">
      <section v-if="mode" :id="panelId" ref="panel" class="wa-picker-panel" role="dialog" tabindex="-1"
        :aria-label="mode === 'emoji' ? 'Emojis' : 'Stickers guardados'" @keydown.esc.capture="onEscape">
        <div v-if="mode === 'emoji'">
          <div ref="emojiHost" class="wa-emoji-host" />
          <p v-if="emojiFailed" class="wa-picker-empty" role="alert">No se pudieron cargar los emojis.</p>
          <p v-else-if="loadingEmoji" class="wa-picker-empty" role="status">Cargando emojis…</p>
        </div>
        <template v-else>
          <div class="wa-picker-header">
            <span><StarIcon class="size-4" aria-hidden="true" /> Stickers guardados</span>
            <button type="button" class="wa-picker-icon" aria-label="Cerrar stickers" @click="close(true)">
              <XMarkIcon class="size-4" aria-hidden="true" />
            </button>
          </div>
          <p v-if="loadFailed" class="wa-picker-empty" role="alert">No se pudieron cargar los stickers guardados.</p>
          <p v-else-if="!stickers.length" class="wa-picker-empty">Guarda un sticker desde las acciones de un mensaje.</p>
          <ul v-else class="wa-sticker-grid">
            <li v-for="(sticker, index) in stickers" :key="sticker.key" class="wa-sticker-card">
              <button type="button" class="wa-sticker-send" :aria-label="`Enviar sticker guardado ${index + 1}`"
                :title="canSend ? 'Enviar sticker' : 'Toma la conversación y verifica la ventana de atención'"
                :disabled="!canSend" @click="selectSticker(sticker)">
                <img :src="sticker.previewUrl" alt="" loading="lazy" decoding="async" width="64" height="64" />
              </button>
              <button type="button" class="wa-picker-icon wa-sticker-remove" :aria-label="`Quitar sticker guardado ${index + 1}`"
                title="Quitar de guardados" @click="emit('remove', sticker.key)">
                <XMarkIcon class="size-3.5" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </template>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { FaceSmileIcon, Square2StackIcon, StarIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { WhatsAppSavedSticker } from '@/composables/useWhatsAppSavedStickers'
import type { WhatsAppTheme } from '@/composables/useWhatsAppTheme'
import type { Picker } from 'emoji-mart'

const props = defineProps<{
  theme: WhatsAppTheme
  panelTarget?: HTMLElement
  canType: boolean
  canSend: boolean
  stickers: readonly WhatsAppSavedSticker[]
  loadFailed: boolean
}>()
const emit = defineEmits<{ emoji: [value: string]; sticker: [value: WhatsAppSavedSticker]; remove: [key: string] }>()
const panelId = useId()
const mode = ref<'emoji' | 'stickers' | null>(null)
const root = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const emojiHost = ref<HTMLElement>()
const emojiTrigger = ref<HTMLButtonElement>()
const stickerTrigger = ref<HTMLButtonElement>()
const loadingEmoji = ref(false)
const emojiFailed = ref(false)
let picker: Picker | undefined

async function toggle(next: 'emoji' | 'stickers') {
  if (mode.value === next) return close(true)
  mode.value = next
  if (next === 'stickers') {
    await nextTick()
    panel.value?.focus({ preventScroll: true })
    return
  }

  emojiFailed.value = false
  loadingEmoji.value = true
  try {
    const [{ Picker }, { default: data }, { default: i18n }] = await Promise.all([
      import('emoji-mart'), import('@emoji-mart/data'), import('@emoji-mart/data/i18n/es.json'),
    ])
    await nextTick()
    if (mode.value !== 'emoji' || !emojiHost.value) return
    picker = new Picker({
      data, i18n, theme: props.theme, autoFocus: true, dynamicWidth: true, previewPosition: 'none',
      onEmojiSelect: ({ native }: { native: string }) => {
        if (!props.canType) return
        close()
        emit('emoji', native)
      },
    })
    if (!(picker instanceof HTMLElement)) throw new Error('Selector de emojis no disponible.')
    emojiHost.value.replaceChildren(picker)
  } catch {
    if (mode.value === 'emoji') emojiFailed.value = true
  } finally {
    loadingEmoji.value = false
  }
}

function close(restoreFocus = false) {
  if (restoreFocus) (mode.value === 'emoji' ? emojiTrigger.value : stickerTrigger.value)?.focus()
  mode.value = null
  picker = undefined
}

function selectSticker(sticker: WhatsAppSavedSticker) {
  if (!props.canSend) return
  close(true)
  emit('sticker', sticker)
}

function onEscape(event: KeyboardEvent) {
  if (!mode.value) return
  event.stopPropagation()
  close(true)
}
function onOutsidePointer(event: PointerEvent) {
  if (!mode.value) return
  if (!event.composedPath().some(target => target === root.value || target === panel.value)) close()
}

watch(() => props.theme, theme => picker?.update({ theme }))
watch(() => props.canType, canType => { if (!canType && mode.value === 'emoji') close() })
onMounted(() => document.addEventListener('pointerdown', onOutsidePointer, true))
onBeforeUnmount(() => {
  close()
  document.removeEventListener('pointerdown', onOutsidePointer, true)
})
</script>

<style scoped>
.wa-picker-tools { display: flex; align-items: center; gap: .125rem; }
.wa-picker-trigger, .wa-picker-icon {
  display: grid; place-items: center; flex-shrink: 0; border-radius: .375rem;
  color: var(--wa-muted); transition: background-color 120ms, color 120ms, transform 120ms;
}
.wa-picker-trigger { width: 2rem; height: 2rem; }
.wa-picker-icon { width: 1.625rem; height: 1.625rem; }
.wa-picker-trigger:is(:hover:not(:disabled), [aria-expanded="true"]), .wa-picker-icon:hover {
  background: var(--wa-selected); color: var(--wa-focus);
}
.wa-picker-trigger:focus-visible, .wa-picker-icon:focus-visible, .wa-sticker-send:focus-visible {
  outline: 2px solid var(--wa-focus); outline-offset: 1px;
}
.wa-picker-trigger:disabled, .wa-sticker-send:disabled { opacity: .55; cursor: not-allowed; }
.wa-picker-panel {
  position: absolute; z-index: 6; inset-inline-start: .75rem; bottom: .375rem;
  width: min(21rem, calc(100% - 1.5rem)); max-height: min(25rem, calc(100% - .75rem));
  overflow: auto; border: 1px solid var(--wa-line); border-radius: .875rem;
  background: var(--wa-panel); color: var(--wa-text); box-shadow: 0 .5rem 1.75rem var(--wa-shadow);
}
.wa-emoji-host :deep(em-emoji-picker) {
  display: block; width: 100%; height: clamp(0px, calc(100cqh - .75rem - 2px), 24rem); --border-radius: .875rem;
}
.wa-picker-header, .wa-picker-header span { display: flex; align-items: center; gap: .375rem; }
.wa-picker-header { justify-content: space-between; padding: .5rem .625rem; border-bottom: 1px solid var(--wa-line); font-size: .8125rem; font-weight: 600; }
.wa-picker-header svg { color: var(--wa-focus); }
.wa-picker-empty { padding: .75rem; color: var(--wa-muted); font-size: .8125rem; }
.wa-sticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(3.75rem, 1fr)); gap: .375rem; padding: .625rem; }
.wa-sticker-card { position: relative; min-width: 0; }
.wa-sticker-send { display: grid; width: 100%; aspect-ratio: 1; place-items: center; padding: .375rem; border-radius: .5rem; background: var(--wa-canvas); }
.wa-sticker-send img { width: 100%; height: 100%; object-fit: contain; }
.wa-sticker-send:hover:not(:disabled) { background: var(--wa-selected); }
.wa-sticker-remove { position: absolute; top: 0; inset-inline-end: 0; background: var(--wa-panel); }
.wa-picker-enter-active, .wa-picker-leave-active { transition: opacity 120ms ease, transform 150ms ease; }
.wa-picker-enter-from, .wa-picker-leave-to { opacity: 0; transform: translateY(.375rem) scale(.98); }
@media (prefers-reduced-motion: reduce) {
  .wa-picker-enter-active, .wa-picker-leave-active, .wa-picker-trigger, .wa-picker-icon { transition: none; }
}
</style>

<template>
  <div>
    <audio ref="audio" :src="src" preload="none"
      @loadedmetadata="syncTime" @durationchange="syncTime" @timeupdate="syncTime"
      @play="onPlay" @pause="onStop" @ended="onStop" @error="onError" />
    <div ref="player" class="wa-voice-player">
      <button type="button" class="wa-voice-play" :class="{ 'is-playing': playing }"
        :aria-label="playing ? 'Pausar nota de voz' : 'Reproducir nota de voz'" @click="togglePlayback">
        <PauseIcon v-if="playing" class="size-[1.125rem]" aria-hidden="true" />
        <PlayIcon v-else class="size-[1.125rem]" aria-hidden="true" />
      </button>
      <div class="wa-voice-content">
        <div class="wa-voice-wave">
          <div class="wa-voice-bars" aria-hidden="true">
            <span v-for="(height, index) in waveform" :key="index"
              :class="{ heard: index < playedBars }" :style="{ blockSize: height + 'px' }" />
          </div>
          <input class="wa-voice-seek" type="range" min="0" :max="duration || 1" step="any"
            :value="position" :disabled="!duration || failed" aria-label="Posición de reproducción"
            :aria-valuetext="`${formatTime(position)} de ${formatTime(duration)}`" @input="seek" />
        </div>
        <div class="wa-voice-details">
          <span class="wa-voice-duration">{{ duration ? formatTime(playing || position ? position : duration) : '—' }}</span>
          <button v-if="playing || speedFocused" type="button" class="wa-voice-speed"
            :aria-label="`Velocidad de reproducción: ${speedLabel}`"
            @click="cycleSpeed" @focus="speedFocused = true" @blur="speedFocused = false">{{ speedLabel }}</button>
          <div class="wa-voice-message-details"><slot /></div>
        </div>
      </div>
      <p v-if="failed" class="wa-voice-error" role="status">No se pudo cargar el audio. Pulsa reproducir para reintentar.</p>
    </div>
  </div>
</template>

<script lang="ts">
let activeVoice: HTMLAudioElement | null = null
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PauseIcon, PlayIcon } from '@heroicons/vue/24/solid'

defineProps<{ src: string }>()

const waveform = [3, 5, 9, 6, 14, 21, 12, 16, 24, 17, 8, 12, 19, 11, 7, 13, 25, 15, 21, 10, 6, 12, 20, 16, 9, 5, 14, 22, 12, 6, 8, 4]
const speeds = [1, 1.5, 2]
const audio = ref<HTMLAudioElement | null>(null)
const player = ref<HTMLDivElement | null>(null)
const playing = ref(false)
const failed = ref(false)
const speedFocused = ref(false)
const position = ref(0)
const duration = ref(0)
const speedIndex = ref(0)
const speedLabel = computed(() => speeds[speedIndex.value]!.toLocaleString('es-CO') + '×')
const playedBars = computed(() => duration.value ? Math.round(position.value / duration.value * waveform.length) : 0)
let observer: IntersectionObserver | undefined

function formatTime(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

function syncTime() {
  const media = audio.value
  if (!media) return
  duration.value = Number.isFinite(media.duration) ? media.duration : 0
  position.value = media.currentTime
}

function onPlay() {
  const media = audio.value
  if (!media || media.paused) return
  if (activeVoice !== media) activeVoice?.pause()
  activeVoice = media
  playing.value = true
}

function onStop() {
  if (audio.value && !audio.value.paused && !audio.value.ended) return
  if (activeVoice === audio.value) activeVoice = null
  playing.value = false
  syncTime()
}

function onError() {
  failed.value = true
  if (activeVoice === audio.value) activeVoice = null
  playing.value = false
}

async function togglePlayback() {
  const media = audio.value
  if (!media) return
  if (!media.paused) {
    media.pause()
    return
  }
  if (failed.value) {
    failed.value = false
    media.load()
  }
  try {
    await media.play()
  } catch (error) {
    if (audio.value === media && !(error instanceof DOMException && error.name === 'AbortError')) onError()
  }
}

function seek(event: Event) {
  if (!audio.value || !duration.value) return
  audio.value.currentTime = (event.target as HTMLInputElement).valueAsNumber
  syncTime()
}

function cycleSpeed() {
  if (!audio.value) return
  speedIndex.value = (speedIndex.value + 1) % speeds.length
  audio.value.playbackRate = speeds[speedIndex.value]!
}

onMounted(() => {
  if (!player.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting || !audio.value) return
    audio.value.preload = 'metadata'
    observer?.disconnect()
  })
  observer.observe(player.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (activeVoice === audio.value) activeVoice = null
  audio.value?.pause()
})
</script>

<style scoped>
.wa-voice-player {
  display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center;
  gap: .25rem .5rem; inline-size: 18.25rem; max-inline-size: 100%;
}
.wa-voice-play {
  display: grid; place-items: center; inline-size: 2.25rem; block-size: 2.25rem;
  border-radius: 50%; color: var(--wa-on-action); background: var(--wa-action); cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
}
.wa-voice-play:hover { background: var(--wa-action-hover); transform: scale(1.06); }
.wa-voice-play.is-playing { box-shadow: 0 0 0 3px color-mix(in srgb, var(--wa-action) 22%, transparent); }
.wa-voice-play:focus-visible, .wa-voice-speed:focus-visible, .wa-voice-wave:focus-within {
  outline: 2px solid var(--wa-focus); outline-offset: 2px;
}
.wa-voice-wave { display: grid; align-items: center; position: relative; min-block-size: 1.8125rem; border-radius: .25rem; }
.wa-voice-bars {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
  align-items: center; gap: clamp(1px, 0.5vw, 2px); pointer-events: none;
}
.wa-voice-bars span { border-radius: 99px; background: var(--wa-input-line); }
.wa-voice-bars .heard { background: var(--wa-action); }
.wa-voice-seek { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; opacity: 0; cursor: pointer; }
.wa-voice-seek:disabled { cursor: default; }
.wa-voice-details { display: flex; flex-wrap: wrap; align-items: center; gap: .125rem .375rem; min-block-size: 1.125rem; }
.wa-voice-duration, .wa-voice-speed { font-size: .6875rem; font-variant-numeric: tabular-nums; }
.wa-voice-duration { color: var(--wa-muted); }
.wa-voice-speed {
  border: 1px solid var(--wa-line); border-radius: .375rem; padding-inline: .3125rem;
  background: var(--wa-selected); color: var(--wa-focus); cursor: pointer; line-height: 1.35;
}
.wa-voice-speed:hover { border-color: var(--wa-focus); }
.wa-voice-message-details { min-inline-size: 0; margin-inline-start: auto; }
.wa-voice-message-details :deep(.wa-message-meta) {
  margin-inline-start: 0; padding-top: 0; flex-wrap: wrap; justify-content: flex-end; white-space: normal;
}
.wa-voice-message-details :deep(time) { white-space: nowrap; }
.wa-voice-error { grid-column: 1 / -1; color: var(--wa-muted); font-size: .6875rem; }

@media (pointer: coarse) {
  .wa-voice-play { inline-size: 2.75rem; block-size: 2.75rem; }
  .wa-voice-wave { min-block-size: 2rem; }
  .wa-voice-speed { min-inline-size: 2rem; min-block-size: 1.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .wa-voice-play { transition: none; }
  .wa-voice-play:hover { transform: none; }
}
</style>

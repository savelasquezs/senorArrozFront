<template>
  <span ref="anchor" class="inline-flex shrink-0" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide" @keydown.esc.stop="hide">
    <button type="button" :aria-label="label" :aria-describedby="opened ? id : undefined" :aria-expanded="opened"
      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      @click.stop="show">
      <QuestionMarkCircleIcon class="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <Transition name="hint">
        <div v-if="opened" :id="id" ref="tooltip" role="tooltip" class="fixed z-[12000] w-72 max-w-[calc(100vw-24px)] rounded-xl bg-slate-900 px-3.5 py-3 text-xs font-normal leading-relaxed text-white shadow-xl"
          :style="{ left: `${position.left}px`, top: `${position.top}px`, visibility: positioned ? 'visible' : 'hidden' }">
          <p class="whitespace-pre-line">{{ text }}</p>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
defineProps<{ label: string; text: string }>()
const id = useId(), anchor = ref<HTMLElement>(), tooltip = ref<HTMLElement>()
const opened = ref(false), positioned = ref(false), position = ref({ left: 0, top: 0 })
async function show() {
  if (opened.value) return
  opened.value = true; positioned.value = false; await nextTick()
  if (!opened.value || !anchor.value || !tooltip.value) return
  const a = anchor.value.getBoundingClientRect(), t = tooltip.value.getBoundingClientRect()
  const left = Math.max(12, Math.min(a.right - t.width, window.innerWidth - t.width - 12))
  const top = a.bottom + t.height + 12 < window.innerHeight ? a.bottom + 7 : Math.max(12, a.top - t.height - 7)
  position.value = { left, top }; positioned.value = true
  document.addEventListener('pointerdown', outside)
  window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide)
}
function outside(e: PointerEvent) { if (!anchor.value?.contains(e.target as Node)) hide() }
function hide() {
  opened.value = false
  document.removeEventListener('pointerdown', outside)
  window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide)
}
onBeforeUnmount(hide)
</script>
<style scoped>
.hint-enter-active,.hint-leave-active { transition: opacity .16s ease, transform .16s ease; }
.hint-enter-from,.hint-leave-to { opacity: 0; transform: translateY(3px); }
@media (prefers-reduced-motion: reduce) { .hint-enter-active,.hint-leave-active { transition: none; } }
</style>

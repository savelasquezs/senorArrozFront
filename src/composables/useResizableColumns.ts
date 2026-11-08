import { onBeforeUnmount, ref, type Ref } from 'vue'

export function useResizableColumns(container?: Ref<HTMLElement | undefined>) {
  const leftWidth = ref(320), rightWidth = ref(440)
  let cleanup: (() => void) | undefined
  function maximum(side: 'left' | 'right') {
    const otherWidth = side === 'left' ? rightWidth.value : leftWidth.value
    return Math.max(side === 'left' ? 250 : 360, Math.min(side === 'left' ? 480 : 680, (container?.value?.clientWidth ?? 1280) - otherWidth - 260))
  }
  function resize(event: PointerEvent, side: 'left' | 'right') {
    event.preventDefault()
    cleanup?.()
    const origin = event.clientX
    const width = side === 'left' ? leftWidth : rightWidth
    const initial = width.value
    const move = (pointer: PointerEvent) => {
      width.value = Math.max(side === 'left' ? 250 : 360, Math.min(maximum(side),
        initial + (pointer.clientX - origin) * (side === 'left' ? 1 : -1)))
    }
    cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
    const stop = () => cleanup?.()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  function step(side: 'left' | 'right', amount: number) {
    const width = side === 'left' ? leftWidth : rightWidth
    width.value = Math.max(side === 'left' ? 250 : 360, Math.min(maximum(side), width.value + amount))
  }
  onBeforeUnmount(() => cleanup?.())
  return { leftWidth, rightWidth, resize, step }
}

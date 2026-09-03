import { computed, onMounted, onScopeDispose, ref } from 'vue'

const USER_IDLE_MS = 15 * 60_000
const ACTIVITY_THROTTLE_MS = 1_000

const isPageVisible = ref(typeof document === 'undefined' || document.visibilityState === 'visible')
const isOnline = ref(typeof navigator === 'undefined' || navigator.onLine)
const lastUserActivityAt = ref(Date.now())
const activityClock = ref(Date.now())
const isUserActive = computed(() => activityClock.value - lastUserActivityAt.value < USER_IDLE_MS)

let consumers = 0
let activityTimer: number | undefined

function updateVisibility() {
  isPageVisible.value = document.visibilityState === 'visible'
  if (isPageVisible.value) markUserActivity()
}

function updateOnline() {
  isOnline.value = navigator.onLine
}

function markUserActivity() {
  const now = Date.now()
  activityClock.value = now
  if (now < lastUserActivityAt.value || now - lastUserActivityAt.value >= ACTIVITY_THROTTLE_MS) {
    lastUserActivityAt.value = now
  }
}

function attachListeners() {
  if (typeof window === 'undefined' || consumers++ > 0) return
  document.addEventListener('visibilitychange', updateVisibility)
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
  window.addEventListener('pointerdown', markUserActivity, { passive: true })
  window.addEventListener('keydown', markUserActivity)
  window.addEventListener('touchstart', markUserActivity, { passive: true })
  window.addEventListener('focus', markUserActivity)
  activityTimer = window.setInterval(() => {
    activityClock.value = Date.now()
  }, 60_000)
}

function detachListeners() {
  if (typeof window === 'undefined' || consumers === 0 || --consumers > 0) return
  document.removeEventListener('visibilitychange', updateVisibility)
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
  window.removeEventListener('pointerdown', markUserActivity)
  window.removeEventListener('keydown', markUserActivity)
  window.removeEventListener('touchstart', markUserActivity)
  window.removeEventListener('focus', markUserActivity)
  if (activityTimer !== undefined) window.clearInterval(activityTimer)
  activityTimer = undefined
}

export function useNetworkActivityManager() {
  onMounted(attachListeners)
  onScopeDispose(detachListeners)

  return {
    isPageVisible,
    isOnline,
    isUserActive,
    lastUserActivityAt,
    markUserActivity,
  }
}

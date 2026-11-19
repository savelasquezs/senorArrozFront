import { hasInjectionContext, inject, provide, readonly, ref, watch, type InjectionKey, type Ref } from 'vue'

export type WhatsAppTheme = 'light' | 'dark'

const themeKey: InjectionKey<Readonly<Ref<WhatsAppTheme>>> = Symbol('WhatsApp theme')
const preferenceKey = (userId: number) => `whatsapp:theme:${userId}`

export function useWhatsAppTheme(userId: () => number | undefined) {
  const theme = ref<WhatsAppTheme>('light')

  watch(userId, (id) => {
    theme.value = 'light'
    if (id === undefined) return
    try {
      if (localStorage.getItem(preferenceKey(id)) === 'dark') theme.value = 'dark'
    } catch {
      // A browser can disable storage for this session.
    }
  }, { immediate: true, flush: 'sync' })

  const preference = readonly(theme)
  provide(themeKey, preference)

  function setTheme(value: WhatsAppTheme) {
    theme.value = value
    const id = userId()
    if (id === undefined) return
    try {
      localStorage.setItem(preferenceKey(id), value)
    } catch {
      // Keep the choice in memory when storage is unavailable.
    }
  }

  return { theme: preference, setTheme }
}

export function injectWhatsAppTheme() {
  return hasInjectionContext() ? inject(themeKey, undefined) : undefined
}

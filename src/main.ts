import { createApp } from 'vue'
import router from './router'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { CHUNK_RECOVERY_EVENT, isStaleChunkError, recoverFromStaleChunk } from '@/utils/chunkRecovery'

function offerChunkRecovery(error: unknown, target = window.location.pathname + window.location.search) {
    if (error !== undefined && !isStaleChunkError(error)) return false
    window.dispatchEvent(new CustomEvent(CHUNK_RECOVERY_EVENT, { detail: { target } }))
    return recoverFromStaleChunk(error, () => {})
}

// Vite emits this event when a lazy-loaded asset can no longer be fetched,
// commonly because the browser still has an older deployment open.
window.addEventListener('vite:preloadError', (event) => {
    const payload = (event as Event & { payload?: unknown }).payload
    if (offerChunkRecovery(payload)) event.preventDefault()
})

router.onError((error, to) => {
    if (offerChunkRecovery(error, to.fullPath)) return
    console.error('Router error:', error)
})

// Global error handler for unhandled promise rejections and errors.
// Do not suppress unrelated errors: they must stay visible for diagnosis.
window.addEventListener('unhandledrejection', (event) => {
    if (offerChunkRecovery(event.reason)) {
        event.preventDefault()
        return
    }
    console.error('Unhandled promise rejection:', event.reason)
})

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    // Check if it's a DOM manipulation error
    if (event.error && event.error.message && event.error.message.includes('insertBefore')) {
        console.error('DOM manipulation error detected:', event.error)
        // Prevent the error from crashing the app
        event.preventDefault()
    }
})

const app = createApp(App);

// Vue error handler
app.config.errorHandler = (err, _instance, info) => {
    console.error('Vue error:', err, 'Info:', info)
    if (err instanceof Error && err.message.includes('insertBefore')) {
        console.error('Vue DOM manipulation error detected:', err)
        return
    }
    throw err
}

app.use(createPinia());
app.use(router);
app.mount('#app');

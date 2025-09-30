import { createApp } from 'vue'
import router from './router'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// Global error handler for unhandled promise rejections and errors
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    // Prevent the error from being logged to console as an unhandled error
    event.preventDefault()
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
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue error:', err, 'Info:', info)
    // Check if it's a DOM manipulation error
    if (err && err.message && err.message.includes('insertBefore')) {
        console.error('Vue DOM manipulation error detected:', err)
        // Don't re-throw the error to prevent app crashes
        return
    }
    // For other errors, let Vue handle them normally
    throw err
}

app.use(createPinia());
app.use(router);
app.mount("#app");

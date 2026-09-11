import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    for (const name of ['VITE_API_URL', 'VITE_SIGNALR_HUB_URL', 'VITE_WHATSAPP_SIGNALR_HUB_URL']) {
      const value = env[name]
      if (!value && name !== 'VITE_API_URL') continue
      let url: URL
      try {
        url = new URL(value)
      } catch {
        throw new Error(`${name} debe ser una URL HTTPS absoluta para producción`)
      }
      if (url.protocol !== 'https:' || /^(localhost|127\.|0\.0\.0\.0$|\[::1\]$)/i.test(url.hostname)
        || url.hostname.endsWith('.localhost') || url.username || url.password) {
        throw new Error(`${name} debe apuntar a un servidor HTTPS de producción`)
      }
    }
  }
  return {
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  esbuild: {
    target: 'es2020'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  }
  }
})

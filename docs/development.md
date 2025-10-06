# Guía de Desarrollo - Señor Arroz

## 🚀 Setup del Proyecto

### Prerrequisitos
- **Node.js**: v18+ (recomendado v20+)
- **npm**: v9+ (incluido con Node.js)
- **Git**: Para control de versiones

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd senorArrozFront

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones
```

### Variables de Entorno
```bash
# .env.local
VITE_API_URL=https://localhost:7049/api
VITE_APP_NAME=Señor Arroz
VITE_APP_VERSION=0.0.0
```

### Comandos de Desarrollo
```bash
# Desarrollo
npm run dev              # Servidor de desarrollo en puerto 5173

# Build
npm run build            # Build para producción
npm run preview          # Preview del build local

# Testing
npm run test             # Ejecutar tests
npm run test:ui          # UI de testing
npm run test:coverage    # Coverage de tests

# Linting (si está configurado)
npm run lint             # Linting de código
npm run lint:fix         # Auto-fix de linting
```

## 📝 Convenciones de Código

### Naming Conventions

#### Archivos y Carpetas
```typescript
// Componentes Vue
BaseButton.vue          // PascalCase
UserProfile.vue         // PascalCase
OrderSidebar.vue        // PascalCase

// Servicios y APIs
authApi.ts             // camelCase
orderApi.ts            // camelCase
baseApi.ts             // camelCase

// Stores de Pinia
auth.ts                // camelCase
orders.ts              // camelCase
products.ts            // camelCase

// Tipos TypeScript
auth.ts                // camelCase
order.ts               // camelCase
common.ts              // camelCase

// Vistas
Login.vue              // PascalCase
Dashboard.vue          // PascalCase
Orders.vue             // PascalCase
```

#### Variables y Funciones
```typescript
// Variables
const isLoading = ref(false)           // camelCase
const userRole = computed(() => ...)   // camelCase
const API_BASE_URL = '...'            // UPPER_SNAKE_CASE para constantes

// Funciones
const handleClick = () => {}          // camelCase con verbo
const fetchUserData = async () => {}  // camelCase con verbo
const validateForm = () => {}         // camelCase con verbo

// Props de componentes
interface Props {
  isLoading: boolean    // camelCase
  userRole: string     // camelCase
  onSave: () => void   // camelCase con prefijo 'on' para eventos
}

// Events
const emit = defineEmits<{
  'user-selected': [user: User]      // kebab-case
  'order-updated': [order: Order]    // kebab-case
}>()
```

#### CSS Classes
```vue
<!-- Usar clases Tailwind -->
<div class="bg-white shadow-sm rounded-lg p-4">
  <button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
    Guardar
  </button>
</div>

<!-- Variables CSS personalizadas (si es necesario) -->
<style scoped>
.custom-component {
  --primary-color: #059669;
  color: var(--primary-color);
}
</style>
```

### Estructura de Archivos

#### Componentes Vue
```vue
<template>
  <!-- HTML semántico con clases Tailwind -->
  <div class="component-wrapper">
    <!-- Contenido del componente -->
  </div>
</template>

<script setup lang="ts">
// 1. Imports (ordenados)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'

// 2. Props y Emits
interface Props {
  title: string
  isLoading?: boolean
  onSave?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

const emit = defineEmits<{
  'save': [data: any]
  'cancel': []
}>()

// 3. Composables y Stores
const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useToast()

// 4. Estado reactivo
const formData = ref({
  name: '',
  email: ''
})

const isSubmitting = ref(false)

// 5. Computed properties
const isFormValid = computed(() => {
  return formData.value.name.length > 0 && formData.value.email.includes('@')
})

const canSubmit = computed(() => {
  return isFormValid.value && !isSubmitting.value
})

// 6. Métodos
const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  try {
    // Lógica de submit
    emit('save', formData.value)
    success('Guardado exitoso')
  } catch (err) {
    error('Error al guardar', err.message)
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// 7. Lifecycle hooks
onMounted(() => {
  // Inicialización del componente
})
</script>

<style scoped>
/* Estilos específicos del componente si es necesario */
.component-wrapper {
  /* Custom styles */
}
</style>
```

#### Stores de Pinia (Composition API)
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginCredentials, LoginResponse } from '@/types/auth'
import { authApi } from '@/services/MainAPI/authApi'

export const useAuthStore = defineStore('auth', () => {
  // 1. Estado reactivo
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 2. Computed properties (getters)
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const branchId = computed(() => user.value?.branchId || null)
  const branchName = computed(() => user.value?.branchName || '')
  const userName = computed(() => user.value?.name || '')

  // 3. Role checks
  const isSuperadmin = computed(() => userRole.value === 'Superadmin')
  const isAdmin = computed(() => userRole.value === 'Admin')
  const isCashier = computed(() => userRole.value === 'Cashier')
  const isKitchen = computed(() => userRole.value === 'Kitchen')
  const isDeliveryman = computed(() => userRole.value === 'Deliveryman')

  // 4. Permission checks
  const canManageUsers = computed(() => isSuperadmin.value || isAdmin.value)
  const canManageProducts = computed(() => isSuperadmin.value || isAdmin.value)
  const canCancelOrders = computed(() => isSuperadmin.value || isAdmin.value)

  // 5. Actions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authApi.login(credentials)
      setAuthData(response)
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      if (refreshToken.value) {
        await authApi.logout(refreshToken.value)
      }
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      clearAuthData()
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      if (!refreshToken.value) {
        throw new Error('No refresh token available')
      }

      const response = await authApi.refreshToken(refreshToken.value)
      setAuthData(response)
      return true
    } catch (err) {
      console.error('Token refresh failed:', err)
      clearAuthData()
      return false
    }
  }

  // 6. Métodos privados
  const setAuthData = (data: LoginResponse): void => {
    user.value = data.user
    token.value = data.token
    refreshToken.value = data.refreshToken

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user_data', JSON.stringify(data.user))
  }

  const clearAuthData = (): void => {
    user.value = null
    token.value = null
    refreshToken.value = null
    error.value = null

    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
  }

  // 7. Return público
  return {
    // State
    user,
    token,
    isLoading,
    error,
    // Computed
    isAuthenticated,
    userRole,
    branchId,
    branchName,
    userName,
    isSuperadmin,
    isAdmin,
    isCashier,
    isKitchen,
    isDeliveryman,
    canManageUsers,
    canManageProducts,
    canCancelOrders,
    // Actions
    login,
    logout,
    refreshAccessToken,
    clearError: () => { error.value = null }
  }
})
```

#### APIs
```typescript
import { BaseApi } from './baseApi'
import type { User, LoginCredentials, LoginResponse } from '@/types/auth'

export class AuthApi extends BaseApi {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.post<LoginResponse>('/auth/login', credentials)
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    return this.post('/auth/logout', { refreshToken })
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; expiresAt: string }> {
    return this.post('/auth/refresh', { refreshToken })
  }

  async changePassword(passwordData: ChangePasswordCredentials): Promise<void> {
    return this.put('/auth/change-password', passwordData)
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.post('/auth/forgot-password', { email })
  }

  async resetPassword(resetData: ResetPasswordCredentials): Promise<void> {
    return this.post('/auth/reset-password', resetData)
  }
}

export const authApi = new AuthApi()
```

## 🎨 Guía de Estilos

### Tailwind CSS

#### Colores del Sistema
```css
/* Usar las clases de Tailwind definidas */
.bg-emerald-600     /* Color primario */
.bg-emerald-700     /* Color primario hover */
.text-gray-700      /* Texto principal */
.text-gray-500      /* Texto secundario */
.border-gray-300    /* Bordes */
.bg-gray-50         /* Fondo sutil */
```

#### Espaciado Consistente
```vue
<!-- Padding y Margin consistentes -->
<div class="p-4">          <!-- padding: 1rem -->
<div class="px-6 py-4">    <!-- padding horizontal: 1.5rem, vertical: 1rem -->
<div class="mt-4 mb-2">    <!-- margin top: 1rem, bottom: 0.5rem -->
<div class="space-y-4">    <!-- spacing entre elementos hijos: 1rem -->
```

#### Responsive Design
```vue
<!-- Mobile First Approach -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <!-- 1 columna en mobile, 2 en small, 3 en large, 4 en extra large -->
</div>

<!-- Ocultar/Mostrar por breakpoint -->
<div class="hidden lg:block">Solo visible en desktop</div>
<div class="lg:hidden">Solo visible en mobile/tablet</div>
```

### Componentes UI

#### Botones
```vue
<!-- Botón primario -->
<BaseButton variant="primary" size="md" :loading="isLoading">
  Guardar
</BaseButton>

<!-- Botón secundario -->
<BaseButton variant="outline" size="sm">
  Cancelar
</BaseButton>

<!-- Botón de peligro -->
<BaseButton variant="danger" size="lg" @click="confirmDelete">
  Eliminar
</BaseButton>
```

#### Formularios
```vue
<!-- Input básico -->
<BaseInput
  v-model="email"
  type="email"
  label="Correo Electrónico"
  placeholder="usuario@ejemplo.com"
  :required="true"
  :error="emailError"
/>

<!-- Select con búsqueda -->
<BaseSelect
  v-model="selectedProduct"
  :options="productOptions"
  label="Producto"
  placeholder="Buscar producto..."
  :searchable="true"
  :creatable="true"
/>
```

## 🧪 Testing

### Configuración de Tests
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true
  }
})
```

### Tests de Componentes
```typescript
// tests/components/BaseButton.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renders with correct text', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Click me' }
    })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies primary variant styles', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'primary' }
    })
    expect(wrapper.classes()).toContain('bg-emerald-600')
  })

  it('emits click event', async () => {
    const wrapper = mount(BaseButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### Tests de Stores
```typescript
// tests/store/auth.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have initial state', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
```

## 🔧 Herramientas de Desarrollo

### VS Code Extensions Recomendadas
```json
{
  "recommendations": [
    "Vue.volar",                    // Vue 3 support
    "Vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",    // Tailwind CSS IntelliSense
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",       // Code formatting
    "ms-vscode.vscode-json"
  ]
}
```

### Configuración de VS Code
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  },
  "tailwindCSS.includeLanguages": {
    "vue": "html"
  }
}
```

### Scripts de Package.json
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write ."
  }
}
```

## 🐛 Debugging

### Vue DevTools
1. Instalar Vue DevTools browser extension
2. Habilitar en modo desarrollo
3. Inspeccionar estado de stores y componentes

### Console Logging
```typescript
// Usar console.log estratégicamente
const handleSubmit = async () => {
  console.log('Submitting form:', formData.value)
  try {
    const result = await api.submit(formData.value)
    console.log('Submit successful:', result)
  } catch (error) {
    console.error('Submit failed:', error)
  }
}
```

### Error Boundaries
```vue
<!-- Manejo de errores en componentes -->
<script setup lang="ts">
import { onErrorCaptured } from 'vue'

onErrorCaptured((error, instance, info) => {
  console.error('Component error:', error)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // Mostrar toast de error
  const { error: showError } = useToast()
  showError('Error inesperado', 'Por favor recarga la página')
  
  return false // Prevenir que el error se propague
})
</script>
```

## 📦 Build y Deployment

### Build de Producción
```bash
# Build optimizado
npm run build

# El build se genera en dist/
# Incluye:
# - Code splitting automático
# - Tree shaking
# - Minificación de CSS/JS
# - Source maps (opcional)
```

### Variables de Entorno de Producción
```bash
# .env.production
VITE_API_URL=https://api.señorarroz.com/api
VITE_APP_NAME=Señor Arroz
VITE_APP_VERSION=1.0.0
```

### Deployment Checklist
- [ ] Variables de entorno configuradas
- [ ] Build de producción exitoso
- [ ] Tests pasando
- [ ] Linting sin errores
- [ ] Documentación actualizada

## 🔄 Git Workflow

### Commits
```bash
# Formato de commits
git commit -m "feat: add user authentication"
git commit -m "fix: resolve order validation bug"
git commit -m "docs: update API documentation"
git commit -m "style: improve button component styling"
git commit -m "refactor: simplify order store logic"
```

### Branches
```bash
# Branches principales
main                    # Producción
develop                 # Desarrollo
feature/user-auth       # Features
bugfix/order-validation # Bug fixes
hotfix/critical-bug     # Hot fixes
```

---

**Recursos adicionales**: 
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

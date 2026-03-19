<template>
    <MainLayout>
        <div class="max-w-2xl mx-auto p-4 md:p-8 space-y-6">

            <!-- Header -->
            <div>
                <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Mi Perfil</h1>
                <p class="text-sm text-gray-500 mt-1">Gestiona tu información personal</p>
            </div>

            <!-- Avatar + nombre + rol -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center gap-5">
                <div class="relative group flex-shrink-0">
                    <div
                        class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md cursor-pointer"
                        @click="triggerFileInput"
                    >
                        <img
                            v-if="avatarUrl"
                            :src="avatarUrl"
                            :alt="authStore.userName"
                            class="w-full h-full object-cover"
                        />
                        <div
                            v-else
                            class="w-full h-full bg-emerald-600 flex items-center justify-center"
                        >
                            <span class="text-3xl font-bold text-white">{{ initials }}</span>
                        </div>
                    </div>
                    <button
                        @click="triggerFileInput"
                        :disabled="uploadingImage"
                        class="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow transition-colors disabled:opacity-50"
                        title="Cambiar foto"
                    >
                        <CameraIcon v-if="!uploadingImage" class="w-4 h-4" />
                        <span v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    </button>
                    <input
                        ref="fileInputRef"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        class="hidden"
                        @change="handleFileChange"
                    />
                </div>

                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-semibold text-gray-900">{{ authStore.userName }}</h2>
                    <span class="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium" :class="roleBadgeClass">
                        {{ roleLabel }}
                    </span>
                    <p class="text-sm text-gray-500 mt-1">{{ authStore.user?.branchName }}</p>
                </div>
            </div>

            <!-- Formulario editable -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 class="text-base font-semibold text-gray-900">Información de contacto</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BaseInput
                        v-model="form.email"
                        label="Email"
                        type="email"
                        :error="errors.email"
                        @input="validateForm"
                    >
                        <template #icon><EnvelopeIcon class="w-4 h-4" /></template>
                    </BaseInput>

                    <BaseInput
                        v-model="form.phone"
                        label="Teléfono"
                        type="tel"
                        maxlength="10"
                        :error="errors.phone"
                        @input="normalizePhone; validateForm()"
                    >
                        <template #icon><PhoneIcon class="w-4 h-4" /></template>
                    </BaseInput>
                </div>

                <div class="flex justify-end">
                    <BaseButton
                        variant="primary"
                        :loading="savingProfile"
                        :disabled="!isFormValid || savingProfile"
                        @click="saveProfile"
                    >
                        Guardar cambios
                    </BaseButton>
                </div>
            </div>

            <!-- Info de solo lectura -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 class="text-base font-semibold text-gray-900">Información de cuenta</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nombre</p>
                        <p class="text-sm text-gray-900 font-medium">{{ authStore.userName }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rol</p>
                        <p class="text-sm text-gray-900 font-medium">{{ roleLabel }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sucursal</p>
                        <p class="text-sm text-gray-900 font-medium">{{ authStore.user?.branchName || '—' }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado</p>
                        <span class="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                        </span>
                    </div>
                </div>
            </div>

            <!-- Seguridad -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between">
                <div>
                    <p class="text-sm font-semibold text-gray-900">Contraseña</p>
                    <p class="text-xs text-gray-500 mt-0.5">Cambia tu contraseña regularmente</p>
                </div>
                <BaseButton variant="outline" @click="router.push('/change-password')">
                    <LockClosedIcon class="w-4 h-4 mr-1.5" />
                    Cambiar contraseña
                </BaseButton>
            </div>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { userApi } from '@/services/MainAPI/userApi'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    CameraIcon,
    EnvelopeIcon,
    PhoneIcon,
    LockClosedIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const savingProfile = ref(false)
const uploadingImage = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
    email: authStore.user?.email ?? '',
    phone: authStore.user?.phone ?? '',
})

const errors = reactive({ email: '', phone: '' })

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'

const avatarUrl = computed(() => {
    const url = authStore.user?.profileImageUrl
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
})

const initials = computed(() =>
    authStore.userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
)

const roleLabels: Record<string, string> = {
    Superadmin: 'Superadmin',
    Admin: 'Administrador',
    Cashier: 'Cajero',
    Kitchen: 'Cocina',
    Deliveryman: 'Domiciliario',
}

const roleLabel = computed(() => roleLabels[authStore.userRole ?? ''] ?? authStore.userRole ?? '')

const roleBadgeClass = computed(() => {
    const map: Record<string, string> = {
        Superadmin: 'bg-purple-100 text-purple-700',
        Admin: 'bg-blue-100 text-blue-700',
        Cashier: 'bg-yellow-100 text-yellow-700',
        Kitchen: 'bg-orange-100 text-orange-700',
        Deliveryman: 'bg-emerald-100 text-emerald-700',
    }
    return map[authStore.userRole ?? ''] ?? 'bg-gray-100 text-gray-700'
})

const validateForm = () => {
    errors.email = ''
    errors.phone = ''

    if (!form.email.trim()) {
        errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'Email inválido'
    }

    if (!form.phone.trim()) {
        errors.phone = 'El teléfono es requerido'
    } else if (!/^[36]\d{9}$/.test(form.phone)) {
        errors.phone = 'Número válido de 10 dígitos (celular con 3 o fijo con 6)'
    }
}

const normalizePhone = () => {
    form.phone = form.phone.replace(/\D/g, '').slice(0, 10)
}

const isFormValid = computed(() => {
    return (
        form.email.trim() &&
        form.phone.trim() &&
        !errors.email &&
        !errors.phone
    )
})

const saveProfile = async () => {
    validateForm()
    if (!isFormValid.value) return

    try {
        savingProfile.value = true
        const updated = await userApi.updateProfile(authStore.user!.id, {
            email: form.email.trim(),
            phone: form.phone.trim(),
        })
        authStore.updateUserData({ email: updated.email, phone: (updated as any).phone })
        success('Perfil actualizado', 3000, 'Tus datos han sido guardados correctamente')
    } catch (err: any) {
        showError('Error al guardar', err.message || 'No se pudo actualizar el perfil')
    } finally {
        savingProfile.value = false
    }
}

const triggerFileInput = () => fileInputRef.value?.click()

const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        uploadingImage.value = true
        const updated = await userApi.uploadProfileImage(authStore.user!.id, file)
        authStore.updateUserData({ profileImageUrl: (updated as any).profileImageUrl })
        success('Foto actualizada', 3000)
    } catch (err: any) {
        showError('Error al subir imagen', err.message || 'No se pudo cargar la foto')
    } finally {
        uploadingImage.value = false
        if (fileInputRef.value) fileInputRef.value.value = ''
    }
}

onMounted(() => {
    validateForm()
})
</script>

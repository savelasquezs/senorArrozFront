<template>
    <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-2" v-if="authStore.user">
        <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-semibold text-gray-900">Tu sucursal:</span>
            <span class="text-gray-700">{{ authStore.user.branchName }}</span>
            <BaseButton
                type="button"
                variant="ghost"
                size="sm"
                class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                :disabled="!canOpenMaps"
                :title="mapsButtonTitle"
                @click="openMapsToBranch"
            >
                <MapIcon class="w-4 h-4" />
                Volver al local
            </BaseButton>
        </div>

        <div v-if="phoneLines.length" class="space-y-1 pt-1 border-t border-gray-100">
            <PhoneNumberItem v-for="(num, idx) in phoneLines" :key="idx" :phone-number="num" />
        </div>
        <p v-else class="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            No hay teléfonos de sucursal en tu perfil. Pide a un administrador que actualice la sucursal.
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'
import { MapIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const phoneLines = computed(() => {
    const u = authStore.user
    if (!u) return []
    const out: string[] = []
    if (u.branchPhone1?.trim()) out.push(u.branchPhone1.trim())
    const p2 = u.branchPhone2?.trim()
    if (p2) out.push(p2)
    return out
})

const canOpenMaps = computed(() => {
    const u = authStore.user
    if (!u) return false
    return (
        u.branchLatitude != null &&
        u.branchLongitude != null &&
        !Number.isNaN(Number(u.branchLatitude)) &&
        !Number.isNaN(Number(u.branchLongitude))
    )
})

const mapsButtonTitle = computed(() =>
    canOpenMaps.value
        ? 'Abrir Google Maps con ruta al local'
        : 'La sucursal aún no tiene coordenadas. Un administrador debe marcarla en el mapa al editar la sucursal.'
)

function openMapsToBranch() {
    const u = authStore.user
    if (!u || u.branchLatitude == null || u.branchLongitude == null) return
    const lat = Number(u.branchLatitude)
    const lng = Number(u.branchLongitude)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
    <div v-if="authStore.user" class="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-2 text-left">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Mi sucursal</p>
        <p class="text-sm font-medium text-gray-900">{{ authStore.user.branchName || '—' }}</p>

        <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            class="!justify-start w-full px-0 text-blue-600 hover:text-blue-700 hover:bg-transparent"
            :disabled="!canOpenMaps"
            :title="mapsButtonTitle"
            @click="openMapsToBranch"
        >
            <MapIcon class="w-4 h-4 shrink-0 mr-1.5" />
            Volver al local
        </BaseButton>

        <div v-if="phoneLines.length" class="space-y-1 pt-1 border-t border-gray-200">
            <PhoneNumberItem v-for="(num, idx) in phoneLines" :key="idx" :phone-number="num" />
        </div>
        <p v-else class="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
            Sin teléfonos de sucursal. Pide a un administrador que actualice la sucursal.
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
        : 'La sucursal aún no tiene coordenadas en el mapa.'
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

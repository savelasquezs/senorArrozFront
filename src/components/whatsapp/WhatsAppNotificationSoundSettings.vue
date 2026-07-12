<template>
  <BaseCard>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-gray-900">Sonido de notificaciones</h3>
        <p class="mt-1 text-sm text-gray-500">
          Se reproduce cuando llega un mensaje nuevo de WhatsApp en este navegador.
        </p>
      </div>
      <BaseButton variant="secondary" size="sm" :disabled="selectedWhatsAppSound === 'none'" @click="previewSound">
        Probar sonido
      </BaseButton>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label
        v-for="sound in WHATSAPP_NOTIFICATION_SOUNDS"
        :key="sound.value"
        class="flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors"
        :class="selectedWhatsAppSound === sound.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'"
      >
        <input
          :checked="selectedWhatsAppSound === sound.value"
          type="radio"
          name="whatsapp-notification-sound"
          class="mt-0.5 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
          @change="selectSound(sound.value)"
        />
        <span>
          <span class="block text-sm font-medium text-gray-900">{{ sound.label }}</span>
          <span class="block text-xs text-gray-500">{{ sound.description }}</span>
        </span>
      </label>
    </div>
    <p class="mt-3 text-xs text-gray-500">La preferencia se guarda automáticamente en este dispositivo.</p>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  WHATSAPP_NOTIFICATION_SOUNDS,
  useNotificationSound,
  type WhatsAppNotificationSound,
} from '@/composables/useNotificationSound'

const { selectedWhatsAppSound, setWhatsAppNotificationSound, playWhatsAppMessageSound } = useNotificationSound()

function selectSound(sound: WhatsAppNotificationSound) {
  setWhatsAppNotificationSound(sound)
  void playWhatsAppMessageSound(sound)
}

function previewSound() {
  void playWhatsAppMessageSound()
}
</script>

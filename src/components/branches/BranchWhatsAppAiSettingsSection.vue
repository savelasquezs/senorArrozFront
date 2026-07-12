<template>
  <div class="space-y-6">
    <BaseCard>
      <BranchWhatsAppSettingsForm :branch-id="branchId" @saved="handleWhatsAppSettingsSaved" />
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Plantillas de WhatsApp</h3>
          <p class="mt-1 text-sm text-gray-500">
            Sincroniza con Meta, consulta las plantillas aprobadas y envía mensajes de prueba.
          </p>
        </div>
        <BaseButton :icon="DocumentTextIcon" class="shrink-0" @click="openWhatsAppTemplates">
          Abrir plantillas WA
        </BaseButton>
      </div>
    </BaseCard>

    <WhatsAppNotificationSoundSettings />

    <BranchAiSettingsForm :branch-id="branchId" />
  </div>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BranchAiSettingsForm from '@/components/branches/BranchAiSettingsForm.vue'
import BranchWhatsAppSettingsForm from '@/components/whatsapp/BranchWhatsAppSettingsForm.vue'
import WhatsAppNotificationSoundSettings from '@/components/whatsapp/WhatsAppNotificationSoundSettings.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'

defineProps<{
  branchId: number
}>()

const whatsappStore = useWhatsAppStore()
const router = useRouter()

function openWhatsAppTemplates() {
  void router.push({ name: 'WhatsAppTemplates' })
}

function handleWhatsAppSettingsSaved() {
  void whatsappStore.refreshStatus()
}
</script>

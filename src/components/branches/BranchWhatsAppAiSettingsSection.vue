<template>
  <div class="space-y-6">
    <BaseCard>
      <BranchWhatsAppSettingsForm :branch-id="branchId" @saved="handleWhatsAppSettingsSaved" />
    </BaseCard>

    <BranchAiSettingsForm :branch-id="branchId" />
  </div>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import BranchAiSettingsForm from '@/components/branches/BranchAiSettingsForm.vue'
import BranchWhatsAppSettingsForm from '@/components/whatsapp/BranchWhatsAppSettingsForm.vue'
import { useWhatsAppStore } from '@/store/whatsapp'

defineProps<{
  branchId: number
}>()

const whatsappStore = useWhatsAppStore()

function handleWhatsAppSettingsSaved() {
  void whatsappStore.refreshStatus()
}
</script>

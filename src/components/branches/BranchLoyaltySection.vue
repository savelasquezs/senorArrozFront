<template>
  <BranchLoyaltyCycleForm :branch-id="branchId" @saved="$emit('saved', $event)" />
</template>

<script setup lang="ts">
import BranchLoyaltyCycleForm from '@/components/branches/BranchLoyaltyCycleForm.vue'
import type { LoyaltyCycleStep } from '@/types/loyaltyCycle'

defineProps<{ branchId: number }>()

defineEmits<{
  saved: [steps: LoyaltyCycleStep[]]
}>()
</script>

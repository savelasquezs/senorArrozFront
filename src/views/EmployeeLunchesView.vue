<template>
  <MainLayout page-title="Almuerzos" hide-quick-order>
    <div class="space-y-5">
      <header>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Almuerzos</h1>
          <BaseBadge variant="secondary" size="sm">{{ branchName }}</BaseBadge>
        </div>
        <p class="mt-1 text-sm text-gray-500">Salidas y regresos del equipo.</p>
      </header>
      <EmployeeLunchHistory v-if="branchId" :branch-id="branchId" />
      <p v-else class="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">Selecciona una sucursal para consultar sus almuerzos.</p>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import EmployeeLunchHistory from '@/components/users/EmployeeLunchHistory.vue';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';

const auth = useAuthStore();
const branches = useBranchContextStore();
const branchId = computed(() => auth.isSuperadmin ? branches.selectedBranchId : auth.branchId);
const branchName = computed(() => auth.isSuperadmin ? branches.selectedBranch?.name || 'Sucursal' : auth.branchName);
</script>

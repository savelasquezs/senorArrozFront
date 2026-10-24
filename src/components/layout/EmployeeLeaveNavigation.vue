<template>
  <div class="space-y-1 border-b border-gray-100 pb-2 mb-2">
    <RouterLink to="/permisos" :class="classes(false)" @click="emit('navigate')"><ClipboardDocumentListIcon class="h-4 w-4" /><span class="flex-1">Mis permisos</span><span v-if="store.summary.unread" class="rounded-full bg-emerald-100 px-2 text-xs text-emerald-800">{{ store.summary.unread }}</span></RouterLink>
    <RouterLink v-if="store.canReview" :to="{ path: '/permisos', query: { tab: 'review', status: 'pending' } }" :class="classes(true)" @click="emit('navigate')"><UsersIcon class="h-4 w-4" /><span class="flex-1">Permisos del equipo</span><span v-if="store.summary.pendingReview" class="rounded-full bg-amber-100 px-2 text-xs text-amber-800">{{ store.summary.pendingReview }}</span></RouterLink>
  </div>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ClipboardDocumentListIcon, UsersIcon } from '@heroicons/vue/24/outline';
import { useEmployeeLeavesStore } from '@/store/employeeLeaves';
import { useEmployeeLeaveUpdates } from '@/composables/useEmployeeLeaveUpdates';
const emit = defineEmits<{ navigate: [] }>();
const route = useRoute(), store = useEmployeeLeavesStore();
function classes(review: boolean) {
  const selected = route.path.startsWith('/permisos') && (route.query.tab === 'review') === review;
  return ['flex items-center gap-3 rounded-xl px-3 py-2 text-sm', selected ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'];
}
useEmployeeLeaveUpdates();
</script>

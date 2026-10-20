<template><span class="leave-badge" :class="`leave-badge--${status}`"><span class="leave-badge-dot" aria-hidden="true" />{{ label ?? leaveStatusLabels[status as LeaveStatus] ?? supportStatusLabels[status] ?? status }}</span></template>
<script setup lang="ts">
import { leaveStatusLabels, supportStatusLabels, type LeaveStatus } from '@/types/employeeLeave';
import '@/assets/employee-leaves.css';
defineProps<{ status: string; label?: string }>();
</script>

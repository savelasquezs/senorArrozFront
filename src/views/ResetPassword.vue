<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Señor Arroz</h1>
      </div>
      
      <ResetPasswordForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import ResetPasswordForm from '@/components/ResetPasswordForm.vue'
</script>
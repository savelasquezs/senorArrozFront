<template>
  <section class="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Rutas del domiciliario">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold">Últimas rutas</h2>
      <BaseButton size="xs" variant="outline" :loading="loading" @click="refresh">Actualizar</BaseButton>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
    <p v-else-if="!loading && !routes.length" class="text-sm text-gray-500">No hay rutas con pedidos disponibles.</p>
    <div v-for="route in routes" :key="route.id" class="mb-4 rounded-lg border border-gray-200 p-2">
      <h3 class="text-xs font-semibold">{{ route.isCurrent ? 'Ruta actual' : 'Ruta anterior' }} · #{{ route.id }}</h3>
      <p class="mb-2 text-xs text-gray-500">{{ formatDateTimeCompact(route.at) }}</p>
      <ul class="divide-y divide-gray-200">
        <li v-for="stop in route.orders" :key="stop.orderId" class="py-2">
          <WhatsAppOrderQuickActions :order-id="stop.orderId" :initial-status="stop.status" :route-id="route.id"
            @manage="emit('manage', stop.orderId)" @contact-customer="emit('contact-customer', stop.orderId)" />
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import WhatsAppOrderQuickActions from '@/components/whatsapp/WhatsAppOrderQuickActions.vue'
import { formatDateTimeCompact } from '@/composables/useFormatting'
import { useOrderManagementUpdates } from '@/composables/useOrderManagementUpdates'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppRecentDeliveryRoute } from '@/types/whatsapp'

const props = defineProps<{ conversationId: number; expectedDeliverymanId?: number }>()
const emit = defineEmits<{ manage: [orderId: number]; 'contact-customer': [orderId: number] }>()
const routes = ref<WhatsAppRecentDeliveryRoute[]>([])
const error = ref('')
const loading = ref(false)
const revision = ref(0)

function refresh() {
  revision.value++
}

function refreshForOrder(orderId: number) {
  if (routes.value.some(route => route.orders.some(order => order.orderId === orderId))) refresh()
}

useOrderManagementUpdates(event => refreshForOrder(event.orderId), refresh, refreshForOrder)

watch(() => [props.conversationId, revision.value] as const, async ([id], previous, onCleanup) => {
  const request = new AbortController()
  onCleanup(() => request.abort())
  if (previous?.[0] !== id) routes.value = []
  error.value = ''
  loading.value = true
  try {
    const response = await whatsappApi.getConversationDeliveryRoutes(id, request.signal, props.expectedDeliverymanId)
    if (!request.signal.aborted) routes.value = response.data ?? []
  } catch (cause) {
    if (!request.signal.aborted) error.value = cause instanceof Error ? cause.message : 'No se pudieron consultar las rutas.'
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>

# Temporary isolated editing helper. Not included in the delivery tree/PR.
from pathlib import Path
import subprocess

BASE = '2aa9f9f4f435b9c7ec758cd737d321b099d35e72'

def source(path):
    text = Path(path).read_text()
    expected = subprocess.check_output(['git', 'show', f'{BASE}:{path}']).decode()
    assert text == expected, f'Unexpected changes before patch: {path}'
    return text

def edit(text, old, new, count=1):
    assert text.count(old) == count, f'Expected {count} matches, got {text.count(old)}: {old[:100]}'
    return text.replace(old, new)

p = 'src/store/whatsapp.ts'
s = source(p)
s = edit(s, 'function fetchConversations(filters?: WhatsAppConversationFilters): Promise<WhatsAppConversation[]> {', 'function fetchConversations(filters?: WhatsAppConversationFilters, signal?: AbortSignal): Promise<WhatsAppConversation[]> {\n    if (signal?.aborted) return Promise.resolve(conversations.value)')
s = edit(s, 'if (conversationRequest?.key === key) return conversationRequest.promise', 'if (conversationRequest?.key === key && !conversationRequest.abort.signal.aborted) return conversationRequest.promise')
s = edit(s, 'const abort = new AbortController(), scope = messageScope\n    const revisions', "const abort = new AbortController(), scope = messageScope\n    const cancel = () => abort.abort()\n    signal?.addEventListener('abort', cancel, { once: true })\n    const revisions")
s = edit(s, 'if (isCurrent()) { isLoadingConversations.value = false; conversationRequest = null }', "signal?.removeEventListener('abort', cancel)\n      if (conversationRequest?.abort === abort) { isLoadingConversations.value = false; conversationRequest = null }")
s = edit(s, '    const res = await whatsappApi.updateOperationalBranch(conversationId, branchId)\n    const conversation', '    const scope = messageScope\n    const res = await whatsappApi.updateOperationalBranch(conversationId, branchId)\n    if (scope !== messageScope) return null\n    const conversation')
Path(p).write_text(s)

p = 'src/views/WhatsAppView.vue'
s = source(p)
s = edit(s, "import { createWhatsAppRoutingRefresh } from '@/utils/whatsappRoutingRefresh'", "import { createWhatsAppRoutingRefresh } from '@/utils/whatsappRoutingRefresh'\nimport type { RefreshContext } from '@/utils/serialRefresh'")
s = edit(s, "const statusLoadError = ref('')", "const statusLoadError = ref('')\nconst inboxError = ref('')")
s = edit(s, 'let aiDiagnosticsPollingId: number | undefined', """let aiDiagnosticsPollingId: number | undefined
let viewActive = true
const sessionKey = computed(() => JSON.stringify([
  authStore.user?.id, authStore.user?.role, authStore.user?.branchId, authStore.user?.accountType,
]))
const inboxScope = computed(() => JSON.stringify([
  sessionKey.value, selectedBranchId.value, search.value.trim(), unreadOnly.value,
]))""")
s = edit(s, '      <div v-else class="flex min-h-0 flex-1 flex-col">', '''      <div v-else class="flex min-h-0 flex-1 flex-col">
        <p v-if="inboxError" role="alert" class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {{ inboxError }} <button type="button" class="ml-2 underline" @click="reloadConversations">Reintentar</button>
        </p>''')
a = s.index('async function changeOperationalBranch(event: Event) {')
b = s.index('async function resetConversationForTesting()', a)
s = s[:a] + '''async function changeOperationalBranch(event: Event) {
  const conversation = selectedConversation.value
  if (!conversation || changingOperationalBranch.value || !viewActive) return
  const input = event.target as HTMLSelectElement
  const selectedValue = Number(input.value)
  const branchId = selectedValue > 0 ? selectedValue : null
  const previousBranchId = conversation.operationalBranchId
  if (branchId === previousBranchId) return
  const session = sessionKey.value, selection = conversationSelection
  const current = () => viewActive && session === sessionKey.value
  const stillSelected = () => current() && selection === conversationSelection
    && selectedConversation.value?.id === conversation.id

  changingOperationalBranch.value = true
  try {
    if (previousBranchId && branchId) {
      const confirmed = await confirmDialog({
        title: 'Transferir conversación',
        message: 'La conversación cambiará de sucursal y se liberará el asesor asignado. ¿Deseas continuar?',
        confirmLabel: 'Transferir',
        tone: 'warning',
      })
      if (!confirmed) {
        if (stillSelected()) input.value = String(selectedConversation.value?.operationalBranchId ?? 0)
        return
      }
      if (!stillSelected() || selectedConversation.value?.operationalBranchId !== previousBranchId) return
    }
    const updated = await whatsappStore.updateOperationalBranch(conversation.id, branchId)
    if (!updated || !current()) return
    if (stillSelected()) selectedConversation.value = updated
    success('Sucursal operativa actualizada', 2200)
    // A failed GET cannot undo a confirmed PUT or report it as an unsuccessful transfer.
    const refreshed = await reloadConversations()
    if (current() && !refreshed && inboxError.value) {
      showError('Sucursal actualizada', 'El cambio se guardó, pero no se pudo actualizar la bandeja. Pulsa Reintentar.')
    }
  } catch (error: any) {
    if (!current()) return
    if (stillSelected()) input.value = String(selectedConversation.value?.operationalBranchId ?? previousBranchId ?? 0)
    showError('Sucursal operativa', error.message || 'No se pudo actualizar la sucursal.')
  } finally {
    if (current()) changingOperationalBranch.value = false
  }
}
''' + s[b:]
s = edit(s, "  void routingRefresh.invalidate().catch(error => {\n    console.error('No se pudo actualizar la bandeja tras un cambio de ruta WhatsApp', error)\n  })", '  void reloadConversations()')
s = edit(s, 'async function retryWhatsAppStatus() {\n  loadingStatus.value = true', 'async function retryWhatsAppStatus() {\n  if (!viewActive) return\n  const session = sessionKey.value\n  loadingStatus.value = true')
s = edit(s, '    await whatsappStore.refreshStatus()\n', '    await whatsappStore.refreshStatus()\n    if (!viewActive || session !== sessionKey.value) return\n')
a = s.index('async function reloadConversations() {')
b = s.index('let realtimeFallbackId:', a)
s = s[:a] + '''async function readConversations(context: RefreshContext) {
  if (!viewActive || !whatsappStore.enabled) return
  const generation = ++conversationsGeneration
  const previousSelected = selectedConversation.value
  // Both reads must settle before a trailing invalidation: Promise.all can reject
  // while the other shared request is still running and cause reuse of an old snapshot.
  const results = await Promise.allSettled([whatsappStore.fetchConversations({
    branchId: selectedBranchId.value || undefined,
    search: search.value.trim() || undefined,
    unreadOnly: unreadOnly.value || undefined,
  }, context.signal), whatsappStore.fetchUnreadSummary()])
  if (!viewActive || !context.isCurrent() || generation !== conversationsGeneration) return
  if (results[0].status === 'rejected') throw results[0].reason
  if (previousSelected && selectedConversation.value?.id === previousSelected.id) {
    const refreshed = whatsappStore.conversations.find(c => c.id === previousSelected.id)
    selectedConversation.value = refreshed
      ?? (previousSelected.isCentralChannel && previousSelected.assignedUserId === authStore.user?.id
        ? previousSelected
        : null)
  }
  await selectConversationFromRoute()
  if (results[1].status === 'rejected') throw results[1].reason
}

const routingRefresh = createWhatsAppRoutingRefresh(readConversations)
async function reloadConversations(): Promise<boolean> {
  if (!viewActive) return false
  const scope = inboxScope.value
  inboxError.value = ''
  try {
    await routingRefresh.invalidate(scope)
    return viewActive && scope === inboxScope.value
  } catch {
    if (viewActive && scope === inboxScope.value) inboxError.value = 'No se pudo actualizar la bandeja. Intenta nuevamente.'
    return false
  }
}

''' + s[b:]
s = edit(s, "  if (realtimeFallbackId || connectionState.value === 'connected') return", "  if (!viewActive || realtimeFallbackId || connectionState.value === 'connected') return")
s = edit(s, '    if (activeId && selectedConversation.value?.id === activeId) await whatsappStore.fetchMessages(activeId)', '    if (viewActive && activeId && selectedConversation.value?.id === activeId) await whatsappStore.fetchMessages(activeId)')
s = edit(s, 'async function selectConversation(conversation: WhatsAppConversation) {\n  mobilePane', 'async function selectConversation(conversation: WhatsAppConversation) {\n  if (!viewActive) return\n  mobilePane')
s = edit(s, 'async function loadConversationContext(conversation: WhatsAppConversation) {\n  const generation = ++contextGeneration\n  const isCurrent = () => generation === contextGeneration && selectedConversation.value?.id === conversation.id', '''async function loadConversationContext(conversation: WhatsAppConversation) {
  if (!viewActive) return
  const generation = ++contextGeneration, session = sessionKey.value
  const branchId = conversation.operationalBranchId ?? conversation.branchId
  const isCurrent = () => viewActive && session === sessionKey.value && generation === contextGeneration
    && selectedConversation.value?.id === conversation.id
    && (selectedConversation.value.operationalBranchId ?? selectedConversation.value.branchId) === branchId''')
s = edit(s, '''    if (addresses.length === 0) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      if (!isCurrent()) return''', '''    if (!Array.isArray(customer.addresses)) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      if (!isCurrent()) return''')
s = edit(s, '''    if (addresses.length === 0) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      addresses = addressRes.data ?? []
    }
    selectedCustomer.value = { ...resolvedCustomer, addresses }''', '''    if (!Array.isArray(resolvedCustomer.addresses)) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      addresses = addressRes.data ?? []
    }
    selectedCustomer.value = { ...resolvedCustomer, addresses }''')
s = edit(s, 'onBeforeUnmount(() => {\n  routingRefresh.dispose()', 'onBeforeUnmount(() => {\n  viewActive = false\n  routingRefresh.dispose()')
s = edit(s, "watch(connectionState, (current, previous) => {\n  if (current === 'connected') stopRealtimeFallback()", "watch(connectionState, (current, previous) => {\n  if (!viewActive) return\n  if (current === 'connected' && previous !== 'connected' && whatsappStore.enabled) void reloadConversations()\n  if (current === 'connected') stopRealtimeFallback()")
# Reset only the current scope. Disposing the queue also aborts its list request,
# while unread summary remains shared with navigation consumers.
pos = s.index("watch(\n  () => route.query.conversationId,")
s = s[:pos] + '''watch(inboxScope, () => {
  routingRefresh.cancel()
  conversationsGeneration++
  inboxError.value = ''
}, { flush: 'sync' })

watch(sessionKey, () => {
  selectedConversation.value = null
  draft.value = ''
  clearSelectedFile()
  changingOperationalBranch.value = false
  if (viewActive && authStore.user) void retryWhatsAppStatus()
}, { flush: 'sync' })

watch(() => [selectedConversation.value?.id,
  selectedConversation.value?.operationalBranchId ?? selectedConversation.value?.branchId] as const,
([id, branchId], [oldId, oldBranchId]) => {
  if (!id) {
    contextGeneration++
    selectedCustomer.value = null
    selectedAddress.value = null
    aiOrderDraft.value = null
    contextLoading.value = false
  } else if (id === oldId && branchId !== oldBranchId && selectedConversation.value) {
    // Covers both local PUT responses and remote routing events, including mutations
    // of the selected store object, without refreshing unrelated conversations.
    void loadConversationContext(selectedConversation.value)
  }
}, { flush: 'sync' })

''' + s[pos:]
Path(p).write_text(s)
print('Applied bounded PR84 edits to view and store; no production access.')

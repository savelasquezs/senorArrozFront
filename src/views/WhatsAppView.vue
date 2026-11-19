<template>
  <div class="contents">
    <div class="h-full min-h-0 bg-gray-50 flex flex-col">
      <div
        v-if="statusLoadError && whatsappStore.status"
        class="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        role="alert"
      >
        <span>{{ statusLoadError }} Se conserva el último estado conocido.</span>
        <button type="button" class="shrink-0 font-semibold underline" @click="retryWhatsAppStatus">Reintentar</button>
      </div>

      <div v-if="loadingStatus" class="flex-1 grid place-items-center">
        <BaseLoading text="Consultando estado de WhatsApp..." />
      </div>

      <div v-else-if="statusLoadError && !whatsappStore.status" class="flex-1 grid place-items-center p-6">
        <div class="max-w-lg rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-500" />
          <h2 class="mt-3 text-lg font-semibold text-gray-900">No pudimos consultar el estado de WhatsApp</h2>
          <p class="mt-2 text-sm text-gray-600">{{ statusLoadError }}</p>
          <BaseButton class="mt-4" :loading="loadingStatus" @click="retryWhatsAppStatus">Reintentar</BaseButton>
        </div>
      </div>

      <div v-else-if="!whatsappStore.enabled" class="flex-1 grid place-items-center p-6">
        <div class="max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <ChatBubbleLeftRightIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h2 class="mt-3 text-lg font-semibold text-gray-900">WhatsApp aún no está configurado</h2>
          <p class="mt-2 text-sm text-gray-600">
            Configura y verifica la conexión desde el módulo Sucursal para habilitar esta vista.
          </p>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <p v-if="inboxError" role="alert" class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {{ inboxError }} <button type="button" class="ml-2 underline" @click="reloadConversations">Reintentar</button>
        </p>
        <nav class="flex shrink-0 gap-2 border-b bg-white px-3 py-2 xl:hidden" aria-label="Vista de atención">
          <BaseButton size="sm" variant="outline" @click="mobilePane = 'inbox'">Conversaciones</BaseButton>
          <BaseButton size="sm" variant="outline" :disabled="!selectedConversation" @click="mobilePane = 'chat'">Chat</BaseButton>
          <BaseButton size="sm" variant="outline" :disabled="!selectedConversation" @click="mobilePane = 'order'; contextPanelCollapsed = false">Pedido</BaseButton>
        </nav>
        <div ref="columnsContainer" class="whatsapp-columns relative grid min-h-0 flex-1 grid-cols-1"
          :class="{ 'with-order': selectedConversation && !contextPanelCollapsed }"
          :style="{ '--inbox-width': `${leftWidth}px`, '--order-width': `${rightWidth}px` }">

        <aside class="relative min-h-0 border-r border-gray-200 bg-white flex flex-col" :class="{ 'max-xl:hidden': mobilePane !== 'inbox' }">
          <div role="separator" tabindex="0" aria-label="Ancho de conversaciones" aria-orientation="vertical" :aria-valuenow="leftWidth" class="absolute -right-1 top-0 z-10 hidden h-full w-2 cursor-col-resize touch-none xl:block" @pointerdown="resize($event, 'left')" @keydown.left.prevent="step('left', -20)" @keydown.right.prevent="step('left', 20)" />
          <div class="shrink-0 space-y-2 border-b border-gray-100 p-3">
            <div class="flex items-center justify-between gap-2">
              <h1 class="flex min-w-0 items-center gap-1.5 text-base font-semibold text-gray-900"><ChatBubbleLeftRightIcon class="h-5 w-5 shrink-0 text-emerald-600" />WhatsApp</h1>
              <span class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium" :class="signalRStatusClasses" :title="signalRError || signalRStatusLabel">
                <span class="h-1.5 w-1.5 rounded-full" :class="signalRDotClass" />{{ signalRStatusLabel }}
              </span>
              <BaseButton variant="ghost" size="sm" :loading="whatsappStore.isLoadingConversations" @click="reloadConversations">Actualizar</BaseButton>
            </div>
            <input v-model="search" type="search" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Buscar teléfono o nombre" @input="onSearchInput" />
            <div class="relative grid grid-cols-2 gap-2 text-xs">
              <details name="whatsapp-inbox-controls" class="group" @keydown.esc.stop="closeDetailsMenu">
                <summary class="inbox-control" :class="{ 'border-emerald-300 bg-emerald-50 text-emerald-900': inboxFilterCount }">
                  <FunnelIcon class="h-4 w-4 shrink-0" aria-hidden="true" /><span>Filtros</span>
                  <span v-if="inboxFilterCount" class="rounded-full bg-emerald-700 px-1.5 text-[10px] text-white">{{ inboxFilterCount }}</span>
                  <ChevronDownIcon class="ml-auto h-3 w-3 shrink-0 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div class="inbox-control-panel space-y-3" role="region" aria-label="Filtros de la bandeja">
                  <select v-if="showBranchFilter" v-model="selectedBranchId" aria-label="Filtrar por sucursal"
                    class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5" @change="reloadConversations">
                    <option :value="0">Todas las sucursales</option>
                    <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.label }}</option>
                  </select>
                  <div class="flex flex-wrap gap-x-3 gap-y-2">
                    <label class="inline-flex items-center gap-1.5"><input v-model="unroutedOnly" type="checkbox" class="accent-emerald-700" @change="reloadConversations" />Sin sede operativa</label>
                    <label class="inline-flex items-center gap-1.5"><input v-model="unreadOnly" type="checkbox" class="accent-emerald-700" @change="reloadConversations" />No leídos</label>
                  </div>
                  <select v-model="selectedLabel" aria-label="Filtrar por etiqueta" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5">
                    <option value="">Todas las etiquetas</option>
                    <option v-for="label in inboxLabels" :key="label.key" :value="label.key">{{ label.name }}</option>
                  </select>
                  <BaseButton v-if="inboxFilterCount" variant="ghost" size="sm" @click="resetInboxFilters">Restablecer filtros</BaseButton>
                </div>
              </details>
              <details name="whatsapp-inbox-controls" class="group" @keydown.esc.stop="closeDetailsMenu">
                <summary class="inbox-control">
                  <WrenchScrewdriverIcon class="h-4 w-4 shrink-0" aria-hidden="true" /><span>Herramientas</span>
                  <ChevronDownIcon class="ml-auto h-3 w-3 shrink-0 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div class="inbox-control-panel !p-1.5" role="region" aria-label="Herramientas de la bandeja">
                  <button v-for="tool in inboxTools" :key="tool.label" type="button" class="inbox-tool"
                    :disabled="tool.disabled" :title="tool.title" @click="tool.run">
                    <component :is="tool.icon" class="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span>{{ tool.label }}</span>
                    <span v-if="tool.label === 'Estado de la IA'" class="ml-auto truncate rounded-md border px-1.5 py-0.5 text-[10px]" :class="aiStatusChipClasses">
                      {{ aiStatusChipLabel }}
                    </span>
                  </button>
                </div>
              </details>
            </div>
          </div>
          <WhatsAppInboxTabs
            v-model="activeInbox"
            :sections="inboxSections"
            :counts="inboxCounts"
            :selected-conversation-id="selectedConversation?.id"
            :loading="whatsappStore.isLoadingConversations"
            :is-superadmin="authStore.isSuperadmin"
          >
            <template #default="{ conversations }">
              <div
                v-for="(conversation, conversationIndex) in conversations"
                v-memo="[...Object.values(conversation), inboxLabelsByKey, selectedLabel, selectedConversation?.id === conversation.id, conversationIndex === 0 || commercialGroup(conversations[conversationIndex - 1]!) !== commercialGroup(conversation), Math.floor(clockNow / 60_000)]"
                :key="conversation.id"
                class="relative w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                :class="selectedConversation?.id === conversation.id ? 'bg-emerald-50' : conversation.attentionMode === 'waitingForHuman' ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : 'bg-white'"
              >
                <button
                  type="button"
                  class="absolute inset-0 z-10 w-full focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-emerald-600"
                  :aria-label="`Abrir chat con ${conversationTitle(conversation)} (${conversationIdentityLabel(conversation)})`"
                  @click="selectConversation(conversation)"
                />
                <p v-if="conversationIndex === 0 || commercialGroup(conversations[conversationIndex - 1]!) !== commercialGroup(conversation)" class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{{ commercialGroup(conversation) }}</p>
                <div class="flex items-center justify-between gap-2">
                  <div class="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span class="min-w-0 truncate text-sm font-semibold text-gray-950">{{ conversationTitle(conversation) }}</span>
                    <span class="shrink-0 text-xs text-gray-300">-</span>
                    <span class="truncate text-xs font-medium" :class="conversation.phoneNumber ? 'text-gray-500' : 'text-emerald-700'">{{ conversationIdentityLabel(conversation) }}</span>
                  </div>
                  <span v-if="conversation.unreadCount > 0" class="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {{ conversation.unreadCount }}
                  </span>
                </div>
                <span v-if="conversation.labels?.length" class="mt-1.5 flex flex-wrap gap-1.5" data-test="inbox-conversation-labels">
                  <button
                    v-for="key in conversation.labels"
                    :key="key"
                    type="button"
                    class="relative z-20 hover:opacity-80 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                    :class="[inboxLabelClasses(key), { 'ring-2 ring-gray-700 ring-offset-1': selectedLabel === key }]"
                    :aria-pressed="selectedLabel === key"
                    @click="selectedLabel = selectedLabel === key ? '' : key"
                  >
                    {{ inboxLabelName(key) }}
                  </button>
                </span>
                <div class="mt-1 flex min-w-0 items-baseline gap-2 text-xs">
                  <span
                    class="min-w-0 flex-1 truncate"
                    :class="conversation.unreadCount > 0 ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'"
                  >
                    {{ shortConversationPreview(conversation.lastMessagePreview) }}
                  </span>
                  <span
                    class="shrink-0 font-medium"
                    :class="conversation.unreadCount > 0 ? 'text-emerald-700' : 'text-gray-400'"
                  >
                    {{ formatRelativeConversationTime(conversation.lastMessageAt || conversation.createdAt) }}
                  </span>
                </div>
                <div class="mt-1 flex items-center justify-between gap-2">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="attentionBadgeClass(conversation.attentionMode)" :title="attentionTooltip(conversation)">{{ attentionLabel(conversation) }}</span>
                  <span class="min-w-0 truncate text-[10px] font-medium text-gray-500">{{ commercialLabel(conversation) }} · {{ whatsappConversationBranchLabel(conversation) }}</span>
                </div>
              </div>
            </template>
          </WhatsAppInboxTabs>
          <div v-if="whatsappStore.hasMoreConversations || whatsappStore.conversationWindowed" class="flex shrink-0 flex-wrap gap-2 border-t p-2">
            <BaseButton v-if="whatsappStore.hasMoreConversations" size="sm" variant="outline" :loading="whatsappStore.isLoadingConversations" @click="loadMoreConversations">Cargar más conversaciones</BaseButton>
            <BaseButton v-if="whatsappStore.conversationWindowed" size="sm" variant="ghost" @click="reloadConversations">Volver al inicio</BaseButton>
          </div>
        </aside>

        <section class="min-h-0 flex flex-col bg-gray-50" :class="{ 'max-xl:hidden': mobilePane !== 'chat' }">
          <header v-if="selectedConversation" :key="selectedConversation.id"
            class="chat-header relative z-10 min-w-0 shrink-0 border-b border-gray-200 bg-white px-2 py-1" data-test="whatsapp-chat-header">
            <div class="flex min-h-8 items-center justify-between gap-1.5">
              <div class="flex min-w-0 flex-1 items-baseline gap-1.5">
                <p class="truncate whitespace-nowrap text-sm font-semibold text-gray-900" :class="{ 'max-w-[55%]': chatIdentity }" :title="conversationTitle(selectedConversation)">
                  {{ conversationTitle(selectedConversation) }}
                </p>
                <p v-if="chatIdentity" class="chat-identity truncate whitespace-nowrap text-xs text-gray-500" :title="chatIdentity">
                  {{ chatIdentity }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <div ref="commercialSaveTarget" class="flex shrink-0 items-center text-[11px]" data-test="whatsapp-commercial-save" />
                <BaseButton v-if="canTakeAttention" size="xs" aria-label="Tomar conversación" title="Tomar conversación"
                  class="chat-take whitespace-nowrap" :loading="changingAttention" @click="changeAttention('take')">
                  <UserPlusIcon class="chat-action-icon h-4 w-4" aria-hidden="true" />
                  <span class="chat-action-label">Tomar conversación</span>
                </BaseButton>
                <BaseButton v-else-if="canTakeOver" size="xs" variant="outline" aria-label="Retomar conversación"
                  title="Retomar conversación" class="chat-take whitespace-nowrap" :loading="changingAttention"
                  :disabled="confirmingTakeover" @click="confirmTakeover">
                  <UserPlusIcon class="chat-action-icon h-4 w-4" aria-hidden="true" />
                  <span class="chat-action-label">Retomar conversación</span>
                </BaseButton>
                <details class="chat-menu relative" name="whatsapp-chat-tools" @keydown.esc.stop="closeDetailsMenu">
                  <summary class="chat-tool" aria-label="Etiquetas" title="Etiquetas">
                    <TagIcon class="chat-action-icon h-4 w-4" aria-hidden="true" />
                    <span class="chat-action-label">Etiquetas</span>
                    <span v-if="selectedConversation.labels?.length" class="chat-label-count text-[10px] text-emerald-700">{{ selectedConversation.labels.length }}</span>
                    <span v-for="key in selectedConversation.labels?.slice(0, 2)" :key="key" class="chat-label-chip max-w-24 truncate" :class="inboxLabelClasses(key)">{{ inboxLabelName(key) }}</span>
                    <span v-if="(selectedConversation.labels?.length ?? 0) > 2" class="chat-label-chip text-[10px] text-emerald-700">+{{ (selectedConversation.labels?.length ?? 0) - 2 }}</span>
                  </summary>
                  <section class="chat-menu-panel absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label="Etiquetas de la conversación">
                    <div class="flex items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                      <h2 class="flex items-center gap-2 text-sm font-bold text-emerald-950">
                        <TagIcon class="h-4 w-4 text-emerald-700" aria-hidden="true" />Etiquetas
                      </h2>
                      <BaseButton size="sm" class="gap-1" @click="openInboxLabelEditor()">
                        <PlusIcon class="h-4 w-4" aria-hidden="true" />Nueva etiqueta
                      </BaseButton>
                    </div>
                    <WhatsAppInboxLabelList class="max-h-[min(22rem,52dvh)] overflow-y-auto overscroll-contain p-2"
                      :labels="chatInboxLabels" :applied="selectedConversation.labels" :can-assign="canEditInboxLabels"
                      :busy="changingInboxLabel || savingInboxLabel" @toggle="setInboxLabel" @edit="openInboxLabelEditor" @remove="removeInboxLabel" />
                  </section>
                </details>
                <button v-if="ownsConversation" type="button" class="chat-tool text-emerald-700 disabled:opacity-50"
                  title="Marcar como atendida" aria-label="Marcar como atendida"
                  :disabled="changingAttention || confirmingClose || sending || sendingProductChoices"
                  @click="markConversationAttended">
                  <CheckIcon class="h-4 w-4" aria-hidden="true" />
                </button>
                <details class="chat-menu relative" name="whatsapp-chat-tools" data-test="whatsapp-chat-actions">
                  <summary class="chat-tool" aria-label="Gestionar chat" title="Gestionar chat">
                    <EllipsisHorizontalIcon class="chat-action-icon h-5 w-5" aria-hidden="true" />
                    <span class="chat-action-label">Gestionar chat</span>
                  </summary>
                  <div class="chat-menu-panel absolute right-0 top-full z-20 mt-1 flex max-h-[70dvh] w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <div ref="commercialControlsTarget" class="flex flex-wrap items-center gap-1 empty:hidden" data-test="whatsapp-commercial-controls" />
                    <label v-if="canAssignOperationalBranch" class="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600">
                      Sucursal operativa
                      <select
                        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                        :value="selectedConversation.operationalBranchId ?? 0"
                        :disabled="changingOperationalBranch"
                        @change="changeOperationalBranch"
                      >
                        <option :value="0">Sin asignar</option>
                        <option v-for="branch in whatsappStore.operationalBranches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
                      </select>
                    </label>
                      <BaseButton v-if="ownsConversation" size="sm" variant="secondary" :loading="changingAttention" @click="changeAttention('release')">Soltar</BaseButton>
                      <BaseButton v-if="canReturnToAi" variant="secondary" size="sm" :loading="changingAttention" @click="changeAttention('return-to-ai')">Devolver a la IA</BaseButton>
                      <template v-if="ownsConversation">
                        <select v-model="transferTarget" aria-label="Asesor destino" class="rounded border px-2 py-1 text-sm">
                          <option :value="0">Transferir a asesor…</option>
                          <option v-for="advisor in advisors.filter(a => a.id !== authStore.user?.id)" :key="advisor.id" :value="advisor.id">{{ advisor.name }}</option>
                        </select>
                        <BaseButton size="sm" variant="secondary" :disabled="!transferTarget" :loading="changingAttention" @click="changeAttention('transfer')">Transferir asesor</BaseButton>
                      </template>
                      <BaseButton v-if="canPauseAi" variant="secondary" size="sm" :loading="changingAttention" @click="changeAttention('pause-ai')">Pausar IA</BaseButton>
                      <BaseButton
                        v-if="canResetTestContext"
                        variant="secondary"
                        size="sm"
                        :loading="resettingConversation"
                        :disabled="changingAttention"
                        :icon="ArrowPathIcon"
                        title="Borra mensajes y carrito de IA, pero conserva el cliente y sus direcciones"
                        @click="resetConversationForTesting"
                      >
                        Reiniciar prueba
                      </BaseButton>
                      <BaseButton
                        variant="secondary"
                        size="sm"
                        :title="latestFailureReason || 'Ver fallos, transferencias y reintentos de la IA'"
                        @click="openAiDiagnostics"
                      >
                        Fallos IA<span v-if="failureActivityCount"> ({{ failureActivityCount }})</span>
                      </BaseButton>
                      <BaseButton v-if="selectedConversation.attentionMode === 'closed'" size="sm" :loading="changingAttention" @click="changeAttention('reopen')">Reabrir conversación</BaseButton>
                  </div>
                </details>
                <BaseTooltip :icon="InformationCircleIcon" label="Información de la conversación" :text="chatInfoText" compact />
                <WhatsAppAiStatusStrip :diagnostics="chatAiDiagnostics" :processing="latestAiProcessing"
                  :answered="chatAiAnswered" :error="chatAiDiagnostics ? null : whatsappStore.aiDiagnosticsError"
                  @open="openAiDiagnostics" />
                <BaseButton variant="ghost" size="sm" icon-only class="chat-order-toggle"
                  :icon="contextPanelCollapsed ? ChevronDoubleLeftIcon : ChevronDoubleRightIcon"
                  :aria-label="contextPanelCollapsed ? 'Abrir pedido' : 'Contraer pedido'"
                  :title="contextPanelCollapsed ? 'Abrir pedido' : 'Contraer pedido'"
                  @click="contextPanelCollapsed = !contextPanelCollapsed" />
              </div>
            </div>
          </header>

          <div v-if="!selectedConversation" class="flex-1 grid place-items-center p-6 text-center text-gray-500">
            <div>
              <ChatBubbleOvalLeftEllipsisIcon class="mx-auto h-12 w-12 text-gray-400" />
              <p class="mt-3 text-sm">Selecciona una conversación para ver los mensajes.</p>
            </div>
          </div>
          <template v-else>
            <div ref="messagesContainer" data-test="whatsapp-chat-messages" @scroll="trackMessageScroll" class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              <p v-if="whatsappStore.isLoadingMessages && !currentMessages.length" role="status" class="text-center text-sm text-gray-500">Cargando mensajes…</p>
              <BaseButton v-if="whatsappStore.messageHistory[selectedConversation.id]?.hasMoreRecent" size="sm" variant="outline" class="mx-auto" @click="showRecentMessages">Volver a los recientes</BaseButton>
              <button v-if="whatsappStore.messageHistory[selectedConversation.id]?.hasMore" type="button"
                class="mx-auto block rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                :disabled="whatsappStore.olderMessagesLoading[selectedConversation.id]" @click="loadOlderMessages">
                {{ whatsappStore.olderMessagesLoading[selectedConversation.id] ? 'Cargando…' : 'Cargar mensajes anteriores' }}
              </button>
              <div
                v-for="message in currentMessages"
                :key="message.id"
                :data-message-id="message.id"
                class="group/message flex"
                :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="relative max-w-[78%] rounded-lg px-3 py-2 shadow-sm"
                  :class="message.direction === 'outbound' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-900'"
                >
                  <WhatsAppMessageActions v-if="ownsConversation && !finishingAttention && !message.hiddenSource"
                    class="wa-message-toolbar" :class="message.direction === 'outbound' ? 'right-2' : 'left-2'"
                    :can-send="canSend && !!message.whatsAppMessageId && message.status !== 'failed'" :open="reactionPickerId === message.id"
                    :outbound="message.direction === 'outbound'" :busy="messageActionId === message.id" :current-reaction="message.businessReaction"
                    @reply="startMessageReply(message)" @toggle="reactionPickerId = reactionPickerId === message.id ? null : message.id"
                    @react="emoji => reactToMessage(message, emoji)" @hide="hideMessage(message)" />
                  <p v-if="message.hiddenSource" class="text-sm italic opacity-80">
                    {{ message.hiddenSource === 'pos' ? 'Mensaje oculto en el POS' : 'Mensaje eliminado desde WhatsApp Business' }}
                  </p>
                  <template v-else>
                    <button v-if="message.replyToWhatsAppMessageId" type="button"
                      class="mb-2 block w-full rounded-md border-l-[3px] border-emerald-300 bg-black/5 px-2 py-1.5 text-left text-xs hover:bg-black/10"
                      :disabled="!quotedMessage(message)" @click="focusQuotedMessage(message)">
                      <span class="block font-semibold">{{ quotedMessage(message)?.direction === 'outbound' ? 'Señor Arroz' : 'Mensaje citado' }}</span>
                      <span class="block truncate opacity-85">{{ messageSummary(quotedMessage(message)) }}</span>
                    </button>
                    <a v-if="message.location" :href="mapLink(message.location)" target="_blank" rel="noopener noreferrer"
                      class="mb-1 flex max-w-xs items-center gap-2.5 rounded-xl border border-current/15 bg-black/5 p-2.5 transition-colors hover:bg-black/10">
                      <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><MapPinIcon class="h-5 w-5" aria-hidden="true" /></span>
                      <span class="min-w-0">
                        <span class="block text-sm font-semibold">{{ message.location.name || 'Ubicación compartida' }}</span>
                        <span v-if="message.location.address" class="block break-words text-xs opacity-80">{{ message.location.address }}</span>
                        <span class="block text-xs font-medium underline">Abrir mapa</span>
                      </span>
                    </a>
                    <div v-else-if="message.contacts?.length" class="space-y-1.5">
                      <div v-for="(contact, index) in message.contacts" :key="index"
                        class="flex max-w-xs items-start gap-2.5 rounded-xl border border-current/15 bg-black/5 p-2.5">
                        <UserCircleIcon class="h-8 w-8 shrink-0 opacity-80" aria-hidden="true" />
                        <div class="min-w-0">
                          <p class="break-words text-sm font-semibold">{{ contact.name }}</p>
                          <a v-for="phone in contact.phones" :key="phone" :href="`tel:${phone.replace(/[^+\d]/g, '')}`"
                            class="block break-all text-xs underline">{{ phone }}</a>
                        </div>
                      </div>
                    </div>
                  <div v-if="message.mediaUrl" class="mb-2">
                    <button
                      v-if="message.type === 'image' || message.type === 'sticker'"
                      type="button"
                      class="block max-w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      title="Ver imagen"
                      @click="openImagePreview(message)"
                    >
                      <img
                        loading="lazy" decoding="async" width="256" height="192"
                        :src="message.mediaUrl"
                        :alt="message.mediaFileName || 'Imagen de WhatsApp'"
                        class="max-h-80 max-w-full cursor-zoom-in object-contain"
                      />
                    </button>
                    <audio
                      preload="none"
                      v-else-if="message.type === 'audio'"
                      :src="message.mediaUrl"
                      controls
                      class="w-72 max-w-full"
                    />
                    <video
                      preload="none"
                      v-else-if="message.type === 'video'"
                      :src="message.mediaUrl"
                      controls
                      class="max-h-80 max-w-full rounded-md"
                    />
                    <a
                      v-else
                      :href="message.mediaUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      :class="message.direction === 'outbound' ? 'border-emerald-200 bg-emerald-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'"
                    >
                      <DocumentIcon class="h-5 w-5 shrink-0" />
                      <span class="min-w-0 flex-1 truncate">{{ message.mediaFileName || 'Abrir archivo' }}</span>
                      <span v-if="message.mediaFileSize" class="text-xs opacity-80">{{ formatFileSize(message.mediaFileSize) }}</span>
                    </a>
                  </div>
                  <p v-if="message.textBody && !message.location && !message.contacts?.length" class="whitespace-pre-wrap break-words text-sm">{{ message.textBody }}</p>
                  <p v-else-if="message.type !== 'text' && !message.mediaUrl && !message.location && !message.contacts?.length" class="text-sm opacity-80">
                    {{ mediaFallbackLabel(message) }}
                  </p>
                  <div v-if="productSuggestions.get(message.id)?.length" class="mt-2 flex flex-wrap gap-1.5" aria-label="Sugerencias de productos">
                    <template v-for="suggestion in productSuggestions.get(message.id)" :key="suggestion.productId ?? suggestion.reply">
                      <button
                        v-if="suggestion.kind === 'add'"
                        type="button"
                        class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-65"
                        :disabled="isSuggestionApplied(message.id, suggestion) || !suggestion.available || !currentSuggestionState?.canApply || suggestionBranch !== visibleSuggestionBranch"
                        @click="addProductSuggestion(message.id, suggestion)"
                      >
                        {{ isSuggestionApplied(message.id, suggestion) ? 'Agregado' : !suggestionBranch ? 'Elige la sucursal' : suggestion.available ? 'Agregar' : 'Sin disponibilidad' }}
                        {{ suggestion.quantity }} × {{ suggestion.name }} · $ {{ suggestion.unitPrice?.toLocaleString('es-CO') }}
                      </button>
                      <button
                        v-else-if="suggestion.reply"
                        type="button"
                        class="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-65"
                        :title="suggestion.reply"
                        :disabled="!canSend"
                        @click="draftOrderMessage(message.conversationId, suggestion.reply)"
                      >
                        {{ suggestion.kind === 'clarify' ? 'Preparar pregunta' : 'Preparar respuesta' }}
                      </button>
                    </template>
                  </div>
                  <div v-if="message.customerReaction || message.businessReaction" class="mt-1.5 flex gap-1" aria-label="Reacciones">
                    <span v-if="message.customerReaction" :key="`customer-${message.customerReaction}`" class="wa-reaction" title="Reacción del cliente">{{ message.customerReaction }}</span>
                    <span v-if="message.businessReaction" :key="`business-${message.businessReaction}`" class="wa-reaction" title="Reacción de Señor Arroz">{{ message.businessReaction }}</span>
                  </div>
                  </template>
                  <div class="mt-1 flex items-center justify-end gap-2 text-[11px]" :class="message.direction === 'outbound' ? 'text-emerald-50' : 'text-gray-400'">
                    <span v-if="message.source === 'businessApp'">Celular · </span><span v-if="message.isHistorical">Historial · </span><span>{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.direction === 'outbound'">{{ statusLabel(message.status) }}</span>
                  </div>
                  <div
                    v-if="!message.hiddenSource && message.direction === 'inbound' && message.aiProcessing"
                    class="mt-2 flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium"
                    :class="aiMessageStatusClasses(message.aiProcessing)"
                    role="status"
                    :title="aiProcessingReason(message.aiProcessing)"
                  >
                    <CpuChipIcon class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ message.aiProcessing.title || aiValueLabel(message.aiProcessing.status) }}</span>
                    <span v-if="message.aiProcessing.willRetry" class="opacity-80">
                      · intento {{ message.aiProcessing.attempts }}/{{ message.aiProcessing.maxAttempts }}
                    </span>
                  </div>
                </div>
              </div>
              <div ref="messagesEnd" />
            </div>
            <BaseButton v-if="newMessageCount" class="mx-auto mb-2" size="sm" variant="outline" @click="showRecentMessages">Nuevos mensajes · {{ newMessageCount }}</BaseButton>

            <form class="border-t border-gray-200 bg-white p-3" @submit.prevent="sendMessage">
              <p v-if="!ownsConversation && !canTakeAttention" class="mb-2 rounded-lg bg-gray-100 p-2 text-sm text-gray-600">
                {{ selectedConversation.attentionMode === 'closed' ? 'Conversación atendida.' : 'Puedes consultar esta conversación.' }}
              </p>
              <p v-if="ownsConversation && !serviceWindowOpen" class="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">La ventana de atención de 24 horas está cerrada. Usa una plantilla aprobada para iniciar el contacto.</p>
              <p v-else-if="ownsConversation" class="mb-2 text-xs text-gray-500">Ventana de atención hasta {{ new Date(selectedConversation.customerServiceWindowExpiresAt!).toLocaleString('es-CO') }}</p>
              <WhatsAppConversationTemplates v-if="ownsConversation" :key="selectedConversation.id" :conversation-id="selectedConversation.id" />
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-xs font-medium text-gray-500">Rápidas</span>
                <button v-if="ownsConversation" type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  :disabled="sending || sendingProductChoices || !canSend" @click="openProductChoices">Elegir presentación</button>
                <button
                  v-for="reply in topQuickReplies"
                  :key="reply.id"
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  :disabled="sending || sendingProductChoices || preparingQuickReply || !canSend"
                  :title="quickReplyDescription(reply)"
                  @click="runSavedQuickReply(reply)"
                >
                  /{{ reply.shortcut }}
                </button>
                <button type="button" aria-label="Crear o editar respuestas rápidas" title="Crear o editar respuestas rápidas"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300 text-emerald-800 hover:bg-emerald-50 focus-visible:outline-emerald-600"
                  @click="openQuickRepliesModal">
                  <PlusIcon class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div v-if="replyTarget" class="mb-2 flex items-center gap-2 rounded-lg border-l-[3px] border-emerald-500 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-950">
                <ArrowUturnLeftIcon class="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <span class="block font-semibold">{{ replyTarget.direction === 'outbound' ? 'Señor Arroz' : conversationTitle(selectedConversation) }}</span>
                  <span class="block truncate">{{ messageSummary(replyTarget) }}</span>
                </div>
                <button type="button" class="grid size-7 shrink-0 place-items-center rounded-md hover:bg-emerald-100"
                  aria-label="Quitar cita" title="Quitar cita" @click="replyTarget = null"><XMarkIcon class="h-4 w-4" aria-hidden="true" /></button>
              </div>
              <div v-if="selectedFile" class="mb-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ selectedFile.name }}</p>
                  <p class="text-xs text-emerald-700">{{ selectedFile.type || 'Archivo' }} · {{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button type="button" class="rounded-full p-1 hover:bg-emerald-100" title="Quitar archivo" @click="clearSelectedFile">
                  <XMarkIcon class="h-4 w-4" />
                </button>
              </div>
              <div class="flex items-end gap-2">
                <BaseButton type="button" variant="secondary" :loading="sendingMenu" :disabled="sending || !canSend" @click="sendMenu">
                  Enviar carta
                </BaseButton>
                <input ref="fileInput" type="file" class="hidden" @change="onFileSelected" />
                <BaseButton type="button" variant="secondary" :icon="PaperClipIcon" title="Adjuntar archivo" @click="openFilePicker">
                  Archivo
                </BaseButton>
                <textarea
                  ref="messageInput"
                  v-model="draft"
                  rows="2"
                  maxlength="4096"
                  class="min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  :placeholder="canTakeAttention ? 'Doble clic para tomar la conversación' : 'Escribe un mensaje'"
                  :aria-label="canTakeAttention ? 'Doble clic para tomar la conversación' : 'Escribe un mensaje'"
                  :class="{ 'cursor-pointer bg-slate-50': canTakeAttention }"
                  @keydown.enter.exact.prevent="sendMessage"
                  @keydown.tab="sendUniqueQuickReply"
                  @dblclick="takeFromComposer"
                  :readonly="canTakeAttention"
                  :disabled="!canSend && !canTakeAttention"
                />
                <BaseButton type="submit" :loading="sending || sendingProductChoices" :disabled="!canSend || preparingQuickReply || (!draft.trim() && !selectedFile)" :icon="PaperAirplaneIcon">
                  Enviar
                </BaseButton>
              </div>
              <div
                v-if="slashQuickReplyMatches.length"
                class="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm"
              >
                <p v-if="uniqueQuickReply" class="px-2 pb-1 text-xs text-gray-500">{{ uniqueQuickReply.saved && quickReplyMode(uniqueQuickReply.saved) !== 'send' ? 'Tab para preparar' : 'Tab para enviar' }}</p>
                <button
                  v-for="reply in slashQuickReplyMatches"
                  :key="reply.key"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white"
                  :disabled="sending || sendingProductChoices || preparingQuickReply || !canSend"
                  @click="chooseQuickReply(reply)"
                >
                  <span class="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">/{{ reply.shortcut }}</span>
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600">{{ reply.preview }}</span>
                </button>
              </div>
              <p v-if="sendError" class="mt-2 text-sm text-red-600">{{ sendError }}</p>
            </form>
          </template>
        </section>

        <button
          v-if="selectedConversation && contextPanelCollapsed"
          type="button"
          class="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-emerald-200 bg-emerald-600 px-3 py-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-700"
          @click="contextPanelCollapsed = false; mobilePane = 'order'"
        >
          Pedido
        </button>

        <aside v-if="selectedConversation" v-show="!contextPanelCollapsed" data-test="whatsapp-order-column" class="relative min-h-0 border-l border-gray-200 bg-white flex flex-col" :class="{ 'max-xl:hidden': mobilePane !== 'order' }">
          <div role="separator" tabindex="0" aria-label="Ancho del pedido" aria-orientation="vertical" :aria-valuenow="rightWidth" class="absolute -left-1 top-0 z-10 hidden h-full w-2 cursor-col-resize touch-none xl:block" @pointerdown="resize($event, 'right')" @keydown.left.prevent="step('right', 20)" @keydown.right.prevent="step('right', -20)" />
          <KeepAlive :key="editorScope" :max="8">
            <WhatsAppOrderPanel ref="commercialPanel" :key="`${authStore.user?.id}:${selectedConversation.id}`" :conversation="selectedConversation" :initial-draft="prefetchedDraft" :controls-target="commercialControlsTarget" :save-target="commercialSaveTarget"
              :can-send-choices="canSend" :finishing-attention="finishingAttention" @change="commercialChanged" @draft-message="draftOrderMessage" @addresses-sent="addressesSent"
              @product-suggestion-state="setProductSuggestionState" />
          </KeepAlive>
        </aside>
        </div>
      </div>

      <BaseDialog v-model="showProductChoices" title="Enviar opciones de producto" size="sm">
        <form class="space-y-3" @submit.prevent="sendProductOptions(productChoiceGroupId)">
          <p v-if="loadingProductChoices" role="status" class="text-sm text-gray-500">Cargando catálogo…</p>
          <p v-else-if="!productChoiceGroups.length && !productChoicesError" class="text-sm text-gray-500">No hay presentaciones configuradas.</p>
          <label v-if="productChoiceGroups.length" class="block text-sm text-gray-700">
            Producto
            <select v-model.number="productChoiceGroupId" :disabled="sendingProductChoices"
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
              <option :value="0" disabled>Elige un arroz o una adición</option>
              <optgroup v-if="riceChoiceGroups.length" label="Arroces">
                <option v-for="group in riceChoiceGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
              </optgroup>
              <optgroup v-if="additionChoiceGroups.length" label="Adiciones">
                <option v-for="group in additionChoiceGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
              </optgroup>
            </select>
          </label>
          <p v-if="productChoicesError" role="alert" class="text-sm text-red-700">{{ productChoicesError }}</p>
          <div class="flex justify-end">
            <BaseButton type="submit" :loading="sendingProductChoices" :disabled="!productChoiceGroupId || !canSend || loadingProductChoices">Enviar opciones</BaseButton>
          </div>
        </form>
      </BaseDialog>

      <WhatsAppClosedDayReplies v-if="showClosedDayReplies" :key="sessionKey + ':' + selectedBranchId"
        v-model="showClosedDayReplies" :branch-id="selectedBranchId || undefined" @sent="reloadConversations" />

      <BaseDialog :model-value="!!quickReplyChoice" title="Cotizar con y sin chicharrón" size="sm"
        :dismissible="!preparingQuickReply" @update:model-value="open => { if (!open) clearQuickReplyPreview() }">
        <form class="space-y-4" @submit.prevent="confirmQuickReplyChoice">
          <label class="block text-sm font-semibold text-slate-800">
            Arroz
            <select v-model="quoteFamily" :disabled="preparingQuickReply" class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              @change="updateQuoteSize">
              <option value="">Selecciona un arroz</option>
              <option v-for="family in quoteFamilies" :key="family" :value="family">{{ family === 'paisa' ? 'Paisa' : 'Ropa Vieja' }}</option>
            </select>
          </label>
          <label class="block text-sm font-semibold text-slate-800">
            Tamaño
            <select v-model="quoteSize" :disabled="preparingQuickReply" class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Selecciona un tamaño</option>
              <option v-for="size in quoteSizes" :key="size" :value="size">{{ quoteSizeNames[size] }}</option>
            </select>
          </label>
          <p v-if="quickReplyPreviewError" class="text-sm text-rose-700" role="alert">{{ quickReplyPreviewError }}</p>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" :disabled="preparingQuickReply" @click="clearQuickReplyPreview">Cancelar</BaseButton>
            <BaseButton type="submit" :loading="preparingQuickReply" :disabled="!quoteFamily || !quoteSize">Preparar cotización</BaseButton>
          </div>
        </form>
      </BaseDialog>

      <BaseDialog v-model="showInboxLabelManager" title="Gestionar etiquetas" :icon="TagIcon" size="sm">
        <div class="space-y-3">
          <WhatsAppInboxLabelList v-if="customInboxLabels.length" :labels="customInboxLabels" :busy="savingInboxLabel"
            @edit="openInboxLabelEditor" @remove="removeInboxLabel" />
          <p v-else class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay etiquetas personalizadas.</p>
        </div>
        <template #footer>
          <BaseButton class="gap-1.5" @click="openInboxLabelEditor()"><PlusIcon class="h-4 w-4" aria-hidden="true" />Nueva etiqueta</BaseButton>
        </template>
      </BaseDialog>

      <BaseDialog v-model="showInboxLabelEditor" :title="editingInboxLabelKey ? 'Editar etiqueta' : 'Nueva etiqueta'"
        :icon="TagIcon" size="sm" z-class="z-[60]" :dismissible="!savingInboxLabel">
        <form class="space-y-5" @submit.prevent="saveInboxLabel">
          <label class="block text-sm font-semibold text-slate-800">
            Nombre
            <input v-model="inboxLabelDraft.name" data-autofocus type="text" required maxlength="40" placeholder="Nombre de la etiqueta"
              class="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-emerald-600 focus:ring-emerald-600" />
          </label>
          <fieldset>
            <legend class="text-sm font-semibold text-slate-800">Color</legend>
            <div class="mt-2.5 grid grid-cols-4 justify-items-center gap-2.5 sm:grid-cols-8 sm:gap-2">
              <label v-for="(swatch, color) in inboxLabelPalette" :key="color" :title="swatch.name" class="cursor-pointer">
                <input v-model="inboxLabelDraft.color" type="radio" name="whatsapp-label-color" :value="color" class="peer sr-only" />
                <span class="grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition-transform hover:scale-105 peer-checked:ring-2 peer-checked:ring-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700"
                  :class="swatch.style">
                  <CheckIcon v-if="inboxLabelDraft.color === color" class="h-4 w-4" aria-hidden="true" />
                  <span class="sr-only">{{ swatch.name }}</span>
                </span>
              </label>
            </div>
          </fieldset>
          <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span class="inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold" :class="inboxLabelPalette[inboxLabelDraft.color].style">
              <TagIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span class="truncate">{{ inboxLabelDraft.name.trim() || 'Vista previa' }}</span>
            </span>
            <span class="shrink-0 text-xs text-slate-600">{{ inboxLabelPalette[inboxLabelDraft.color].name }}</span>
          </div>
          <p v-if="inboxLabelEditorError" role="alert" class="text-sm font-medium text-rose-800">{{ inboxLabelEditorError }}</p>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" :disabled="savingInboxLabel" @click="showInboxLabelEditor = false">Cancelar</BaseButton>
            <BaseButton type="submit" :loading="savingInboxLabel" :disabled="!inboxLabelDraft.name.trim()">Guardar etiqueta</BaseButton>
          </div>
        </form>
      </BaseDialog>

      <BaseDialog v-model="showQuickRepliesModal" title="Respuestas rápidas" size="4xl">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="min-h-[260px] rounded-lg border border-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <span class="text-sm font-semibold text-gray-800">Guardadas</span>
              <BaseButton size="sm" variant="ghost" :loading="whatsappStore.isLoadingQuickReplies" @click="loadQuickReplies">
                Actualizar
              </BaseButton>
            </div>
            <div class="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              <div v-if="catalogQuickReplies.length" class="space-y-2 px-3 py-3">
                <h3 class="text-sm font-semibold text-gray-800">Catálogo</h3>
                <div v-for="group in catalogQuickReplies" :key="group.id" class="flex items-center gap-2">
                  <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">/{{ group.shortcut }}</span>
                  <span class="min-w-0 flex-1 text-sm text-gray-700">{{ group.name }}</span>
                  <BaseButton v-if="canSend" size="sm" variant="ghost" :disabled="sending || sendingProductChoices"
                    @click="sendCatalogQuickReply(group)">Enviar</BaseButton>
                </div>
              </div>
              <div
                v-for="reply in whatsappStore.quickReplies"
                :key="reply.id"
                class="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">/{{ reply.shortcut }}</span>
                    <span v-if="reply.branchName" class="text-xs text-gray-500">{{ reply.branchName }}</span>
                    <span class="text-xs" :class="reply.isActive ? 'text-emerald-700' : 'text-gray-400'">
                      {{ reply.isActive ? 'Activa' : 'Inactiva' }}
                    </span>
                    <span class="text-xs text-gray-400">{{ reply.usageCount }} usos</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-sm text-gray-700">{{ quickReplyDescription(reply) }}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <BaseButton size="sm" variant="ghost" @click="editQuickReply(reply)">Editar</BaseButton>
                  <BaseButton size="sm" variant="danger" @click="removeQuickReply(reply)">Eliminar</BaseButton>
                </div>
              </div>
              <div v-if="!loadingProductChoices && !whatsappStore.isLoadingQuickReplies && !catalogQuickReplies.length && !whatsappStore.quickReplies.length" class="p-6 text-center text-sm text-gray-500">
                No hay respuestas rápidas creadas.
              </div>
            </div>
          </div>

          <form class="space-y-3 rounded-lg border border-gray-200 p-3" @submit.prevent="saveQuickReply">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-800">{{ editingQuickReply ? 'Editar' : 'Nueva respuesta' }}</p>
              <BaseButton v-if="editingQuickReply" type="button" size="sm" variant="ghost" @click="resetQuickReplyForm">
                Nueva
              </BaseButton>
            </div>

            <label v-if="showBranchFilter" class="block text-sm font-medium text-gray-700">
              Sucursal
              <select
                v-model.number="quickReplyForm.branchId"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.label }}</option>
              </select>
            </label>

            <BaseInput
              v-model="quickReplyForm.shortcut"
              label="Palabra reservada"
              placeholder="/saludo"
              :maxlength="40"
              hint="Se usa escribiendo /palabra en el chat."
            />

            <label class="block text-sm font-medium text-gray-700">
              Al usar el atajo
              <select v-model="quickReplyForm.replyMode" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="send">Enviar directamente</option>
                <option value="draft">Editar antes de enviar</option>
                <option value="chicharron_quote">Cotizar con y sin chicharrón</option>
              </select>
            </label>
            <label v-if="quickReplyForm.replyMode !== 'chicharron_quote'" class="block text-sm font-medium text-gray-700">
              Mensaje
              <textarea
                v-model="quickReplyForm.messageTemplate"
                rows="6"
                maxlength="4096"
                class="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Hola {{nombre_cliente}}, muy buenos días."
              />
            </label>
            <p v-if="quickReplyForm.replyMode !== 'chicharron_quote'" class="text-xs text-gray-500">
              <span v-pre>Variables disponibles: <code>{{nombre_cliente}}</code>, <code>{{guestName}}</code>, <code>{{telefono}}</code>.</span>
            </p>

            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input v-model="quickReplyForm.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
              Activa
            </label>

            <p v-if="quickReplyError" class="text-sm text-red-600">{{ quickReplyError }}</p>
            <BaseButton class="w-full" type="submit" :loading="quickReplySaving">
              Guardar respuesta
            </BaseButton>
          </form>
        </div>
      </BaseDialog>

      <WhatsAppAiDiagnosticsDialog
        v-if="showAiDiagnosticsDialog"
        v-model="showAiDiagnosticsDialog"
        :diagnostics="currentAiDiagnostics"
        :loading="whatsappStore.aiDiagnosticsLoadingCount > 0"
        :error="whatsappStore.aiDiagnosticsError"
        :connection-state="connectionState"
        :connection-error="signalRError"
        @refresh="refreshAiDiagnostics(true)"
      />

      <Teleport to="body">
        <div
          v-if="imagePreview"
          class="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          @click="closeImagePreview"
        >
          <div class="flex items-center justify-end px-4 py-3">
            <button
              type="button"
              class="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              title="Cerrar"
              @click.stop="closeImagePreview"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
          <div class="grid min-h-0 flex-1 place-items-center px-4 pb-4" @click.stop>
            <img
              :src="imagePreview.mediaUrl || ''"
              :alt="imagePreview.mediaFileName || 'Imagen de WhatsApp'"
              class="max-h-[84vh] max-w-[96vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
          <p v-if="imagePreview.mediaFileName" class="px-4 pb-4 text-center text-sm font-medium text-white/80">
            {{ imagePreview.mediaFileName }}
          </p>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizableColumns } from '@/composables/useResizableColumns'
import { commercialGroup, commercialLabel, fixedInboxLabelStyles, inboxLabelColor, inboxLabelPalette } from '@/utils/whatsappInbox'

import WhatsAppOrderPanel from '@/components/whatsapp/WhatsAppOrderPanel.vue'
import WhatsAppMessageActions from '@/components/whatsapp/WhatsAppMessageActions.vue'
import type { WhatsAppCommercialDraft } from '@/types/whatsapp'

import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowUturnLeftIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  BackspaceIcon,
  CheckIcon,
  CpuChipIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  InformationCircleIcon,
  MapPinIcon,
  MoonIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TagIcon,
  UserCircleIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
const WhatsAppAiDiagnosticsDialog = defineAsyncComponent(() => import('@/components/whatsapp/WhatsAppAiDiagnosticsDialog.vue'))
import WhatsAppAiStatusStrip from '@/components/whatsapp/WhatsAppAiStatusStrip.vue'
import WhatsAppInboxTabs from '@/components/whatsapp/WhatsAppInboxTabs.vue'
import WhatsAppInboxLabelList from '@/components/whatsapp/WhatsAppInboxLabelList.vue'
import WhatsAppConversationTemplates from '@/components/whatsapp/WhatsAppConversationTemplates.vue'
import WhatsAppClosedDayReplies from '@/components/whatsapp/WhatsAppClosedDayReplies.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { useWhatsAppComposer } from '@/composables/useWhatsAppComposer'
import { useWhatsAppProductSuggestions } from '@/composables/useWhatsAppProductSuggestions'
import { useDebouncedCallback } from '@/composables/useDebouncedCallback'
import { formatMessageTime as formatTime } from '@/composables/useFormatting'
import type { WhatsAppAttentionAction, WhatsAppInboxKey } from '@/types/whatsapp'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { useSignalR } from '@/composables/useSignalR'
import { useNetworkActivityManager } from '@/composables/useNetworkActivityManager'
import { createWhatsAppRoutingRefresh } from '@/utils/whatsappRoutingRefresh'
import type { RefreshContext } from '@/utils/serialRefresh'
import { WHATSAPP_SIGNALR_HUB_URL } from '@/config/signalr'
import type {
  WhatsAppAiDiagnostics,
  WhatsAppAiProcessing,
  WhatsAppAiProcessingChangedPayload,
  WhatsAppAttentionChangedPayload,
  WhatsAppAttentionMode,
  WhatsAppConversation,
  WhatsAppConversationRoutingChangedPayload,
  WhatsAppMessage,
  WhatsAppInboxLabel,
  WhatsAppInboxLabelDefinition,
  WhatsAppInboxSummary,
  WhatsAppProductChoiceGroup,
  WhatsAppProductSuggestion,
  WhatsAppProductSuggestionState,
  WhatsAppQuickReply,
  WhatsAppQuickReplyMode,
  WhatsAppQuickReplyPresentation,
  WhatsAppRealtimeMessagePayload,
} from '@/types/whatsapp'
import {
  aiDiagnosticsTone,
  aiProcessingTone,
  aiToneClasses,
  aiValueLabel,
  sortAiProcessing,
} from '@/utils/whatsappAiDiagnostics'
import { matchesWhatsAppUsername } from '@/utils/whatsappIdentity'
import { buildWhatsAppInboxSections, canReadWhatsAppRouting, whatsappConversationBranchLabel } from '@/utils/whatsappInbox'

const whatsappStore = useWhatsAppStore()
const authStore = useAuthStore()
const workContext = useBranchContextStore()
const router = useRouter()
const route = useRoute()
const { success, error: showError } = useToast()
const { confirmDialog } = useDialog()
const {
  connectionState,
  error: signalRError,
  on: onSignalR,
  off: offSignalR,
} = useSignalR(WHATSAPP_SIGNALR_HUB_URL)
const { isPageVisible, isUserActive } = useNetworkActivityManager()
const loadingStatus = ref(true)
const statusLoadError = ref('')
const inboxError = ref('')
const selectedConversation = ref<WhatsAppConversation | null>(null)
const editorScope = computed(() => `${authStore.user?.id}:${authStore.user?.role}:${workContext.selectedBranchId ?? authStore.branchId}`)
const initialDraft = shallowRef<{ id: number; scope: string; request: Promise<WhatsAppCommercialDraft | null | undefined> } | null>(null)
const prefetchedDraft = computed(() => initialDraft.value?.id === selectedConversation.value?.id && initialDraft.value?.scope === editorScope.value ? initialDraft.value?.request : undefined)
const commercialPanel = ref<InstanceType<typeof WhatsAppOrderPanel> | null>(null)
const commercialControlsTarget = ref<HTMLElement | null>(null)
const commercialSaveTarget = ref<HTMLElement | null>(null)
const selectionRoute = useDebouncedCallback(() => {
  const id = selectedConversation.value?.id
  if (id) void router.replace({ query: { ...route.query, conversationId: String(id) } })
}, 250)
const selectedBranchId = ref(Number(route.query.whatsappBranch || 0))
const activeInbox = ref<WhatsAppInboxKey>(['free', 'mine', 'team', 'closed'].includes(String(route.query.inbox)) ? route.query.inbox as WhatsAppInboxKey : 'free')
const unroutedOnly = ref(route.query.unrouted === 'true')
const selectedLabel = ref(typeof route.query.label === 'string' ? route.query.label : '')
const inboxLabels = ref<WhatsAppInboxLabel[]>([])
const inboxCounts = shallowRef<WhatsAppInboxSummary | null>(null)
const inboxLabelsByKey = computed(() => new Map(inboxLabels.value.map(label => [label.key, label])))
const chatInboxLabels = computed(() => inboxLabels.value.filter(label =>
  label.custom || (label.editable && canEditInboxLabels.value) || selectedConversation.value?.labels?.includes(label.key)))
const customInboxLabels = computed(() => inboxLabels.value.filter(label => label.custom))
const changingInboxLabel = ref(false)
const savingInboxLabel = ref(false)
const showInboxLabelManager = ref(false)
const showInboxLabelEditor = ref(false)
const editingInboxLabelKey = ref('')
const inboxLabelDraft = ref<WhatsAppInboxLabelDefinition>({ name: '', color: 'violet' })
const inboxLabelEditorError = ref('')
let inboxLabelCatalogRequest = 0
const resettingTaken = ref(false)
const canEditInboxLabels = computed(() => {
  const chat = selectedConversation.value
  return !!chat && (authStore.isAdmin || authStore.isSuperadmin
    || (chat.attentionMode !== 'closed' && (!chat.assignedUserId || chat.assignedUserId === authStore.user?.id)))
})
const getInboxBranch = () => selectedBranchId.value || undefined
const canResetTaken = computed(() => authStore.isSuperadmin
  ? !!selectedBranchId.value !== unroutedOnly.value
  : !!authStore.user?.branchId && !unroutedOnly.value)
let countRequest = 0
const advisors = ref<{ id: number; name: string }[]>([])
const transferTarget = ref(0), confirmingTakeover = ref(false)
const confirmingClose = ref(false), finishingAttention = ref(false)
const clockNow = ref(Date.now())
const windowTimer = window.setInterval(() => { clockNow.value = Date.now() }, 30_000)
const search = ref('')
const unreadOnly = ref(false)
const { draft, selectedFile, clearSent } = useWhatsAppComposer(computed(() => selectedConversation.value?.id ?? null))
const messageInput = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sending = ref(false)
const replyTarget = ref<WhatsAppMessage | null>(null)
const reactionPickerId = ref<number | null>(null), messageActionId = ref<number | null>(null)
const sendingMenu = ref(false)
const changingAttention = ref(false)
const changingOperationalBranch = ref(false)
const resettingConversation = ref(false)
const contextPanelCollapsed = ref(false)
const mobilePane = ref<'inbox' | 'chat' | 'order'>('inbox')
const columnsContainer = ref<HTMLElement>()
const { leftWidth, rightWidth, resize, step } = useResizableColumns(columnsContainer)
const showQuickRepliesModal = ref(false)
const showClosedDayReplies = ref(false)
const showProductChoices = ref(false)
const loadingProductChoices = ref(false)
const sendingProductChoices = ref(false)
const productChoicesError = ref('')
const productChoiceGroupId = ref(0)
const productChoiceGroups = ref<WhatsAppProductChoiceGroup[]>([])
const savedQuickRepliesReady = ref(false)
const catalogQuickRepliesReady = ref(false)
const riceChoiceGroups = computed(() => productChoiceGroups.value.filter(group => group.isRice))
const additionChoiceGroups = computed(() => productChoiceGroups.value.filter(group => !group.isRice))
const catalogQuickRepliesByShortcut = computed(() => {
  const groups = new Map<string, WhatsAppProductChoiceGroup>()
  for (const group of productChoiceGroups.value) {
    if (group.shortcut && !groups.has(group.shortcut)) groups.set(group.shortcut, group)
  }
  return groups
})
const catalogQuickReplies = computed(() => [...catalogQuickRepliesByShortcut.value.values()])
let productChoicesRequest: { controller: AbortController; promise: Promise<void> } | undefined
const editingQuickReply = ref<WhatsAppQuickReply | null>(null)
const quickReplySaving = ref(false)
const quickReplyError = ref('')
type QuickReplyContext = { conversationId: number; session: string; text: string; file: File | null }
const quickReplyChoice = shallowRef<{ replyId: number; context: QuickReplyContext; presentations: WhatsAppQuickReplyPresentation[] }>()
const preparingQuickReply = ref(false)
const quickReplyPreviewError = ref('')
let quickReplyPreviewRevision = 0
const quoteFamily = ref('')
const quoteSize = ref('')
const quoteSizeNames: Record<string, string> = { personal: 'Personal', duo: 'Dúo', trio: 'Trío', familiar: 'Familiar', super: 'Súper' }
const quoteFamilies = computed(() => [...new Set(quickReplyChoice.value?.presentations.map(x => x.family))])
const quoteSizes = computed(() => Object.keys(quoteSizeNames).filter(size =>
  quickReplyChoice.value?.presentations.some(x => x.size === size && (!quoteFamily.value || x.family === quoteFamily.value))))
const quickReplyForm = ref({
  id: null as number | null,
  branchId: null as number | null,
  shortcut: '',
  messageTemplate: '',
  replyMode: 'send' as WhatsAppQuickReplyMode,
  isActive: true,
})
const sendError = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
const imagePreview = ref<WhatsAppMessage | null>(null)
const showAiDiagnosticsDialog = ref(false)
let searchTimeout: number | undefined
let aiDiagnosticsPollingId: number | undefined
let viewActive = true
const sessionKey = computed(() => JSON.stringify([
  authStore.user?.id, authStore.user?.role, authStore.user?.branchId, authStore.user?.accountType,
]))
const inboxScope = computed(() => JSON.stringify([
  sessionKey.value, selectedBranchId.value, search.value.trim(), unreadOnly.value, activeInbox.value, unroutedOnly.value, selectedLabel.value,
]))
const inboxFilterCount = computed(() => [selectedBranchId.value, unreadOnly.value, unroutedOnly.value, selectedLabel.value].filter(Boolean).length)

function resetInboxFilters() {
  const labelWasActive = !!selectedLabel.value
  selectedBranchId.value = 0
  unreadOnly.value = false
  unroutedOnly.value = false
  selectedLabel.value = ''
  if (!labelWasActive) void reloadConversations()
}

const inboxTools = computed(() => [
  { label: 'Limpiar Tomado', icon: BackspaceIcon, run: resetTakenLabels,
    disabled: !canResetTaken.value || resettingTaken.value,
    title: canResetTaken.value ? 'Quita las etiquetas de días anteriores en esta bandeja' : 'Selecciona una sucursal o la bandeja sin sede operativa' },
  { label: 'Gestionar etiquetas', icon: TagIcon, run: () => { showInboxLabelManager.value = true } },
  { label: 'Respuestas rápidas', icon: ChatBubbleLeftRightIcon, run: openQuickRepliesModal },
  { label: 'Responder por descanso', icon: MoonIcon, run: () => { showClosedDayReplies.value = true } },
  ...(diagnosticsBranchId.value ? [{ label: 'Estado de la IA', icon: CpuChipIcon, run: openAiDiagnostics,
    title: currentAiDiagnostics.value?.summary || whatsappStore.aiDiagnosticsError || 'Abrir actividad de la IA' }] : []),
])

const currentMessages = computed<WhatsAppMessage[]>(() =>
  selectedConversation.value ? (whatsappStore.messages[selectedConversation.value.id] ?? []) : []
)
const panelSuggestionState = shallowRef<WhatsAppProductSuggestionState | null>(null)
const currentSuggestionState = computed(() => panelSuggestionState.value?.conversationId === selectedConversation.value?.id
  ? panelSuggestionState.value : null)
function setProductSuggestionState(state: WhatsAppProductSuggestionState) {
  if (selectedConversation.value?.id !== state.conversationId) return
  const current = panelSuggestionState.value
  if (current?.conversationId === state.conversationId && current.branchId === state.branchId
    && current.version === state.version && current.canApply === state.canApply
    && current.applied.size === state.applied.size && [...state.applied].every(key => current.applied.has(key))) return
  panelSuggestionState.value = state
}
const { byMessage: productSuggestions, branchId: suggestionBranch, reload: reloadProductSuggestions } =
  useWhatsAppProductSuggestions(computed(() => selectedConversation.value?.id),
    computed(() => `${editorScope.value}:${selectedConversation.value?.operationalBranchId ?? ''}`),
    computed(() => currentSuggestionState.value?.version), currentMessages)
const visibleSuggestionBranch = computed(() => currentSuggestionState.value?.branchId ?? (
  selectedConversation.value?.isCentralChannel ? selectedConversation.value.operationalBranchId ?? 0 : selectedConversation.value?.branchId ?? 0))

function isSuggestionApplied(messageId: number, suggestion: WhatsAppProductSuggestion) {
  return currentSuggestionState.value?.applied.has(`${messageId}:${suggestion.productId}`) === true
}

async function addProductSuggestion(messageId: number, suggestion: WhatsAppProductSuggestion) {
  const id = selectedConversation.value?.id
  if (!id || suggestionBranch.value !== visibleSuggestionBranch.value) return
  await commercialPanel.value?.applyProductSuggestion(messageId, suggestion)
  if (selectedConversation.value?.id === id) await reloadProductSuggestions()
}

const diagnosticsBranchId = computed(() =>
  selectedConversation.value?.operationalBranchId
  || selectedConversation.value?.branchId
  || selectedBranchId.value
  || whatsappStore.enabledBranchIds[0]
  || 0,
)

const currentAiDiagnostics = computed<WhatsAppAiDiagnostics | null>(() => {
  const conversationId = selectedConversation.value?.id
  if (conversationId && whatsappStore.aiDiagnosticsByConversation[conversationId]) {
    return whatsappStore.aiDiagnosticsByConversation[conversationId]
  }

  const branchId = diagnosticsBranchId.value
  if (branchId && whatsappStore.aiDiagnosticsByBranch[branchId]) {
    return whatsappStore.aiDiagnosticsByBranch[branchId]
  }

  const diagnostics = Object.values(whatsappStore.aiDiagnosticsByBranch)
  const rank = { danger: 5, warning: 4, info: 3, neutral: 2, success: 1 }
  return [...diagnostics].sort((left, right) =>
    rank[aiDiagnosticsTone(right)] - rank[aiDiagnosticsTone(left)],
  )[0] ?? null
})

const chatIdentity = computed(() => {
  const conversation = selectedConversation.value
  if (!conversation) return ''
  const name = conversationTitle(conversation)
  const username = conversation.whatsAppUsername
  const phone = formatPhone(conversation.phoneNumber)
  return [username !== name ? username : '', conversation.phoneNumber !== name ? phone : ''].filter(Boolean).join(' · ')
})
const chatInfoText = computed(() => {
  const conversation = selectedConversation.value
  if (!conversation) return ''
  const line = conversation.senderLine || (conversation.isCentralChannel ? 'WhatsApp central' : conversation.branchName)
  const owner = conversation.assignedUserName || (conversation.assignedUserId ? `Asesor #${conversation.assignedUserId}` : 'Sin asignar')
  const branch = (conversation.isCentralChannel ? conversation.operationalBranchName : conversation.branchName) || 'Sin sede operativa'
  return `Línea · ${line || 'Sin línea'}\nResponsable · ${owner}\nAtención · ${branch}`
})
const chatAiDiagnostics = computed(() => {
  const id = selectedConversation.value?.id
  return id ? whatsappStore.aiDiagnosticsByConversation[id] : null
})
const chatAiActivities = computed(() => sortAiProcessing([
  ...(chatAiDiagnostics.value?.recentMessages ?? []),
  ...currentMessages.value.flatMap(message => message.aiProcessing ? [message.aiProcessing] : []),
]))
const latestAiProcessing = computed(() => chatAiActivities.value[0] ?? null)
const chatAiAnswered = computed(() => chatAiActivities.value.some(item => item.status === 'completed' || item.status === 'sent'))

const failureActivities = computed(() => sortAiProcessing(
  currentAiDiagnostics.value?.recentMessages.filter(isFailureActivity) ?? [],
))
const failureActivityCount = computed(() => failureActivities.value.length)
const latestFailureReason = computed(() =>
  selectedConversation.value?.attentionReason
  || failureActivities.value[0]?.technicalDetail
  || failureActivities.value[0]?.detail
  || '',
)

const aiStatusChipClasses = computed(() => {
  const classes = aiToneClasses[aiDiagnosticsTone(currentAiDiagnostics.value)]
  return `${classes.surface} ${classes.text}`
})

const aiStatusChipLabel = computed(() => {
  const diagnostics = currentAiDiagnostics.value
  if (!diagnostics && whatsappStore.aiDiagnosticsLoadingCount > 0) return 'Consultando IA...'
  if (!diagnostics && whatsappStore.aiDiagnosticsError) return 'Estado IA no disponible'
  if (!diagnostics) return 'Estado de la IA'
  if (!diagnostics.isActive) return 'IA inactiva'
  if (diagnostics.pendingCount > 0) return `IA procesando (${diagnostics.pendingCount})`
  return diagnostics.title || 'IA operativa'
})

const signalRStatusLabel = computed(() => ({
  connected: 'En vivo',
  connecting: 'Conectando',
  reconnecting: 'Reconectando',
  error: 'Actualización de respaldo',
  disconnected: 'Actualización de respaldo',
}[connectionState.value]))

const signalRStatusClasses = computed(() => connectionState.value === 'connected'
  ? 'bg-emerald-100 text-emerald-800'
  : connectionState.value === 'connecting' || connectionState.value === 'reconnecting'
    ? 'bg-amber-100 text-amber-900'
    : 'bg-red-100 text-red-800')

const signalRDotClass = computed(() => connectionState.value === 'connected'
  ? 'bg-emerald-500'
  : connectionState.value === 'connecting' || connectionState.value === 'reconnecting'
    ? 'animate-pulse bg-amber-500'
    : 'bg-red-500')

const ownsConversation = computed(() => selectedConversation.value?.attentionMode === 'human' && selectedConversation.value.assignedUserId === authStore.user?.id)
const serviceWindowOpen = computed(() => !!selectedConversation.value?.customerServiceWindowExpiresAt && Date.parse(selectedConversation.value.customerServiceWindowExpiresAt) > clockNow.value)
const canSend = computed(() => ownsConversation.value && serviceWindowOpen.value && !finishingAttention.value)
const canTakeAttention = computed(() => !!selectedConversation.value && selectedConversation.value.attentionMode !== 'closed' && !selectedConversation.value.assignedUserId)
const canReturnToAi = computed(() => ownsConversation.value)
const canPauseAi = computed(() => selectedConversation.value?.attentionMode === 'ai' && !selectedConversation.value.assignedUserId)
const canTakeOver = computed(() => selectedConversation.value?.attentionMode === 'human'
  && !!selectedConversation.value.assignedUserId && !ownsConversation.value)
const canResetTestContext = computed(() => authStore.isSuperadmin || authStore.isAdmin)
const canAssignOperationalBranch = computed(() => !!selectedConversation.value?.isCentralChannel && ownsConversation.value)
const inboxSections = computed(() => buildWhatsAppInboxSections(
  selectedLabel.value ? whatsappStore.conversations.filter(chat => chat.labels?.includes(selectedLabel.value)) : whatsappStore.conversations,
  authStore.user?.id,
  authStore.user?.branchId,
  authStore.isSuperadmin,
))
function attentionLabel(conversation: WhatsAppConversation) { if (conversation.attentionMode === 'human' && !conversation.assignedUserId) return 'Sin responsable'; const labels: Record<WhatsAppAttentionMode, string> = { ai: 'Atendida por IA', human: 'Atendida por una persona', waitingForHuman: 'Esperando asesor', paused: 'IA pausada', closed: 'Conversación cerrada' }; const label = labels[conversation.attentionMode] || labels.human; return conversation.attentionMode === 'human' && conversation.assignedUserName ? `${label}: ${conversation.assignedUserName}` : label }
function attentionBadgeClass(mode: WhatsAppAttentionMode) { return { ai: 'bg-violet-100 text-violet-700', human: 'bg-blue-100 text-blue-700', waitingForHuman: 'bg-amber-200 text-amber-900', paused: 'bg-gray-200 text-gray-700', closed: 'bg-red-100 text-red-700' }[mode] }
function attentionTooltip(conversation: WhatsAppConversation) {
  if (conversation.attentionMode !== 'waitingForHuman') return attentionLabel(conversation)
  return conversation.attentionReason
    ? `Esperando asesor porque la IA no pudo completar esta acción: ${conversation.attentionReason}`
    : 'Esperando asesor. Abre “Fallos IA” para consultar qué no pudo completar el agente.'
}
function normalizedAiValue(value?: string | null) { return String(value ?? '').replace(/[\s_-]+/g, '').toLowerCase() }
function isFailureActivity(processing: WhatsAppAiProcessing) {
  const status = normalizedAiValue(processing.status)
  return status === 'failed'
    || status === 'transferredtohuman'
    || (status === 'ignored' && normalizedAiValue(processing.severity) !== 'neutral')
    || processing.willRetry
}
function aiProcessingReason(processing: WhatsAppAiProcessing) {
  const reason = processing.technicalDetail || processing.detail
  return reason ? `${processing.title}: ${reason}` : processing.title
}
async function confirmTakeover() {
  const conversation = selectedConversation.value
  if (!conversation || !canTakeOver.value || changingAttention.value || confirmingTakeover.value) return
  const id = conversation.id
  const revision = conversation.attentionRevision ?? 0
  const responsible = conversation.assignedUserName || 'Otro asesor'
  confirmingTakeover.value = true
  try {
    const confirmed = await confirmDialog({
      title: 'Retomar conversación',
      message: `${responsible} está a cargo de este chat. Si continúas, quedarás a cargo y conservarás el pedido y los cambios guardados.`,
      confirmLabel: 'Retomar',
      tone: 'warning',
    })
    if (!confirmed || !viewActive || selectedConversation.value?.id !== id) return
    await changeAttention('takeover', revision)
  } finally { confirmingTakeover.value = false }
}

async function markConversationAttended() {
  const conversation = selectedConversation.value
  if (!conversation || !ownsConversation.value || changingAttention.value || confirmingClose.value) return
  const revision = conversation.attentionRevision ?? 0
  confirmingClose.value = true
  try {
    if (commercialPanel.value?.hasDraftProducts) {
      const confirmed = await confirmDialog({
        title: 'Marcar como atendida',
        message: 'Hay un borrador con productos. Se guardará en esta conversación para que puedas retomarlo.',
        confirmLabel: 'Cerrar atención',
        tone: 'warning',
      })
      if (!confirmed || !viewActive || selectedConversation.value?.id !== conversation.id) return
    }
    await changeAttention('close', revision)
  } finally { confirmingClose.value = false }
}

async function changeAttention(action: WhatsAppAttentionAction, confirmedVersion?: number) {
  const conversation = selectedConversation.value
  if (!conversation || changingAttention.value) return
  const conversationId = conversation.id
  const scope = sessionKey.value
  const leavingAttention = action === 'close' || action === 'release'
  try {
    changingAttention.value = true
    finishingAttention.value = leavingAttention
    if (leavingAttention) await commercialPanel.value?.saveBeforeFinishing()
    if (!viewActive || scope !== sessionKey.value || selectedConversation.value?.id !== conversationId) return
    await whatsappStore.changeAttention(conversationId, action, transferTarget.value || undefined,
      action === 'close' ? 'Atención finalizada desde el POS' : undefined, conversation, confirmedVersion)
    if (!viewActive || scope !== sessionKey.value) return
    if (leavingAttention) void refreshInboxTotals().catch(() => {})
    if (selectedConversation.value?.id !== conversationId) return
    const refreshed = whatsappStore.conversations.find(x => x.id === conversationId)
    if (refreshed && (refreshed.attentionRevision ?? 0) >= (selectedConversation.value.attentionRevision ?? 0))
      selectedConversation.value = refreshed
    if (leavingAttention) return
    const took = action === 'take' || action === 'takeover'
    activeInbox.value = took ? 'mine' : action === 'transfer' ? 'team' : 'free'
    if (took) {
      contextPanelCollapsed.value = false
      await nextTick()
      if (selectedConversation.value?.id === conversationId && canSend.value) messageInput.value?.focus()
    }
    await reloadConversations()
    await refreshAiDiagnostics()
  } catch (error: any) {
    if (!viewActive || scope !== sessionKey.value) return
    if (selectedConversation.value?.id === conversationId) {
      const refreshed = whatsappStore.conversations.find(x => x.id === conversationId)
      if (refreshed && (refreshed.attentionRevision ?? 0) >= (selectedConversation.value.attentionRevision ?? 0))
        selectedConversation.value = refreshed
      if (leavingAttention) inboxTotalsRefresh.schedule()
      else void reloadConversations()
    }
    showError('Atención', error.message || 'No se pudo cambiar el estado.')
  } finally {
    finishingAttention.value = false
    changingAttention.value = false
  }
}

function takeFromComposer(event: MouseEvent) {
  if (!canTakeAttention.value || changingAttention.value) return
  event.preventDefault()
  void changeAttention('take')
}

async function changeOperationalBranch(event: Event) {
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
async function resetConversationForTesting() {
  const conversation = selectedConversation.value
  if (!conversation) return
  const confirmed = await confirmDialog({
    title: 'Reiniciar conversación de prueba',
    message: 'Se borrarán todos los mensajes y el carrito/contexto de IA de esta conversación. El cliente y sus direcciones se conservarán. ¿Reiniciar la prueba?',
    confirmLabel: 'Reiniciar',
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    resettingConversation.value = true
    const reset = await whatsappStore.resetConversationForTesting(conversation.id)
    selectedConversation.value = reset
      ?? whatsappStore.conversations.find(x => x.id === conversation.id)
      ?? conversation
    draft.value = ''
    sendError.value = ''
    success('Prueba reiniciada', 3000, 'El próximo mensaje del cliente iniciará una conversación nueva para la IA.')
  } catch (error: any) {
    showError('Reiniciar prueba', error.message || 'No se pudo reiniciar la conversación.')
  } finally {
    resettingConversation.value = false
  }
}
function isUnassignedAttention(conversation: WhatsAppConversation) {
  return !conversation.assignedUserId
    && (conversation.attentionMode === 'closed' || conversation.attentionMode === 'waitingForHuman')
}

function isStaleAttention(conversation: WhatsAppConversation) {
  const row = whatsappStore.conversations.find(chat => chat.id === conversation.id)
  const selected = selectedConversation.value?.id === conversation.id ? selectedConversation.value : null
  return (conversation.attentionRevision ?? 0) < Math.max(row?.attentionRevision ?? 0, selected?.attentionRevision ?? 0)
}

function handleAttentionChanged(payload: WhatsAppAttentionChangedPayload, readMissingLabels = true) {
  if (!payload?.conversation?.id || isStaleAttention(payload.conversation)) return
  const conversation = payload.conversation
  const selected = selectedConversation.value?.id === conversation.id ? selectedConversation.value : null
  const unassigned = isUnassignedAttention(conversation)
  if (unassigned) {
    inboxTotalsRefresh.schedule()
    if (!selected && !whatsappStore.conversations.some(chat => chat.id === conversation.id)
      && !conversationMatchesCurrentFilters(conversation)) {
      const destination = conversation.attentionMode === 'closed' ? 'closed' : 'free'
      if (readMissingLabels && activeInbox.value === destination && selectedLabel.value && !conversation.labels
        && conversationMatchesCurrentFilters(conversation, '')) {
        const scope = inboxScope.value
        void whatsappApi.getConversation(conversation.id).then(({ data }) => {
          if (viewActive && scope === inboxScope.value && data && !isStaleAttention(data) && conversationMatchesCurrentFilters(data))
            whatsappStore.applyAttentionChanged(data)
        }).catch(() => {})
      }
      return
    }
  } else if (!(selected && finishingAttention.value)) scheduleInboxLabelsRefresh()
  whatsappStore.applyAttentionChanged(conversation)
  if (!selected) return
  selectedConversation.value = whatsappStore.conversations.find(x => x.id === conversation.id) ?? conversation
  if (!unassigned && !finishingAttention.value) void commercialPanel.value?.reconcile()
}

function handleConversationRoutingChanged(payload: WhatsAppConversationRoutingChangedPayload) {
  if (!payload?.conversation?.id) return
  if (payload.conversation.attentionMode && isStaleAttention(payload.conversation)) return
  if (isUnassignedAttention(payload.conversation)
    && (payload.previousOperationalBranchId ?? null) === (payload.conversation.operationalBranchId ?? null)) {
    handleAttentionChanged(payload, false)
    return
  }
  if (!payload.conversation.attentionMode) {
    if (canReadWhatsAppRouting(payload.conversation, payload.branchId, authStore.user?.id, authStore.user?.branchId, authStore.isSuperadmin)) {
      void reloadConversations()
      return
    }
    whatsappStore.forgetConversation(payload.conversation.id)
    if (selectedConversation.value?.id === payload.conversation.id) {
      selectedConversation.value = null
    }
  } else if (selectedConversation.value?.id === payload.conversation.id
      && (payload.conversation.attentionRevision ?? 0) >= (selectedConversation.value.attentionRevision ?? 0)) {
    whatsappStore.applyAttentionChanged(payload.conversation)
    selectedConversation.value = payload.conversation
    void commercialPanel.value?.reconcile()
  }
  void reloadConversations()
}

function handleAiProcessingChanged(payload: WhatsAppAiProcessingChangedPayload) {
  whatsappStore.applyAiProcessingChanged(payload)
  if (selectedConversation.value?.attentionMode === 'ai'
    && selectedConversation.value.id === payload.processing.conversationId
    && ['completed', 'transferredtohuman', 'failed'].includes(normalizedAiValue(payload.processing.status))) {
    void commercialPanel.value?.reconcile()
  }
}

async function refreshAiDiagnostics(showErrors = false) {
  if (!whatsappStore.enabled) return
  const selected = selectedConversation.value

  try {
    if (selected) {
      await whatsappStore.fetchAiDiagnostics(selected.operationalBranchId ?? selected.branchId, selected.id, 50)
      return
    }

    const branchIds = selectedBranchId.value
      ? [selectedBranchId.value]
      : [...new Set(whatsappStore.enabledBranchIds)]
    if (!branchIds.length) return

    const results = await Promise.allSettled(
      branchIds.map(branchId => whatsappStore.fetchAiDiagnostics(branchId, null, 50)),
    )
    const firstFailure = results.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined
    if (firstFailure && results.every(result => result.status === 'rejected')) throw firstFailure.reason
  } catch (error: any) {
    if (showErrors) showError('Estado de la IA', error.message || 'No se pudo actualizar el diagnóstico.')
  }
}

function openAiDiagnostics() {
  showAiDiagnosticsDialog.value = true
}

function startAiDiagnosticsPolling() {
  if (aiDiagnosticsPollingId) window.clearInterval(aiDiagnosticsPollingId)
  void refreshAiDiagnostics()
  aiDiagnosticsPollingId = window.setInterval(() => {
    if (!showAiDiagnosticsDialog.value || !isPageVisible.value || !isUserActive.value) return
    void refreshAiDiagnostics()
  }, 15000)
}

function stopAiDiagnosticsPolling() {
  if (!aiDiagnosticsPollingId) return
  window.clearInterval(aiDiagnosticsPollingId)
  aiDiagnosticsPollingId = undefined
}

async function retryWhatsAppStatus() {
  if (!viewActive) return
  const session = sessionKey.value
  loadingStatus.value = true
  statusLoadError.value = ''
  try {
    await whatsappStore.ensureStatus()
    if (!viewActive || session !== sessionKey.value) return
    if (whatsappStore.enabled) {
      void loadSavedQuickReplies().catch(() => {})
      void loadInboxLabels().catch(() => {})
      void loadProductChoiceGroups().catch(() => {})
      void whatsappStore.fetchOperationalBranches().catch(() => {})
      await reloadConversations()
    } else {
      stopAiDiagnosticsPolling()
    }
  } catch (error: any) {
    if (viewActive && session === sessionKey.value)
      statusLoadError.value = error.message || 'No se pudo consultar el estado de WhatsApp.'
  } finally {
    if (viewActive && session === sessionKey.value) loadingStatus.value = false
  }
}

function aiMessageStatusClasses(processing: WhatsAppAiProcessing) {
  return aiToneClasses[aiProcessingTone(processing)].badge
}

const showBranchFilter = computed(() => whatsappStore.enabledBranchIds.length > 1)

const branchOptions = computed(() => {
  const labels = new Map<number, string>()
  for (const conversation of whatsappStore.conversations) {
    if (conversation.branchName) labels.set(conversation.branchId, conversation.branchName)
  }
  return whatsappStore.enabledBranchIds.map(id => ({
    id,
    label: labels.get(id) ?? `Sucursal ${id}`,
  }))
})

const activeQuickRepliesForConversation = computed(() => {
  if (!selectedConversation.value) return []
  return whatsappStore.quickReplies
    .filter(reply => reply.isActive && reply.branchId === selectedConversation.value?.branchId
      && !catalogQuickRepliesByShortcut.value.has(reply.shortcut))
    .sort((a, b) => b.usageCount - a.usageCount || a.shortcut.localeCompare(b.shortcut))
})

const topQuickReplies = computed(() => activeQuickRepliesForConversation.value.slice(0, 6))

const filteredQuickReplies = computed(() => {
  const value = draft.value.trim()
  if (replyTarget.value || !value.startsWith('/') || /\s/.test(value) || selectedFile.value) return []
  const query = normalizeQuickReplyShortcut(value)
  const matches = [
    ...catalogQuickReplies.value.map(group => ({
      group, saved: null, key: `catalog-${group.id}`, shortcut: group.shortcut ?? '', preview: group.name,
    })),
    ...activeQuickRepliesForConversation.value.map(saved => ({
      saved, group: null, key: `saved-${saved.id}`, shortcut: saved.shortcut, preview: quickReplyDescription(saved),
    })),
  ].filter(reply => reply.group ? matchesCatalogQuickReply(reply.group, query) : reply.shortcut.includes(query))
  const exact = matches.find(reply => reply.saved && reply.shortcut === query)
  return exact ? [exact] : matches
})
const slashQuickReplyMatches = computed(() => filteredQuickReplies.value.slice(0, 12))
const uniqueQuickReply = computed(() => filteredQuickReplies.value.length === 1
  && normalizeQuickReplyShortcut(draft.value) && savedQuickRepliesReady.value && catalogQuickRepliesReady.value
  && !whatsappStore.isLoadingQuickReplies && !loadingProductChoices.value
  && canSend.value && !sending.value && !sendingProductChoices.value && !preparingQuickReply.value
  ? filteredQuickReplies.value[0] : undefined)

function chooseQuickReply(reply: (typeof filteredQuickReplies.value)[number]) {
  if (reply.group) return sendCatalogQuickReply(reply.group)
  if (reply.saved) return runSavedQuickReply(reply.saved)
}

function sendUniqueQuickReply(event: KeyboardEvent) {
  if (!uniqueQuickReply.value || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return
  event.preventDefault()
  if (!event.repeat) void chooseQuickReply(uniqueQuickReply.value)
}

function inboxLabelName(key: string) {
  return inboxLabelsByKey.value.get(key)?.name ?? fixedInboxLabelStyles[key]?.name
    ?? (key.startsWith('branch:') ? `Sucursal ${key.slice('branch:'.length)}` : key)
}

function inboxLabelClasses(key: string) {
  return [
    'rounded-md px-2 py-0.5 text-xs font-bold leading-4',
    inboxLabelColor(key, inboxLabelsByKey.value.get(key)?.color),
  ]
}

async function loadInboxLabels() {
  const request = ++inboxLabelCatalogRequest
  const scope = sessionKey.value
  const result = await whatsappApi.getInboxLabels()
  if (viewActive && scope === sessionKey.value && request === inboxLabelCatalogRequest) {
    inboxLabels.value = result.data ?? []
    if (selectedLabel.value.startsWith('custom:') && !inboxLabelsByKey.value.has(selectedLabel.value)) selectedLabel.value = ''
  }
}

function refreshInboxLabelCatalog() {
  if (!whatsappStore.enabled) return
  void loadInboxLabels().then(scheduleInboxLabelsRefresh).catch(() => {})
}

function closeDetailsMenu(event: KeyboardEvent) {
  const menu = event.currentTarget as HTMLDetailsElement
  if (!menu.open) return
  menu.open = false
  menu.querySelector('summary')?.focus()
}

function openInboxLabelEditor(label?: WhatsAppInboxLabel) {
  editingInboxLabelKey.value = label?.key ?? ''
  inboxLabelDraft.value = { name: label?.name ?? '', color: label?.color ?? 'violet' }
  inboxLabelEditorError.value = ''
  showInboxLabelEditor.value = true
}

async function saveInboxLabel() {
  if (savingInboxLabel.value || !inboxLabelDraft.value.name.trim()) return
  const scope = sessionKey.value
  const key = editingInboxLabelKey.value
  const definition = { ...inboxLabelDraft.value, name: inboxLabelDraft.value.name.trim() }
  savingInboxLabel.value = true
  inboxLabelEditorError.value = ''
  try {
    const response = key ? await whatsappApi.updateInboxLabel(key, definition) : await whatsappApi.createInboxLabel(definition)
    if (!viewActive || scope !== sessionKey.value) return
    if (response.data) {
      const label = response.data
      inboxLabels.value = [...inboxLabels.value.filter(item => item.key !== label.key), label]
    }
    showInboxLabelEditor.value = false
    refreshInboxLabelCatalog()
  } catch (error) {
    if (viewActive && scope === sessionKey.value)
      inboxLabelEditorError.value = error instanceof Error ? error.message : 'No se pudo guardar la etiqueta.'
  } finally {
    if (scope === sessionKey.value) savingInboxLabel.value = false
  }
}

async function removeInboxLabel(label: WhatsAppInboxLabel) {
  if (!label.custom || savingInboxLabel.value) return
  const scope = sessionKey.value
  const confirmed = await confirmDialog({
    title: 'Borrar etiqueta',
    message: `Se quitará «${label.name}» de todos los chats que la tienen.`,
    confirmLabel: 'Borrar etiqueta',
    tone: 'danger',
  })
  if (!confirmed || !viewActive || scope !== sessionKey.value || savingInboxLabel.value) return
  savingInboxLabel.value = true
  try {
    await whatsappApi.deleteInboxLabel(label.key)
    if (!viewActive || scope !== sessionKey.value) return
    inboxLabels.value = inboxLabels.value.filter(item => item.key !== label.key)
    for (const chat of whatsappStore.conversations) {
      if (chat.labels?.includes(label.key)) chat.labels = chat.labels.filter(key => key !== label.key)
    }
    const activeChat = selectedConversation.value
    if (activeChat?.labels?.includes(label.key)) activeChat.labels = activeChat.labels.filter(key => key !== label.key)
    if (selectedLabel.value === label.key) selectedLabel.value = ''
    refreshInboxLabelCatalog()
  } catch (error) {
    if (viewActive && scope === sessionKey.value)
      showError('Etiquetas', error instanceof Error ? error.message : 'No se pudo borrar la etiqueta.')
  } finally {
    if (scope === sessionKey.value) savingInboxLabel.value = false
  }
}

async function refreshInboxTotals(signal?: AbortSignal) {
  const request = ++countRequest
  const scope = sessionKey.value, branchId = getInboxBranch(), unrouted = unroutedOnly.value
  const result = await whatsappApi.getInboxSummary(branchId, unrouted, signal)
  if (viewActive && !signal?.aborted && request === countRequest && scope === sessionKey.value
    && branchId === getInboxBranch() && unrouted === unroutedOnly.value) inboxCounts.value = result.data ?? null
}

const inboxTotalsRefresh = useDebouncedCallback(() => {
  if (whatsappStore.enabled) void refreshInboxTotals().catch(() => {})
}, 350)
const inboxLabelsRefresh = useDebouncedCallback(() => {
  if (whatsappStore.enabled) void reloadConversations()
}, 350)

function scheduleInboxLabelsRefresh() {
  inboxTotalsRefresh.cancel()
  inboxLabelsRefresh.schedule()
}

async function setInboxLabel(key: string, event: Event) {
  const input = event.target as HTMLInputElement
  const chat = selectedConversation.value
  const scope = sessionKey.value
  if (!chat || !canEditInboxLabels.value || changingInboxLabel.value) return
  changingInboxLabel.value = true
  try {
    const result = await whatsappApi.setInboxLabel(chat.id, key, input.checked)
    if (!viewActive || scope !== sessionKey.value) return
    const labels = result.data ?? []
    const row = whatsappStore.conversations.find(item => item.id === chat.id)
    if (row) row.labels = labels
    if (selectedConversation.value?.id === chat.id) selectedConversation.value.labels = labels
    await reloadConversations()
  } catch (error) {
    if (!viewActive || scope !== sessionKey.value) return
    if (selectedConversation.value?.id === chat.id) input.checked = selectedConversation.value.labels?.includes(key) ?? false
    showError('Etiquetas', error instanceof Error ? error.message : 'No se pudo cambiar la etiqueta.')
  } finally { if (scope === sessionKey.value) changingInboxLabel.value = false }
}

async function resetTakenLabels() {
  if (!canResetTaken.value || resettingTaken.value) return
  resettingTaken.value = true
  try {
    await whatsappApi.resetTakenLabels(getInboxBranch(), unroutedOnly.value)
    await reloadConversations()
    success('Etiquetas Tomado de días anteriores retiradas', 2500)
  } catch (error) {
    showError('Limpiar Tomado', error instanceof Error ? error.message : 'No se pudo limpiar la etiqueta.')
  } finally { resettingTaken.value = false }
}

let conversationsGeneration = 0, conversationSelection = 0
async function readConversations(context: RefreshContext) {
  if (!viewActive || !whatsappStore.enabled) return
  const generation = ++conversationsGeneration
  const previousSelected = selectedConversation.value
  const initialSelection = !previousSelected && route.query.conversationId
    ? selectConversationFromRoute() : Promise.resolve()
  const results = await Promise.allSettled([whatsappStore.fetchConversations({
    branchId: selectedBranchId.value || undefined,
    search: search.value.trim() || undefined,
    unreadOnly: unreadOnly.value || undefined,
    inbox: activeInbox.value,
    unroutedOnly: unroutedOnly.value || undefined,
    label: selectedLabel.value || undefined,
  }, context.signal), whatsappStore.fetchUnreadSummary(), refreshInboxTotals(context.signal), initialSelection])
  if (!viewActive || !context.isCurrent() || generation !== conversationsGeneration) return
  if (previousSelected && selectedConversation.value?.id === previousSelected.id) {
    const refreshed = whatsappStore.conversations.find(c => c.id === previousSelected.id)
    if (refreshed) selectedConversation.value = refreshed
    else if (previousSelected.labels?.length || selectedLabel.value) {
      const detail = await whatsappApi.getConversation(previousSelected.id).catch(() => null)
      if (context.isCurrent() && generation === conversationsGeneration && selectedConversation.value?.id === previousSelected.id
        && detail?.data?.labels) selectedConversation.value.labels = detail.data.labels
    }
  }
  if (!selectionRoute.isPending()) await selectConversationFromRoute()
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason
  }
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
    if (viewActive && scope === inboxScope.value)
      inboxError.value = 'No se pudo actualizar la bandeja. Intenta nuevamente.'
    return false
  }
}

let realtimeFallbackId: number | undefined
let fallbackRunning = false

function stopRealtimeFallback() {
  if (!realtimeFallbackId) return
  window.clearInterval(realtimeFallbackId)
  realtimeFallbackId = undefined
}

async function reconcileWhatsApp() {
  const id = selectedConversation.value?.id
  await Promise.all([reloadConversations(), loadInboxLabels().catch(() => {})])
  if (id && selectedConversation.value?.id === id) await whatsappStore.fetchMessages(id)
  await commercialPanel.value?.reconcile()
}
function startRealtimeFallback() {
  if (!viewActive || realtimeFallbackId || connectionState.value === 'connected') return
  realtimeFallbackId = window.setInterval(async () => {
    if (!whatsappStore.enabled || !isPageVisible.value || !isUserActive.value || !navigator.onLine || fallbackRunning) return
    fallbackRunning = true
    try {
    const activeId = selectedConversation.value?.id
    await Promise.all([reloadConversations(), loadInboxLabels().catch(() => {})])
    if (viewActive && activeId && selectedConversation.value?.id === activeId) {
      await whatsappStore.fetchMessages(activeId)
      if (selectedConversation.value?.id === activeId) await commercialPanel.value?.reconcile()
    }
    } catch {} finally { fallbackRunning = false }
  }, 15_000)
}

async function loadMoreConversations() {
  try { await whatsappStore.fetchConversations(undefined, true) }
  catch (error: any) { showError('Conversaciones', error.message || 'No se pudo cargar la siguiente página.') }
}
async function selectConversation(conversation: WhatsAppConversation) {
  if (!viewActive) return
  mobilePane.value = 'chat'
  const selection = ++conversationSelection
  mobilePane.value = 'chat'
  whatsappStore.activateConversation(conversation.id)
  selectedConversation.value = conversation
  selectionRoute.cancel()
  if (route.query.conversationId !== String(conversation.id)) selectionRoute.schedule()
  await whatsappStore.fetchMessages(conversation.id, false, false, true).catch(() => {})
  inboxTotalsRefresh.schedule()
  if (selection === conversationSelection) await scrollToBottom()
}

async function selectConversationFromRoute() {
  const id = Number(route.query.conversationId || 0)
  const selection = conversationSelection
  if (!id || selectedConversation.value?.id === id) return
  let conversation = whatsappStore.conversations.find(c => c.id === id) ?? null
  if (!conversation) {
    try { conversation = await whatsappStore.fetchConversation(id) }
    catch { return }
    if (Number(route.query.conversationId) !== id || selection !== conversationSelection) return
  }
  if (conversation) activeInbox.value = conversation.attentionMode === 'closed' ? 'closed'
    : conversation.assignedUserId === authStore.user?.id ? 'mine' : conversation.assignedUserId ? 'team' : 'free'
  if (conversation) {
    await selectConversation(conversation)
  }
}

function conversationMatchesCurrentFilters(conversation: WhatsAppConversation, label = selectedLabel.value) {
  if (label && !conversation.labels?.includes(label)) return false
  if (unroutedOnly.value && (!conversation.isCentralChannel || conversation.operationalBranchId)) return false
  if (selectedBranchId.value && (conversation.isCentralChannel
    ? conversation.operationalBranchId !== selectedBranchId.value
    : conversation.branchId !== selectedBranchId.value)) return false
  if (unreadOnly.value && conversation.unreadCount <= 0) return false

  const term = search.value.trim().toLowerCase()
  if (!term) return true
  if (matchesWhatsAppUsername(conversation.whatsAppUsername, term)) return true

  return [
    conversation.phoneNumber,
    conversation.whatsAppUsername,
    conversation.contactName,
    conversation.customerName,
    conversation.branchName,
  ].some(value => (value || '').toLowerCase().includes(term))
}

async function handleRealtimeMessage(payload: WhatsAppRealtimeMessagePayload) {
  if (!payload?.conversation?.id || !payload?.message?.id) return
  if (payload.message.isUpdate) {
    whatsappStore.applyRealtimeMessage(payload)
    if (payload.message.hiddenSource && replyTarget.value?.id === payload.message.id) replyTarget.value = null
    return
  }
  inboxTotalsRefresh.schedule()

  const activeConversationId = selectedConversation.value?.id ?? null
  const isActiveConversation = activeConversationId === payload.conversation.id
  if (!isActiveConversation && !conversationMatchesCurrentFilters(payload.conversation)) return

  whatsappStore.applyRealtimeMessage(payload, activeConversationId)

  if (!isActiveConversation) return

  const refreshed = whatsappStore.conversations.find(c => c.id === payload.conversation.id)
  if (refreshed) {
    selectedConversation.value = refreshed
  }
  if (payload.message.draftAddressApplied || payload.message.draftProductApplied) await commercialPanel.value?.reconcile()

}

function normalizeQuickReplyShortcut(value: string) {
  return value.trim().replace(/^\/+/, '').trim().toLowerCase()
}

function matchesCatalogQuickReply(group: WhatsAppProductChoiceGroup, query: string) {
  const compact = (value: string) => value.normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '')
  const term = compact(query)
  return !!group.shortcut?.includes(query) || (!!term && compact(group.name).includes(term))
}

function findQuickReplyCommand(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || /\s/.test(trimmed)) return null
  const shortcut = normalizeQuickReplyShortcut(trimmed)
  return activeQuickRepliesForConversation.value.find(reply => reply.shortcut === shortcut) ?? null
}

function quickReplyMode(reply: WhatsAppQuickReply): WhatsAppQuickReplyMode {
  return reply.replyMode ?? 'send'
}

function quickReplyDescription(reply: WhatsAppQuickReply) {
  return quickReplyMode(reply) === 'chicharron_quote' ? 'Prepara los precios con y sin chicharrón' : reply.messageTemplate
}

function runSavedQuickReply(reply: WhatsAppQuickReply) {
  if (!canSend.value || sending.value || sendingProductChoices.value || preparingQuickReply.value || !selectedConversation.value) return
  if (quickReplyMode(reply) === 'send') return sendQuickReply(reply)
  return prepareQuickReply(reply.id, {
    conversationId: selectedConversation.value.id, session: sessionKey.value, text: draft.value, file: selectedFile.value,
  })
}

function clearQuickReplyPreview() {
  quickReplyPreviewRevision++
  quickReplyChoice.value = undefined
  preparingQuickReply.value = false
  quickReplyPreviewError.value = ''
}

function updateQuoteSize() {
  if (!quoteSizes.value.includes(quoteSize.value)) quoteSize.value = ''
}

function confirmQuickReplyChoice() {
  const choice = quickReplyChoice.value
  if (!choice || !quoteFamily.value || !quoteSizes.value.includes(quoteSize.value) || preparingQuickReply.value) return
  void prepareQuickReply(choice.replyId, choice.context, { family: quoteFamily.value, size: quoteSize.value })
}

async function prepareQuickReply(replyId: number, context: QuickReplyContext, presentation?: WhatsAppQuickReplyPresentation) {
  const revision = ++quickReplyPreviewRevision
  const current = () => viewActive && revision === quickReplyPreviewRevision && selectedConversation.value?.id === context.conversationId
    && sessionKey.value === context.session && canSend.value && draft.value === context.text && selectedFile.value === context.file
  if (!current()) { clearQuickReplyPreview(); return }
  preparingQuickReply.value = true
  quickReplyPreviewError.value = ''
  sendError.value = ''
  try {
    const { data } = await whatsappApi.previewQuickReply(context.conversationId, replyId, presentation)
    if (!current()) return
    if (data?.text) {
      const previous = context.text.trimEnd()
      const next = previous.trim() && !/^\/\S*$/.test(previous.trim()) ? `${previous}\n\n${data.text}` : data.text
      if (next.length > 4096) throw new Error('Reduce el texto actual para agregar la respuesta rápida.')
      clearQuickReplyPreview()
      draft.value = next
      await nextTick()
      if (selectedConversation.value?.id === context.conversationId && canSend.value) messageInput.value?.focus()
    } else if (data?.presentations?.length) {
      quickReplyChoice.value = { replyId, context, presentations: data.presentations }
      quoteFamily.value = data.family ?? ''
      quoteSize.value = data.size ?? ''
    } else {
      throw new Error('No se pudo preparar la respuesta rápida.')
    }
  } catch (error) {
    if (!current()) return
    const message = error instanceof Error ? error.message : 'No se pudo preparar la respuesta rápida.'
    if (quickReplyChoice.value) quickReplyPreviewError.value = message
    else sendError.value = message
  } finally {
    if (revision === quickReplyPreviewRevision) preparingQuickReply.value = false
  }
}

async function sendQuickReply(reply: WhatsAppQuickReply) {
  if (!canSend.value || sending.value || sendingProductChoices.value) return
  if (!selectedConversation.value) return
  try {
    sending.value = true
    sendError.value = ''
    const conversationId = selectedConversation.value.id, text = draft.value.trim(), file = selectedFile.value
    await whatsappStore.sendQuickReply(conversationId, reply.id)
    clearSent(conversationId, text, file)
    if (selectedConversation.value?.id === conversationId) await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar la respuesta rápida.'
  } finally {
    sending.value = false
  }
}

function defaultQuickReplyBranchId() {
  return selectedConversation.value?.branchId
    || selectedBranchId.value
    || whatsappStore.enabledBranchIds[0]
    || null
}

async function loadQuickReplies() {
  await Promise.all([loadSavedQuickReplies(), loadProductChoiceGroups()])
}

async function loadSavedQuickReplies() {
  const scope = sessionKey.value
  savedQuickRepliesReady.value = false
  await whatsappStore.fetchQuickReplies()
  if (viewActive && scope === sessionKey.value) savedQuickRepliesReady.value = true
}

function resetQuickReplyForm() {
  editingQuickReply.value = null
  quickReplyError.value = ''
  quickReplyForm.value = {
    id: null,
    branchId: defaultQuickReplyBranchId(),
    shortcut: '',
    messageTemplate: '',
    replyMode: 'send',
    isActive: true,
  }
}

async function openQuickRepliesModal() {
  resetQuickReplyForm()
  showQuickRepliesModal.value = true
  try {
    await loadQuickReplies()
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudieron cargar las respuestas rápidas.'
  }
}

function editQuickReply(reply: WhatsAppQuickReply) {
  editingQuickReply.value = reply
  quickReplyError.value = ''
  quickReplyForm.value = {
    id: reply.id,
    branchId: reply.branchId,
    shortcut: reply.shortcut,
    messageTemplate: reply.messageTemplate,
    replyMode: quickReplyMode(reply),
    isActive: reply.isActive,
  }
}

async function saveQuickReply() {
  try {
    quickReplySaving.value = true
    quickReplyError.value = ''
    await whatsappStore.saveQuickReply({
      ...quickReplyForm.value,
      shortcut: normalizeQuickReplyShortcut(quickReplyForm.value.shortcut),
    })
    resetQuickReplyForm()
    success('Respuesta guardada', 2200)
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudo guardar la respuesta rápida.'
  } finally {
    quickReplySaving.value = false
  }
}

async function removeQuickReply(reply: WhatsAppQuickReply) {
  if (!(await confirmDialog({
    title: 'Eliminar respuesta rápida',
    message: `¿Eliminar /${reply.shortcut}?`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  }))) return
  try {
    await whatsappStore.deleteQuickReply(reply.id)
    if (editingQuickReply.value?.id === reply.id) resetQuickReplyForm()
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudo eliminar la respuesta rápida.'
  }
}

async function draftOrderMessage(conversationId: number, text: string) {
  if (selectedConversation.value?.id !== conversationId || !ownsConversation.value) return
  mobilePane.value = 'chat'
  const existing = draft.value.trimEnd()
  if (!existing.endsWith(text)) {
    const next = existing.trim() ? `${existing}\n\n${text}` : text
    if (next.length > 4096) {
      sendError.value = 'Reduce el texto actual para agregar el mensaje del pedido.'
      return
    }
    draft.value = next
  }
  sendError.value = ''
  await nextTick()
  if (selectedConversation.value?.id === conversationId) messageInput.value?.focus()
}

async function addressesSent(conversationId: number, messages: WhatsAppMessage[]) {
  await choiceMessagesSent(conversationId, messages, 'Opciones de dirección enviadas')
}

async function choiceMessagesSent(conversationId: number, messages: WhatsAppMessage[], notice: string) {
  whatsappStore.applySentMessages(conversationId, messages)
  if (selectedConversation.value?.id !== conversationId) return
  success(notice, 2500)
  await scrollToBottom()
}

function loadProductChoiceGroups() {
  if (productChoicesRequest) return productChoicesRequest.promise
  const controller = new AbortController()
  loadingProductChoices.value = true
  const promise = whatsappApi.getCommercialProductGroups(controller.signal).then(response => {
    if (!controller.signal.aborted) {
      productChoiceGroups.value = response.data ?? []
      catalogQuickRepliesReady.value = true
    }
  }).finally(() => {
    if (productChoicesRequest?.controller === controller) {
      productChoicesRequest = undefined
      loadingProductChoices.value = false
    }
  })
  productChoicesRequest = { controller, promise }
  return promise
}

async function openProductChoices() {
  if (!selectedConversation.value || !canSend.value || sendingProductChoices.value) return
  productChoiceGroupId.value = 0
  productChoicesError.value = ''
  showProductChoices.value = true
  try {
    await loadProductChoiceGroups()
  } catch (error) {
    if (showProductChoices.value) productChoicesError.value = error instanceof Error ? error.message : 'No se pudo cargar el catálogo.'
  }
}

function sendCatalogQuickReply(group: WhatsAppProductChoiceGroup) {
  showQuickRepliesModal.value = false
  return sendProductOptions(group.id, group)
}

async function sendProductOptions(groupId: number, group?: WhatsAppProductChoiceGroup) {
  const conversationId = selectedConversation.value?.id
  const panel = commercialPanel.value
  if (!conversationId || !panel || !canSend.value || sending.value || sendingProductChoices.value || !groupId) return
  sendingProductChoices.value = true
  productChoicesError.value = ''
  sendError.value = ''
  const text = draft.value.trim()
  try {
    const messages = await panel.sendProductChoices(groupId)
    if (group && text.startsWith('/') && !/\s/.test(text) && !selectedFile.value
      && matchesCatalogQuickReply(group, normalizeQuickReplyShortcut(text))) clearSent(conversationId, text, null)
    if (selectedConversation.value?.id === conversationId) showProductChoices.value = false
    await choiceMessagesSent(conversationId, messages, 'Opciones de producto enviadas')
  } catch (error) {
    if (selectedConversation.value?.id === conversationId) {
      const failure = error instanceof Error ? error.message : 'No se pudieron enviar las presentaciones.'
      if (showProductChoices.value) productChoicesError.value = failure
      else sendError.value = failure
    }
  } finally {
    sendingProductChoices.value = false
  }
}

function quotedMessage(message: WhatsAppMessage) {
  return currentMessages.value.find(item => item.whatsAppMessageId === message.replyToWhatsAppMessageId)
}

function focusQuotedMessage(message: WhatsAppMessage) {
  const quoted = quotedMessage(message)
  if (quoted) messagesContainer.value?.querySelector(`[data-message-id="${quoted.id}"]`)?.scrollIntoView({ block: 'center' })
}

function messageSummary(message?: WhatsAppMessage | null) {
  if (!message) return 'Mensaje anterior'
  if (message.hiddenSource) return 'Mensaje oculto'
  return message.location?.name || message.contacts?.[0]?.name || message.textBody.trim()
    || message.mediaFileName || mediaFallbackLabel(message)
}

function mapLink(location: NonNullable<WhatsAppMessage['location']>) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`
}

function startMessageReply(message: WhatsAppMessage) {
  if (!canSend.value || !message.whatsAppMessageId || message.hiddenSource || selectedConversation.value?.id !== message.conversationId) return
  replyTarget.value = message
  reactionPickerId.value = null
  void nextTick(() => messageInput.value?.focus())
}

async function reactToMessage(message: WhatsAppMessage, emoji: string) {
  if (!canSend.value || messageActionId.value !== null || selectedConversation.value?.id !== message.conversationId) return
  messageActionId.value = message.id
  try {
    const result = await whatsappApi.reactToMessage(message.conversationId, message.id, emoji)
    if (result.data) whatsappStore.applyMessageUpdate(result.data)
    if (reactionPickerId.value === message.id) reactionPickerId.value = null
  } catch (cause) {
    showError('Reacción', cause instanceof Error ? cause.message : 'No se pudo enviar la reacción.')
  } finally { messageActionId.value = null }
}

async function hideMessage(message: WhatsAppMessage) {
  if (!ownsConversation.value || messageActionId.value !== null || selectedConversation.value?.id !== message.conversationId) return
  messageActionId.value = message.id
  try {
    const confirmed = await confirmDialog({
      title: 'Ocultar en el POS',
      message: 'El contenido quedará oculto para el equipo en esta conversación de POS.',
      confirmLabel: 'Ocultar mensaje',
      tone: 'warning',
    })
    if (!confirmed || !viewActive || !ownsConversation.value || selectedConversation.value?.id !== message.conversationId) return
    const result = await whatsappApi.hideMessage(message.conversationId, message.id)
    if (result.data) whatsappStore.applyMessageUpdate(result.data)
    if (replyTarget.value?.id === message.id) replyTarget.value = null
    if (reactionPickerId.value === message.id) reactionPickerId.value = null
  } catch (cause) {
    showError('Ocultar mensaje', cause instanceof Error ? cause.message : 'No se pudo ocultar el mensaje.')
  } finally { messageActionId.value = null }
}

async function sendMessage() {
  if (!canSend.value || sending.value || sendingProductChoices.value || preparingQuickReply.value) return
  if (!selectedConversation.value || (!draft.value.trim() && !selectedFile.value)) return
  const textToSend = draft.value.trim()
  if (!replyTarget.value && !selectedFile.value && textToSend.startsWith('/') && !/\s/.test(textToSend)) {
    const conversationId = selectedConversation.value.id
    await productChoicesRequest?.promise.catch(() => {})
    if (selectedConversation.value?.id !== conversationId || draft.value.trim() !== textToSend || !canSend.value) return
    const shortcut = normalizeQuickReplyShortcut(textToSend)
    const quickReply = findQuickReplyCommand(textToSend)
    if (quickReply) {
      await runSavedQuickReply(quickReply)
      return
    }
    const group = catalogQuickRepliesByShortcut.value.get(shortcut)
    if (group) {
      await sendCatalogQuickReply(group)
      return
    }
    if (shortcut === 'conchi' || filteredQuickReplies.value.length) {
      sendError.value = 'Elige una respuesta rápida antes de continuar.'
      return
    }
  }

  try {
    sending.value = true
    sendError.value = ''
    const text = draft.value.trim(), conversationId = selectedConversation.value.id, file = selectedFile.value
    const target = replyTarget.value
    const replyId = target?.conversationId === conversationId ? target.id : undefined
    if (file) await whatsappStore.sendMediaMessage(conversationId, file, text, replyId)
    else await whatsappStore.sendMessage(conversationId, text, replyId)
    if (replyTarget.value === target) replyTarget.value = null
    clearSent(conversationId, text, file)
    await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar el mensaje.'
  } finally {
    sending.value = false
  }
}

async function sendMenu() {
  if (!canSend.value) return
  if (!selectedConversation.value) return
  try {
    sendingMenu.value = true
    sendError.value = ''
    await whatsappStore.sendMenu(selectedConversation.value.id)
    success('Carta enviada', 3000, 'El cliente recibió el acceso a la carta.')
    await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar la carta.'
    showError('Carta', sendError.value)
  } finally {
    sendingMenu.value = false
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function clearSelectedFile() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function openImagePreview(message: WhatsAppMessage) {
  if (!message.mediaUrl) return
  imagePreview.value = message
}

function closeImagePreview() {
  imagePreview.value = null
}

function onSearchInput() {
  window.clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    void reloadConversations()
  }, 350)
}

function commercialChanged(draft: WhatsAppCommercialDraft) {
  const patch = { commercialStatus: draft.commercialStatus, commercialOrderId: draft.orderId }
  const conversation = whatsappStore.conversations.find(conversation => conversation.id === draft.conversationId)
  if (conversation) Object.assign(conversation, patch)
  if (selectedConversation.value?.id === draft.conversationId) Object.assign(selectedConversation.value, patch)
}

const newMessageCount = ref(0), atMessageBottom = ref(true)
let messageScrollTop = 0
function trackMessageScroll() {
  const container = messagesContainer.value
  if (!container?.clientHeight) return
  messageScrollTop = container.scrollTop
  atMessageBottom.value = container.scrollHeight - container.scrollTop - container.clientHeight < 80
  if (atMessageBottom.value) newMessageCount.value = 0
}
watch(() => {
  const latest = currentMessages.value[currentMessages.value.length - 1]
  return [selectedConversation.value?.id, latest?.id, latest?.timestamp] as const
}, async (current, previous) => {
  if (current[0] !== previous?.[0]) { newMessageCount.value = 0; messageScrollTop = 0; atMessageBottom.value = true; return }
  if (!previous?.[1] || current[1] === previous[1]) return
  if (current[2] && previous[2] && (Date.parse(current[2]) < Date.parse(previous[2])
    || current[2] === previous[2] && current[1]! < previous[1])) return
  if (atMessageBottom.value) await scrollToBottom()
  else newMessageCount.value++
})
async function scrollToBottom() {
  newMessageCount.value = 0
  atMessageBottom.value = true
  const id = selectedConversation.value?.id
  await nextTick()
  if (selectedConversation.value?.id === id && messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}
const messagesContainer = ref<HTMLElement>()
const messageResizeObserver = new ResizeObserver(() => {
  const container = messagesContainer.value
  if (!container?.clientHeight) return
  container.scrollTop = atMessageBottom.value ? container.scrollHeight : messageScrollTop
})
watch(messagesContainer, container => {
  messageResizeObserver.disconnect()
  if (container) messageResizeObserver.observe(container)
}, { flush: 'post' })
onBeforeUnmount(() => messageResizeObserver.disconnect())
async function showRecentMessages() {
  const id = selectedConversation.value?.id
  if (!id) return
  try {
    if (whatsappStore.messageHistory[id]?.hasMoreRecent) await whatsappStore.fetchMessages(id, false, true)
    if (selectedConversation.value?.id === id) await scrollToBottom()
  } catch (error: any) { showError('Mensajes', error.message || 'No se pudieron cargar los mensajes recientes.') }
}
async function loadOlderMessages() {
  const id = selectedConversation.value?.id, container = messagesContainer.value
  if (!id || !container) return
  const height = container.scrollHeight, top = container.scrollTop
  const visibleTop = container.getBoundingClientRect().top
  const anchor = [...container.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.getBoundingClientRect().bottom >= visibleTop)
  const anchorId = anchor?.dataset.messageId, anchorTop = anchor?.getBoundingClientRect().top
  try {
    await whatsappStore.fetchMessages(id, true)
    await nextTick()
    if (selectedConversation.value?.id === id && container === messagesContainer.value) {
      const restored = anchorId ? container.querySelector<HTMLElement>(`[data-message-id="${anchorId}"]`) : null
      container.scrollTop = restored && anchorTop != null
        ? top + restored.getBoundingClientRect().top - anchorTop
        : top + container.scrollHeight - height
    }
  } catch (error: any) {
    if (selectedConversation.value?.id === id) showError('Mensajes', error.message || 'No se pudo cargar el historial.')
  }
}

function conversationTitle(conversation: WhatsAppConversation) {
  return conversation.contactName || conversation.customerName || conversation.whatsAppUsername || conversation.phoneNumber || 'Usuario de WhatsApp'
}

function formatPhone(phone?: string | null) {
  if (!phone) return ''
  if (phone.startsWith('57') && phone.length === 12) return `+57 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`
  return phone.startsWith('+') ? phone : `+${phone}`
}

function conversationIdentityLabel(conversation: WhatsAppConversation) {
  return conversation.whatsAppUsername || formatPhone(conversation.phoneNumber) || 'Identidad de WhatsApp'
}

function shortConversationPreview(value?: string | null) {
  const text = (value || 'Sin mensajes').replace(/\s+/g, ' ').trim()
  if (text.length <= 30) return text
  return `${text.slice(0, 30).trimEnd()}.....`
}

function formatRelativeConversationTime(value?: string | null) {
  if (!value) return ''
  const date = parseUtcDate(value)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp)) return ''

  const now = new Date()
  const diffMs = now.getTime() - timestamp
  if (diffMs < 60_000) return 'ahora'

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'ayer'
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `hace ${diffDays} dias`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return 'hace un mes'
  if (diffMonths < 12) return `hace ${diffMonths} meses`

  const diffYears = Math.floor(diffMonths / 12)
  return diffYears <= 1 ? 'hace un ano' : `hace ${diffYears} anos`
}

function parseUtcDate(value: string) {
  // Older API versions omitted the UTC designator for PostgreSQL timestamps.
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`)
}

function statusLabel(status: WhatsAppMessage['status']) {
  const labels: Record<WhatsAppMessage['status'], string> = {
    received: 'Recibido',
    sent: 'Enviado',
    delivered: 'Entregado',
    read: 'Leído',
    failed: 'Falló',
  }
  return labels[status] ?? status
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`
}

function mediaFallbackLabel(message: WhatsAppMessage) {
  const labels: Record<WhatsAppMessage['type'], string> = {
    text: '',
    image: 'Imagen sin vista previa',
    audio: 'Audio sin vista previa',
    video: 'Video sin vista previa',
    document: message.mediaFileName || 'Documento sin vista previa',
    sticker: 'Sticker sin vista previa',
    location: 'Ubicación compartida',
    contacts: 'Contacto compartido',
  }
  return labels[message.type] || 'Archivo sin vista previa'
}

onMounted(async () => {
  const id = Number(route.query.conversationId)
  if (Number.isInteger(id) && id > 0) initialDraft.value = { id, scope: editorScope.value,
    request: whatsappApi.getCommercialDraft(id).then(response => response.data ?? null).catch(() => undefined) }
  onSignalR('WhatsAppMessageCreated', handleRealtimeMessage)
  onSignalR('WhatsAppAttentionChanged', handleAttentionChanged)
  onSignalR('WhatsAppConversationRoutingChanged', handleConversationRoutingChanged)
  onSignalR('WhatsAppInboxChanged', scheduleInboxLabelsRefresh)
  onSignalR('WhatsAppInboxLabelCatalogChanged', refreshInboxLabelCatalog)
  onSignalR('WhatsAppAiProcessingChanged', handleAiProcessingChanged)
  await retryWhatsAppStatus()
  startRealtimeFallback()
})

onBeforeUnmount(() => {
  viewActive = false
  productChoicesRequest?.controller.abort()
  routingRefresh.dispose()
  inboxTotalsRefresh.cancel()
  inboxLabelsRefresh.cancel()
  window.clearInterval(windowTimer)
  conversationsGeneration++; conversationSelection++
  offSignalR('WhatsAppMessageCreated', handleRealtimeMessage)
  offSignalR('WhatsAppAttentionChanged', handleAttentionChanged)
  offSignalR('WhatsAppConversationRoutingChanged', handleConversationRoutingChanged)
  offSignalR('WhatsAppInboxChanged', scheduleInboxLabelsRefresh)
  offSignalR('WhatsAppInboxLabelCatalogChanged', refreshInboxLabelCatalog)
  offSignalR('WhatsAppAiProcessingChanged', handleAiProcessingChanged)
  stopAiDiagnosticsPolling()
  stopRealtimeFallback()
  if (searchTimeout) window.clearTimeout(searchTimeout)
})

watch(inboxScope, () => {
  routingRefresh.cancel()
  conversationsGeneration++
  inboxError.value = ''
}, { flush: 'sync' })

watch(sessionKey, () => {
  clearQuickReplyPreview()
  showClosedDayReplies.value = false
  showQuickRepliesModal.value = false
  showInboxLabelManager.value = false
  showInboxLabelEditor.value = false
  savingInboxLabel.value = false
  changingInboxLabel.value = false
  inboxTotalsRefresh.cancel()
  inboxLabelsRefresh.cancel()
  inboxCounts.value = null
  inboxLabels.value = []
  productChoicesRequest?.controller.abort()
  productChoicesRequest = undefined
  loadingProductChoices.value = false
  productChoiceGroups.value = []
  catalogQuickRepliesReady.value = false
  savedQuickRepliesReady.value = false
  selectedConversation.value = null
  draft.value = ''
  clearSelectedFile()
  changingOperationalBranch.value = false
  if (viewActive && authStore.user) void retryWhatsAppStatus()
}, { flush: 'sync' })

watch(
  () => route.query.conversationId,
  () => {
    selectionRoute.cancel()
    void selectConversationFromRoute()
  }
)

watch(
  () => [selectedConversation.value?.id ?? 0, selectedBranchId.value],
  () => {
    if (whatsappStore.enabled && showAiDiagnosticsDialog.value) void refreshAiDiagnostics()
  },
)

watch(showAiDiagnosticsDialog, (open) => {
  if (open && whatsappStore.enabled) startAiDiagnosticsPolling()
  else stopAiDiagnosticsPolling()
})

watch(connectionState, (current, previous) => {
  if (current === 'connected') {
    stopRealtimeFallback()
    if (previous !== 'connected' && whatsappStore.enabled) void reconcileWhatsApp()
  }
  else startRealtimeFallback()
  if (current === 'connected'
    && previous !== 'connected'
    && whatsappStore.enabled
    && showAiDiagnosticsDialog.value
    && isPageVisible.value) {
    void refreshAiDiagnostics()
  }
})

watch([isPageVisible, isUserActive], ([visible, active], [wasVisible, wasActive]) => {
  if (showAiDiagnosticsDialog.value
    && whatsappStore.enabled
    && visible
    && active
    && (!wasVisible || !wasActive)) {
    void refreshAiDiagnostics()
  }
})
watch([activeInbox, selectedLabel], () => { if (whatsappStore.enabled) void reloadConversations() })
watch([() => selectedConversation.value?.id, canSend], clearQuickReplyPreview, { flush: 'sync' })
watch([selectedBranchId, unroutedOnly], () => { inboxCounts.value = null })
watch([activeInbox, selectedBranchId, unroutedOnly, selectedLabel], () => {
  void router.replace({ query: { ...route.query, inbox: activeInbox.value, whatsappBranch: selectedBranchId.value || undefined,
    unrouted: unroutedOnly.value ? 'true' : undefined, label: selectedLabel.value || undefined } })
})
watch(() => Math.floor((clockNow.value - 5 * 3_600_000) / 86_400_000), scheduleInboxLabelsRefresh)
watch(() => Math.floor(clockNow.value / 60_000), () => {
  if (isPageVisible.value && isUserActive.value) inboxTotalsRefresh.schedule()
})
const loadSelectedAdvisors = useDebouncedCallback(async () => {
  const id = selectedConversation.value?.id
  if (!id) return
  try {
    const response = await whatsappApi.getAdvisors(id)
    if (selectedConversation.value?.id === id) advisors.value = response.data ?? []
  } catch {}
}, 200)
watch(() => selectedConversation.value?.id, id => {
  replyTarget.value = null
  reactionPickerId.value = null
  showProductChoices.value = false
  advisors.value = []; transferTarget.value = 0
  loadSelectedAdvisors.cancel()
  if (id) loadSelectedAdvisors.schedule()
})
</script>

<style scoped>
.wa-message-toolbar {
  position: absolute;
  z-index: 5;
  top: -.9rem;
  transition: opacity 140ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .wa-message-toolbar { opacity: 0; pointer-events: none; }
  .group\/message:hover .wa-message-toolbar, .wa-message-toolbar:focus-within, .wa-message-toolbar.is-open {
    opacity: 1;
    pointer-events: auto;
  }
}
.wa-reaction {
  display: inline-grid;
  place-items: center;
  min-width: 1.65rem;
  min-height: 1.45rem;
  border: 1px solid var(--color-emerald-100);
  border-radius: .625rem;
  background: white;
  padding: 0 .25rem;
  font-size: .9rem;
  animation: wa-reaction-in 180ms ease both;
}
@keyframes wa-reaction-in {
  from { transform: scale(.75); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .wa-reaction { animation: none; }
  .wa-message-toolbar { transition: none; }
}
.inbox-control {
  display: flex; align-items: center; gap: .375rem; min-height: 2.25rem; padding: .375rem .5rem;
  border: 1px solid var(--color-slate-200); border-radius: .625rem; cursor: pointer;
  list-style: none; font-weight: 600; color: var(--color-slate-700);
}
.inbox-control::-webkit-details-marker { display: none; }
.inbox-control:hover, .inbox-tool:hover:not(:disabled) { background: var(--color-slate-50); }
.inbox-control:focus-visible, .inbox-tool:focus-visible { outline: 2px solid var(--color-emerald-600); outline-offset: 1px; }
.inbox-control-panel {
  position: absolute; inset-inline: 0; top: 100%; z-index: 30; margin-top: .375rem; padding: .625rem;
  border: 1px solid var(--color-slate-200); border-radius: .75rem; background: white; color: var(--color-slate-700);
  box-shadow: 0 8px 24px #0f172a20;
}
.inbox-tool {
  display: flex; align-items: center; gap: .5rem; width: 100%; min-height: 2.25rem; padding: .375rem .5rem;
  border-radius: .5rem; cursor: pointer; text-align: left; font-weight: 500;
}
.inbox-tool:disabled { cursor: default; opacity: .5; }
.chat-header { container: whatsapp-header / inline-size; }
.chat-tool {
  display: inline-flex; align-items: center; gap: .25rem; height: 1.75rem; padding: 0 .375rem;
  cursor: pointer; list-style: none; white-space: nowrap; border: 1px solid var(--color-gray-200);
  border-radius: .5rem; font-size: .75rem; font-weight: 500; color: var(--color-gray-700);
}
.chat-tool:hover { background: var(--color-gray-50); }
.chat-tool:focus-visible { outline: 2px solid var(--color-emerald-600); outline-offset: 1px; }
.chat-tool::-webkit-details-marker { display: none; }
.chat-action-icon, .chat-label-chip { display: none; }
.chat-header :deep(.chat-order-toggle) { width: 1.75rem; height: 1.75rem; }
@container whatsapp-header (max-width: 46rem) {
  .chat-header :deep(.chat-save-label) {
    position: absolute; clip-path: inset(50%); width: 1px; height: 1px; overflow: hidden;
  }
}
@container whatsapp-header (min-width: 46rem) {
  .chat-label-chip { display: inline-flex; }
  .chat-label-count { display: none; }
}
@container whatsapp-header (max-width: 35rem) {
  .chat-action-label { display: none; }
  .chat-action-icon { display: inline-block; }
  .chat-header :deep(.chat-take) { width: 1.75rem; height: 1.75rem; padding: 0; }
  .chat-tool { justify-content: center; min-width: 1.75rem; padding: 0 .25rem; }
  .chat-menu { position: static; }
  .chat-menu-panel { right: .5rem; max-width: calc(100% - 1rem); }
}
@media (min-width: 1280px) {
  .whatsapp-columns { grid-template-columns: var(--inbox-width) minmax(260px, 1fr); }
  .whatsapp-columns.with-order { grid-template-columns: var(--inbox-width) minmax(260px, 1fr) var(--order-width); }
}
</style>

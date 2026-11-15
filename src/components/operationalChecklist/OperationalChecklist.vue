<template>
  <div ref="root" class="relative inline-flex shrink-0 items-center gap-1.5" @keydown.esc.stop="closePanel" @focusout="focusOut">
    <BaseButton v-for="group in groups" :key="group.period" :ref="el => setTrigger(group.period, el)" variant="ghost" size="sm" icon-only :icon="group.icon"
      class="relative !h-9 !w-9 !rounded-xl border" :class="group.period === 'morning' ? 'border-amber-100 !bg-amber-50/70 !text-amber-600 hover:!bg-amber-100' : 'border-indigo-100 !bg-indigo-50/70 !text-indigo-500 hover:!bg-indigo-100'"
      :title="`${group.title} · ${store.pending(group.period)} sin marcar`" :aria-label="`${group.title}: ${store.pending(group.period)} tareas sin marcar`"
      :aria-controls="`${panelId}-${group.period}`" :aria-expanded="opened === group.period" aria-haspopup="dialog"
      @click="open(group.period)">
      <span v-if="store.pending(group.period) > 0" :key="store.pending(group.period)" class="pending-badge absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">{{ store.pending(group.period) }}</span>
      <span v-else-if="store.error" class="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-amber-500 text-center text-[10px] font-bold text-white ring-2 ring-white" aria-hidden="true">!</span>
    </BaseButton>
    <Teleport to="body">
    <Transition name="checklist-panel">
      <section v-if="opened" @keydown.esc.stop="closePanel" @focusout="focusOut" :id="`${panelId}-${opened}`" ref="panel" role="dialog" :aria-label="activeGroup.title" tabindex="-1"
        class="fixed z-[80] w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_60px_-16px_rgba(15,23,42,0.25)] focus:outline-none" :style="{ left: `${panelPosition.left}px`, top: `${panelPosition.top}px`, visibility: panelPositioned ? 'visible' : 'hidden' }">
        <div class="border-b border-slate-100 px-5 pb-4 pt-5" :class="opened === 'morning' ? 'bg-linear-to-br from-amber-50/80 via-white to-white' : 'bg-linear-to-br from-indigo-50/80 via-white to-white'">
          <div class="flex items-center justify-between gap-3">
            <div><p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{{ branchName }} · Hoy</p><h3 class="mt-1 text-base font-semibold tracking-tight text-slate-800">{{ activeGroup.title }}</h3></div>
            <span class="flex h-10 w-10 items-center justify-center rounded-2xl" :class="opened === 'morning' ? 'bg-amber-100/70 text-amber-600' : 'bg-indigo-100/70 text-indigo-500'"><component :is="activeGroup.icon" class="h-5 w-5" /></span>
          </div>
          <div class="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{{ activeGroup.time }} · Recordatorio</span><span>{{ completedCount }} de {{ visibleItems.length }} marcadas</span></div>
          <div class="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div class="progress-fill h-full rounded-full bg-emerald-500" :style="{ width: `${visibleItems.length ? completedCount / visibleItems.length * 100 : 0}%` }" /></div>
        </div>
        <div class="max-h-[min(420px,60dvh)] overflow-y-auto overscroll-contain p-2">
          <div v-if="store.loading && !store.snapshot" role="status" class="space-y-3 p-3"><span class="sr-only">Cargando tareas</span><div v-for="n in 3" :key="n" class="h-10 animate-pulse rounded-xl bg-slate-100" /></div>
          <div v-if="store.error" role="alert" class="m-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{{ store.error }}<button type="button" class="ml-2 font-semibold underline" @click="refresh">Reintentar</button></div>
          <ReminderList v-if="visibleItems.length" :items="visibleItems" :busy-ids="store.busyIds" :disabled="store.loading || !!store.error" @check="check" />
          <div v-else-if="!store.loading && !store.error" class="px-4 py-9 text-center"><CheckCircleIcon class="mx-auto h-8 w-8 text-emerald-400" /><p class="mt-3 text-sm font-medium text-slate-600">No hay tareas para este bloque.</p><p class="mt-1 text-xs text-slate-400">Los recordatorios se adaptan al día.</p></div>
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5"><span class="text-[10px] text-slate-400">Compartido · Marcar es opcional</span><BaseButton v-if="canManage" variant="ghost" size="xs" :icon="Cog6ToothIcon" @click="configure">Configurar</BaseButton><button v-else type="button" class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" @click="closePanel">Cerrar</button></div>
      </section>
    </Transition>
    </Teleport>
  </div>
  <BaseDialog :model-value="!!reminding" :title="`Recordatorios de la ${reminding === 'morning' ? 'mañana' : 'tarde'}`" size="md" :icon="reminding === 'morning' ? SunIcon : MoonIcon" :icon-variant="reminding === 'morning' ? 'warning' : 'primary'" scroll-body panel-class="checklist-reminder-modal" @update:model-value="dismissReminder">
    <p class="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{{ branchName }} · Hoy</p>
    <p class="mb-4 text-sm leading-relaxed text-slate-500">Estas tareas siguen sin marcar. Puedes revisarlas ahora o volver a ellas desde la barra superior.</p>
    <ReminderList :items="modalItems" :busy-ids="store.busyIds" :disabled="store.loading || !!store.error" @check="check" />
    <div v-if="modalCompleted" class="rounded-2xl bg-emerald-50 py-6 text-center"><CheckCircleIcon class="mx-auto h-7 w-7 text-emerald-500" /><p class="mt-2 text-sm font-medium text-emerald-800">No quedan tareas sin marcar.</p></div>
    <template #footer><p class="mr-auto self-center text-xs text-slate-400">Sin obligación de completar</p><BaseButton variant="secondary" @click="dismissReminder(false)">Cerrar</BaseButton></template>
  </BaseDialog>
  <ReminderConfigurationDialog v-if="showConfiguration && branchId" :key="branchId" :model-value="showConfiguration" :branch-id="branchId" :branch-name="branchName"
    @update:model-value="showConfiguration = $event" @changed="refresh" />
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { SunIcon, MoonIcon, Cog6ToothIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import ReminderList from './ReminderList.vue'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { useOperationalChecklistStore } from '@/store/operationalChecklist'
import { useToast } from '@/composables/useToast'
import { useSignalR } from '@/composables/useSignalR'
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr'
import { dueReminder, nextReminderDelay, reminderStorageKey } from '@/utils/checklistReminder'
import type { ReminderPeriod } from '@/types/operationalChecklist'
const ReminderConfigurationDialog = defineAsyncComponent(() => import('./ReminderConfigurationDialog.vue'))
const auth = useAuthStore(), branch = useBranchContextStore(), store = useOperationalChecklistStore(), toast = useToast()
const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL)
const root = ref<HTMLElement>(), panel = ref<HTMLElement>(), panelId = useId()
const panelPosition = ref({ left: 0, top: 0 }), panelPositioned = ref(false)
const opened = ref<ReminderPeriod | null>(null), reminding = ref<ReminderPeriod | null>(null), showConfiguration = ref(false)
const branchId = computed(() => auth.isSuperadmin ? branch.selectedBranchId : auth.branchId)
const branchName = computed(() => auth.isSuperadmin ? branch.selectedBranch?.name ?? 'Sucursal' : auth.user?.branchName ?? 'Sucursal')
const canManage = computed(() => auth.isSuperadmin || auth.isAdmin)
const scope = computed(() => auth.user?.id && branchId.value ? `${auth.user.id}:${branchId.value}` : '')
const groups: { period: ReminderPeriod; title: string; time: string; icon: typeof SunIcon }[] = [
  { period: 'morning', title: 'Tareas de la mañana', time: '10:30 a. m.', icon: SunIcon },
  { period: 'evening', title: 'Tareas de la tarde', time: '6:00 p. m.', icon: MoonIcon },
]
const activeGroup = computed(() => groups.find(x => x.period === opened.value) ?? groups[0]!)
const visibleItems = computed(() => store.items.filter(x => x.reminder.period === opened.value))
const completedCount = computed(() => visibleItems.value.filter(x => x.isChecked).length)
const remindedIds = ref<number[]>([])
const modalItems = computed(() => store.items.filter(x => remindedIds.value.includes(x.reminder.id)))
const modalCompleted = computed(() => modalItems.value.every(x => x.isChecked))
const triggers: Partial<Record<ReminderPeriod, HTMLElement>> = {}
let timer: ReturnType<typeof setTimeout> | undefined, disposed = false
const handled = new Map<string, string>()
function setTrigger(period: ReminderPeriod, value: any) { if (value?.$el) triggers[period] = value.$el }
function closePanel() { const last = opened.value; opened.value = null; if (last) triggers[last]?.focus() }
async function open(period: ReminderPeriod) {
  if (opened.value === period) { closePanel(); return }
  panelPositioned.value = false; opened.value = period; await positionPanel(); panel.value?.focus(); await store.load(); await positionPanel(); schedule()
}
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node) && !panel.value?.contains(event.target as Node) && !(event.target as Element).closest?.('[role="tooltip"]')) opened.value = null }
function focusOut(event: FocusEvent) { if (event.relatedTarget && !root.value?.contains(event.relatedTarget as Node) && !panel.value?.contains(event.relatedTarget as Node)) opened.value = null }
async function positionPanel() {
  await nextTick()
  if (!opened.value || !root.value || !panel.value) return
  const anchor = root.value.getBoundingClientRect(), rect = panel.value.getBoundingClientRect()
  panelPosition.value = { left: Math.max(12, Math.min(anchor.right - rect.width, window.innerWidth - rect.width - 12)), top: Math.max(12, Math.min(anchor.bottom + 12, window.innerHeight - rect.height - 12)) }
  panelPositioned.value = true
}
function configure() { opened.value = null; showConfiguration.value = true }
async function check(id: number, value: boolean) {
  try { await store.setChecked(id, value) }
  catch (e) { toast.error('No se pudo guardar el check', e instanceof Error ? e.message : 'Actualiza el checklist e intenta de nuevo.') }
}
function remembered(key: string, day: string) {
  try { return handled.get(key) === day || localStorage.getItem(key) === day } catch { return handled.get(key) === day }
}
function remember(key: string, day: string) { handled.set(key, day); try { localStorage.setItem(key, day) } catch { /* Memory fallback when storage is unavailable. */ } }
function dismissReminder(value: boolean) { if (!value) reminding.value = null }
async function refresh() { await store.load(); schedule() }
function schedule() {
  clearTimeout(timer)
  const data = store.snapshot
  if (disposed || !scope.value || !data || document.visibilityState === 'hidden' || store.error) return
  const now = Date.now() + store.clockOffset
  if (now >= Date.parse(data.resetAtUtc)) {
    reminding.value = null; opened.value = null
    if (store.loading || store.busyIds.length) timer = setTimeout(schedule, 1000)
    else void refresh()
    return
  }
  let delay = nextReminderDelay(data, now)
  const due = dueReminder(data, now)
  if (due) {
    const key = reminderStorageKey(scope.value, due)
    if (!remembered(key, data.operationDate)) {
      if (store.pending(due) === 0) remember(key, data.operationDate)
      else if (!showConfiguration.value && !reminding.value && !store.busyIds.length && !document.querySelector('[role="dialog"][aria-modal="true"]')) {
        remember(key, data.operationDate); opened.value = null
        remindedIds.value = store.items.filter(x => x.reminder.period === due && !x.isChecked).map(x => x.reminder.id)
        reminding.value = due
      } else delay = Math.min(delay, 15_000)
    }
  }
  timer = setTimeout(schedule, delay)
}
function visibility() { if (document.visibilityState === 'visible') void refresh(); else clearTimeout(timer) }
function realtime(event: { branchId?: number }) { if (event.branchId === branchId.value) void refresh() }
watch(scope, value => {
  clearTimeout(timer); opened.value = null; reminding.value = null; showConfiguration.value = false
  store.setScope(value); if (value) void refresh()
}, { immediate: true })
watch(connectionState, (value, old) => { if (value === 'connected' && old) void refresh() })
watch(() => store.snapshot?.operationDate, () => schedule())
onMounted(() => { on('OperationalChecklistChanged', realtime); document.addEventListener('pointerdown', outside); document.addEventListener('visibilitychange', visibility); window.addEventListener('online', refresh); window.addEventListener('resize', positionPanel) })
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); off('OperationalChecklistChanged', realtime); document.removeEventListener('pointerdown', outside); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', refresh); window.removeEventListener('resize', positionPanel); store.setScope('') })
</script>
<style scoped>
.checklist-panel-enter-active,.checklist-panel-leave-active { transition: opacity .18s ease, transform .18s ease; transform-origin: top right; }
.checklist-panel-enter-from,.checklist-panel-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }
.progress-fill { transition: width .25s ease; }
.pending-badge { animation: badge-in .18s ease-out; }
@keyframes badge-in { from { transform: scale(.8); opacity: .5; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .checklist-panel-enter-active,.checklist-panel-leave-active,.progress-fill { transition: none; } .pending-badge { animation: none; } }
</style>

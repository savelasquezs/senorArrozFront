import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { operationalChecklistApi as api } from '@/services/MainAPI/operationalChecklistApi'
import type { ChecklistSnapshot, ReminderPeriod } from '@/types/operationalChecklist'

export const useOperationalChecklistStore = defineStore('operationalChecklist', () => {
  const snapshot = ref<ChecklistSnapshot | null>(null)
  const loading = ref(false), error = ref(''), busyIds = ref<number[]>([])
  const clockOffset = ref(0)
  let scope = '', generation = 0, inFlight: Promise<void> | null = null, refreshAfterSave = false
  const items = computed(() => snapshot.value?.items ?? [])
  const pending = (period: ReminderPeriod) => items.value.filter(x => x.reminder.period === period && !x.isChecked).length

  function setScope(next: string) {
    if (scope === next) return
    scope = next; generation++; inFlight = null; snapshot.value = null
    loading.value = false; error.value = ''; busyIds.value = []; refreshAfterSave = false; clockOffset.value = 0
  }
  async function load(): Promise<void> {
    if (!scope) return
    if (busyIds.value.length) { refreshAfterSave = true; return }
    if (inFlight) return inFlight
    const ticket = generation
    loading.value = true
    const task = (async () => {
      try {
        const result = await api.today()
        if (ticket !== generation) return
        snapshot.value = result; clockOffset.value = Date.parse(result.serverTimeUtc) - Date.now(); error.value = ''
      } catch (cause) {
        if (ticket === generation) error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el checklist.'
      } finally {
        if (ticket === generation) { loading.value = false; inFlight = null }
      }
    })()
    inFlight = task
    return task
  }
  async function setChecked(id: number, value: boolean) {
    const current = snapshot.value
    const item = current?.items.find(x => x.reminder.id === id)
    if (!current || !item || busyIds.value.includes(id) || loading.value) return
    const ticket = generation, date = current.operationDate, before = item.isChecked
    busyIds.value.push(id); item.isChecked = value
    try {
      const result = await api.check(id, date, value, item.stateRevision)
      if (ticket !== generation || snapshot.value?.operationDate !== date) return
      const index = snapshot.value.items.findIndex(x => x.reminder.id === id)
      if (index >= 0) snapshot.value.items[index] = result
    } catch (cause) {
      if (ticket !== generation) return
      item.isChecked = before; refreshAfterSave = true
      throw cause
    } finally {
      if (ticket === generation) {
        busyIds.value = busyIds.value.filter(x => x !== id)
        if (!busyIds.value.length && refreshAfterSave) { refreshAfterSave = false; void load() }
      }
    }
  }
  return { snapshot, loading, error, busyIds, clockOffset, items, pending, setScope, load, setChecked }
})

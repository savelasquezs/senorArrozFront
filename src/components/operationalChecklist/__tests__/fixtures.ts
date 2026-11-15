import type { ChecklistSnapshot, ReminderDefinition } from '@/types/operationalChecklist'
export const definition = (id = 1, changes: Partial<ReminderDefinition> = {}): ReminderDefinition => ({
  id, code: `TEST-${id}`, title: `Tarea ${id}`, description: `Descripción exacta ${id}`, condition: '', period: 'morning',
  daysOfWeek: [0, 1, 2, 4, 5, 6], shiftMondayHoliday: false, responsible: 'cashier', manualPath: '/operacion/responsable-caja',
  sortOrder: id, isActive: true, revision: 1, syncedRevision: 1, ...changes,
})
export const snapshot = (changes: Partial<ChecklistSnapshot> = {}): ChecklistSnapshot => ({
  branchId: 1, operationDate: '2026-11-15', serverTimeUtc: '2026-11-15T15:00:00Z',
  morningAtUtc: '2026-11-15T15:30:00Z', eveningAtUtc: '2026-11-15T23:00:00Z', resetAtUtc: '2026-11-16T05:00:00Z',
  items: [
    { reminder: definition(1), isChecked: false, stateRevision: 0 },
    { reminder: definition(2, { condition: 'Cuando corresponda' }), isChecked: false, stateRevision: 0 },
    { reminder: definition(3, { period: 'evening', responsible: 'admin' }), isChecked: false, stateRevision: 0 },
  ], ...changes,
})

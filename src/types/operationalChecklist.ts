export type ReminderPeriod = 'morning' | 'evening'
export interface ReminderDefinition {
  id: number; code: string; title: string; description: string; condition: string
  period: ReminderPeriod; daysOfWeek: number[]; shiftMondayHoliday: boolean
  responsible: 'cashier' | 'admin'; manualPath: string; sortOrder: number
  isActive: boolean; revision: number; syncedRevision: number
}
export interface ChecklistItem { reminder: ReminderDefinition; isChecked: boolean; stateRevision: number }
export interface ChecklistSnapshot {
  branchId: number; operationDate: string; serverTimeUtc: string
  morningAtUtc: string; eveningAtUtc: string; resetAtUtc: string; items: ChecklistItem[]
}
export type ReminderInput = Omit<ReminderDefinition, 'id' | 'code' | 'revision' | 'syncedRevision'> & {
  id: number | null; expectedRevision: number
}
export interface ReminderSyncResult { status: 'synced' | 'pending' | 'notConfigured'; message: string }
export interface SaveReminderResult { reminder: ReminderDefinition; documentation: ReminderSyncResult }

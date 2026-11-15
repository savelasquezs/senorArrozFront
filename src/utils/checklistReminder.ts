import type { ChecklistSnapshot, ReminderPeriod } from '@/types/operationalChecklist'

/** Latest due group only: opening the POS at night must not stack a morning modal. */
export function dueReminder(snapshot: ChecklistSnapshot, now: number): ReminderPeriod | null {
  if (now >= Date.parse(snapshot.resetAtUtc)) return null
  if (now >= Date.parse(snapshot.eveningAtUtc)) return 'evening'
  if (now >= Date.parse(snapshot.morningAtUtc)) return 'morning'
  return null
}
export function nextReminderDelay(snapshot: ChecklistSnapshot, now: number) {
  const next = [snapshot.morningAtUtc, snapshot.eveningAtUtc, snapshot.resetAtUtc]
    .map(Date.parse).filter(value => value > now).sort((a, b) => a - b)[0]
  return Math.max(1000, Math.min(next ? next - now + 100 : 1000, 2_147_000_000))
}
/** Keep one date per scope/group, not a history of who completed tasks. */
export function reminderStorageKey(scope: string, period: ReminderPeriod) { return `pos:reminder:${scope}:${period}` }

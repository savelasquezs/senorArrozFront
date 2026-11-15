import { describe, expect, it } from 'vitest'
import { dueReminder, nextReminderDelay, reminderStorageKey } from '../checklistReminder'
import { snapshot } from '@/components/operationalChecklist/__tests__/fixtures'
describe('server-defined Colombia reminder boundaries', () => {
  it.each([
    ['2026-11-15T15:29:59Z', null], ['2026-11-15T15:30:00Z', 'morning'],
    ['2026-11-15T22:59:59Z', 'morning'], ['2026-11-15T23:00:00Z', 'evening'],
    ['2026-11-16T04:59:59Z', 'evening'], ['2026-11-16T05:00:00Z', null],
  ])('at %s chooses only the latest due block', (now, expected) => expect(dueReminder(snapshot(), Date.parse(now))).toBe(expected))
  it('uses a timer for the next boundary, not frequent API polling', () => expect(nextReminderDelay(snapshot(), Date.parse('2026-11-15T15:00:00Z'))).toBe(1_800_100))
  it('keeps branch and period dismissal storage separate', () => expect(reminderStorageKey('10:1', 'morning')).not.toBe(reminderStorageKey('10:2', 'morning')))
})

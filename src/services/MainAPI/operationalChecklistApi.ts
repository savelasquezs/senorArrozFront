import { BaseApi } from './baseApi'
import type { PagedResult } from '@/types/common'
import type { ChecklistItem, ChecklistSnapshot, ReminderDefinition, ReminderInput, ReminderSyncResult, SaveReminderResult } from '@/types/operationalChecklist'

class OperationalChecklistApi extends BaseApi {
  today() { return this.get<ChecklistSnapshot>('/operational-checklist/today') }
  configuration() { return this.get<PagedResult<ReminderDefinition>>('/operational-checklist/configuration', { params: { page: 1, pageSize: 100 } }) }
  save(data: ReminderInput) { return this.put<SaveReminderResult>('/operational-checklist/configuration', data, { timeout: 70_000 }) }
  check(id: number, operationDate: string, isChecked: boolean, expectedRevision: number) {
    return this.put<ChecklistItem>(`/operational-checklist/${id}/state`, { operationDate, isChecked, expectedRevision })
  }
  synchronize() { return this.post<ReminderSyncResult>('/operational-checklist/sync-mintlify', {}, { timeout: 70_000 }) }
}
export const operationalChecklistApi = new OperationalChecklistApi()

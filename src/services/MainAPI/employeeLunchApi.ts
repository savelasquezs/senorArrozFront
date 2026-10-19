import { BaseApi } from './baseApi';
import type { PagedResult } from '@/types/common';

export interface EmployeeLunch { id: number; startedAt: string; endedAt: string | null; updatedAt: string }
export interface EmployeeLunchState {
  userId: number; name: string; role: string; activeLunch: EmployeeLunch | null;
  lunches: EmployeeLunch[]; serverTimeUtc: string;
}

class EmployeeLunchApi extends BaseApi {
  me() { return this.get<EmployeeLunchState>('/employee-lunch/me', { branchScope: 'none' }); }
  branch(date?: string, page = 1) {
    return this.get<PagedResult<EmployeeLunchState>>('/employee-lunch/branch', { params: { date, page, pageSize: 50 } });
  }
  change(state: EmployeeLunchState, password: string, kitchen = false) {
    return this.post<EmployeeLunch>('/employee-lunch/' + (state.activeLunch ? 'finish' : 'start'), {
      password, userId: kitchen ? state.userId : undefined, lunchId: state.activeLunch?.id,
    }, { branchScope: 'none' });
  }
  correct(lunch: EmployeeLunch, startedAt: string, endedAt: string | null, reason: string) {
    return this.patch<EmployeeLunch>(`/employee-lunch/${lunch.id}`, {
      startedAt, endedAt, reason, expectedUpdatedAt: lunch.updatedAt,
    });
  }
}
export const employeeLunchApi = new EmployeeLunchApi();

export function lunchDuration(lunch: EmployeeLunch, now = Date.now()) {
  const minutes = Math.max(0, Math.floor(((lunch.endedAt ? Date.parse(lunch.endedAt) : now) - Date.parse(lunch.startedAt)) / 60000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

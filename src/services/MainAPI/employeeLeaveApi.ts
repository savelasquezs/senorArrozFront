import type { AxiosRequestConfig } from 'axios';
import { BaseApi } from './baseApi';
import type { PagedResult } from '@/types/common';
import type { LeaveAction, LeaveAttachment, LeaveDetail, LeaveHistory, LeaveInput, LeaveItem, LeaveKind, LeaveSummary } from '@/types/employeeLeave';

const root = '/employee-leaves';
class EmployeeLeaveApi extends BaseApi {
  list(params: { review?: boolean; status?: string; search?: string; branchId?: number; from?: string; to?: string; page?: number }) {
    return this.get<PagedResult<LeaveItem>>(root, { params, branchScope: 'none' });
  }
  detail(id: string) { return this.get<LeaveDetail>(`${root}/${id}`, { branchScope: 'none' }); }
  history(id: string, page = 1) { return this.get<PagedResult<LeaveHistory>>(`${root}/${id}/history`, { params: { page, pageSize: 25 }, branchScope: 'none' }); }
  catalog() { return this.get<LeaveKind[]>(`${root}/catalog`, { branchScope: 'none' }); }
  summary() { return this.get<LeaveSummary>(`${root}/summary`, { branchScope: 'none' }); }
  read(id: string, version: number) { return this.send<void>({ method: 'POST', url: `${root}/${id}/read`, data: { version } }); }
  save(id: string | undefined, data: LeaveInput) {
    return this.send<{ publicId: string }>({ method: id ? 'PUT' : 'POST', url: id ? `${root}/${id}` : root, data });
  }
  change(id: string, action: 'decision' | 'cancel' | 'return' | 'verify', data: LeaveAction) {
    return this.send<{ publicId: string }>({ method: 'POST', url: `${root}/${id}/${action}`, data });
  }
  upload(id: string, version: number, uploadKey: string, file: File, password: string) {
    const data = new FormData();
    data.set('file', file); data.set('version', String(version)); data.set('uploadKey', uploadKey); data.set('password', password);
    return this.send<{ publicId: string }>({ method: 'POST', url: `${root}/${id}/attachments`, data, timeout: 60000 });
  }
  removeAttachment(id: string, attachmentId: number, data: LeaveAction) {
    return this.send<{ publicId: string }>({ method: 'DELETE', url: `${root}/${id}/attachments/${attachmentId}`, data });
  }
  async download(id: string, file: LeaveAttachment) {
    const blob = await this.get<Blob>(`${root}/${id}/attachments/${file.id}`, { responseType: 'blob', branchScope: 'none', timeout: 60000 });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private async send<T>(config: AxiosRequestConfig): Promise<T> {
    try { return (await this.api.request<T>({ ...config, branchScope: 'none' })).data; }
    catch (error: any) {
      const mapped = Object.assign(this.handleError(error), { status: error.response?.status, code: error.response?.data?.code });
      if (error.config) error.config.data = undefined;
      throw mapped;
    }
    finally {
      if (config.data instanceof FormData) config.data.delete('password');
      else if (config.data && typeof config.data === 'object' && 'password' in config.data) config.data.password = '';
    }
  }
}
export const employeeLeaveApi = new EmployeeLeaveApi();

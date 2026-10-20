import { DateTimeService } from '@/services/domain/DateTimeService';
import { defaultBusinessCalendar } from '@/utils/datetime';

export type AccountType = 'personal' | 'terminal';
export type LeaveStatus = 'pending' | 'approved' | 'denied' | 'postponed' | 'cancelled';
export interface LeaveEvidenceRule { code: string; label: string; stage: 'before' | 'after' | 'initial'; required: boolean; instructions: string }
export interface LeaveEvidenceState extends LeaveEvidenceRule { status: 'missing' | 'submitted' | 'verified' | 'rejected' }
export interface LeaveKind {
  code: string; label: string; paidByCompanyPolicy: boolean; remuneration?: 'paid' | 'unpaid';
  description?: string; evidence?: LeaveEvidenceRule[]; isPeriodRecord?: boolean; policyBasis?: string;
}
export interface LeaveSummary { unread: number; pendingReview: number }
export interface LeaveItem {
  publicId: string; userId: number; branchId: number; branchName: string; applicantName: string;
  applicantRole: string; kind: string; status: LeaveStatus; startsAt: string; endsAt: string;
  createdAt: string; updatedAt: string; version: number; isUnread: boolean;
  isAllDay?: boolean; requestedIsPaid?: boolean; isPaid?: boolean | null; supportStatus?: string; isPeriodRecord?: boolean;
}
export interface LeaveAttachment {
  id: number; fileName: string; contentType: string; size: number; createdAt: string;
  evidenceCode?: string; reviewStatus?: 'submitted' | 'verified' | 'rejected'; reviewReason?: string | null;
  reviewedAt?: string | null; supersededAt?: string | null; replacesAttachmentId?: number | null;
}
export interface LeavePendingFile { uploadKey: string; file: File; evidenceCode: string }
export interface LeaveHistory { id: number; operation: string; changedAt: string; actorName: string; reason: string }
export interface LeaveDetail {
  request: LeaveItem; documentNumber: string | null; justification: string; isPaid: boolean | null;
  decisionReason: string | null; decidedAt: string | null; decidedByName: string | null;
  supportRequired: boolean; supportDueAt: string | null; supportStatus: string; returnedAt: string | null;
  returnVerifiedAt: string | null; verificationReason: string | null; canEdit: boolean; canReview: boolean;
  canCancel: boolean; canReturn: boolean; hasReviewer: boolean; attachments: LeaveAttachment[];
  evidenceRequirements?: LeaveEvidenceState[]; policyVersion?: number;
}
export interface LeaveInput {
  requestKey: string; version: number; password: string; kind: string; documentNumber: string | null;
  startsAt: string; endsAt: string; justification: string; supportRequired: boolean;
  isAllDay?: boolean; requestedIsPaid?: boolean;
}
export interface LeaveAction {
  version: number; password: string; reason: string; status?: LeaveStatus; isPaid?: boolean | null;
  supportRequired?: boolean; supportDueAt?: string | null; supportStatus?: 'verified' | 'rejected' | null;
  verifyReturn?: boolean; attachmentId?: number | null;
}
export const leaveStatusLabels: Record<LeaveStatus, string> = {
  pending: 'Pendiente', approved: 'Aprobado', denied: 'Denegado', postponed: 'Por ajustar', cancelled: 'Cancelado',
};
export const supportStatusLabels: Record<string, string> = {
  not_required: 'No requerido', pending: 'Por entregar', submitted: 'Por revisar', verified: 'Verificado', rejected: 'Por corregir', missing: 'Por entregar',
};
export const leaveHistoryLabels: Record<string, string> = {
  created: 'Solicitud enviada', resubmitted: 'Solicitud modificada', decision: 'Decisión registrada',
  cancel: 'Solicitud cancelada', return: 'Regreso registrado', verify: 'Verificación',
  attachment_added: 'Soporte agregado', attachment_removed: 'Soporte retirado', attachment_replaced: 'Soporte reemplazado',
};
export function leaveDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value)) : '—';
}
export function colombiaLocal(value: string) {
  const date = new Date(value), time = DateTimeService.dateToLocalHour(date);
  return `${defaultBusinessCalendar.formatYmd(date)}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
}
export function colombiaUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Indica una fecha y hora válidas.');
  const day = value.slice(0, 10), hours = Number(value.slice(11, 13)), minutes = Number(value.slice(14, 16));
  const result = DateTimeService.localHourToDate({ hours, minutes, seconds: 0 }, new Date(`${day}T12:00:00-05:00`)).toISOString();
  if (colombiaLocal(result) !== value) throw new Error('La fecha no es válida.');
  return result;
}
/** Civil-date arithmetic only; never convert a complete day to working/payroll hours. */
export function addLeaveDays(day: string, count: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Selecciona una fecha válida.');
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error('La fecha no es válida.');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function leaveInterval(start: string, end: string, allDay: boolean) {
  const startsAt = colombiaUtc(allDay ? `${start.slice(0, 10)}T00:00` : start);
  const endsAt = colombiaUtc(allDay ? `${addLeaveDays(end.slice(0, 10), 1)}T00:00` : end);
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('El fin debe ser posterior al inicio.');
  if (Date.parse(endsAt) - Date.parse(startsAt) > 366 * 86400000) throw new Error('El intervalo no puede superar 366 días.');
  return { startsAt, endsAt, isAllDay: allDay };
}
export function leaveDuration(item: Pick<LeaveItem, 'startsAt' | 'endsAt' | 'isAllDay' | 'isPeriodRecord'>) {
  const minutes = Math.round((Date.parse(item.endsAt) - Date.parse(item.startsAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Selecciona el intervalo';
  if (item.isPeriodRecord) return 'Período de pausas · no es ausencia';
  if (item.isAllDay) { const days = Math.round(minutes / 1440); return `${days} ${days === 1 ? 'día completo' : 'días completos'}`; }
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} ${h === 1 ? 'hora' : 'horas'}${m ? ` ${m} min` : ''}` : `${m} min`;
}
export function leavePeriod(item: Pick<LeaveItem, 'startsAt' | 'endsAt' | 'isAllDay'>) {
  if (!item.isAllDay) return `${leaveDate(item.startsAt)} → ${leaveDate(item.endsAt)}`;
  const format = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' });
  const start = format.format(new Date(item.startsAt)), end = format.format(new Date(Date.parse(item.endsAt) - 1));
  return start === end ? start : `${start} al ${end}`;
}
export function missingPriorEvidence(rules: LeaveEvidenceRule[], files: LeavePendingFile[], existing: LeaveAttachment[] = []) {
  return rules.filter(rule => rule.required && rule.stage === 'before'
    && !files.some(x => x.evidenceCode === rule.code)
    && !existing.some(x => x.evidenceCode === rule.code && !x.supersededAt && x.reviewStatus !== 'rejected'));
}
export function validateLeaveFile(file: File) {
  const extensions: Record<string, RegExp> = { 'application/pdf': /\.pdf$/i, 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i };
  if (!file.size || file.size > 5 * 1024 * 1024 || !extensions[file.type]?.test(file.name))
    throw new Error('Selecciona un PDF, JPG o PNG de hasta 5 MB.');
}

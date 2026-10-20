export type AccountType = 'personal' | 'terminal';
export type LeaveStatus = 'pending' | 'approved' | 'denied' | 'postponed' | 'cancelled';
export interface LeaveKind { code: string; label: string; paidByCompanyPolicy: boolean }
export interface LeaveSummary { unread: number; pendingReview: number }
export interface LeaveItem {
  publicId: string; userId: number; branchId: number; branchName: string; applicantName: string;
  applicantRole: string; kind: string; status: LeaveStatus; startsAt: string; endsAt: string;
  createdAt: string; updatedAt: string; version: number; isUnread: boolean;
}
export interface LeaveAttachment { id: number; fileName: string; contentType: string; size: number; createdAt: string }
export interface LeaveHistory { id: number; operation: string; changedAt: string; actorName: string; reason: string }
export interface LeaveDetail {
  request: LeaveItem; documentNumber: string | null; justification: string; isPaid: boolean | null;
  decisionReason: string | null; decidedAt: string | null; decidedByName: string | null;
  supportRequired: boolean; supportDueAt: string | null; supportStatus: string; returnedAt: string | null;
  returnVerifiedAt: string | null; verificationReason: string | null; canEdit: boolean; canReview: boolean;
  canCancel: boolean; canReturn: boolean; hasReviewer: boolean; attachments: LeaveAttachment[];
}
export interface LeaveInput {
  requestKey: string; version: number; password: string; kind: string; documentNumber: string | null;
  startsAt: string; endsAt: string; justification: string; supportRequired: boolean;
}
export interface LeaveAction {
  version: number; password: string; reason: string; status?: LeaveStatus; isPaid?: boolean | null;
  supportRequired?: boolean; supportDueAt?: string | null; supportStatus?: 'verified' | 'rejected' | null; verifyReturn?: boolean;
}
export const leaveStatusLabels: Record<LeaveStatus, string> = {
  pending: 'Pendiente', approved: 'Aprobado', denied: 'Denegado', postponed: 'Aplazado', cancelled: 'Cancelado',
};
export const supportStatusLabels: Record<string, string> = {
  not_required: 'No requerido', pending: 'Pendiente', submitted: 'Entregado', verified: 'Verificado', rejected: 'Requiere corrección',
};
export const leaveHistoryLabels: Record<string, string> = {
  created: 'Solicitud enviada', resubmitted: 'Solicitud modificada', decision: 'Decisión registrada',
  cancel: 'Solicitud cancelada', return: 'Regreso registrado', verify: 'Verificación',
  attachment_added: 'Soporte agregado', attachment_removed: 'Soporte retirado',
};
export function leaveDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value)) : '—';
}
export function colombiaLocal(value: string) { return new Date(Date.parse(value) - 5 * 3600000).toISOString().slice(0, 16); }
export function colombiaUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Indica una fecha y hora válidas.');
  const result = new Date(`${value}:00-05:00`).toISOString();
  if (colombiaLocal(result) !== value) throw new Error('La fecha no es válida.');
  return result;
}

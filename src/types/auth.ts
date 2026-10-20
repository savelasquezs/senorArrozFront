import type { AccountType } from './employeeLeave';

export const UserRole = {
  SUPERADMIN: 'Superadmin', ADMIN: 'Admin', CASHIER: 'Cashier', KITCHEN: 'Kitchen', DELIVERYMAN: 'Deliveryman',
} as const;
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
export interface User {
  id: number; name: string; email: string; phone: string; active: boolean; role: UserRoleType;
  /** Ausente solo en sesiones anteriores a la migración; nunca implica Terminal. */
  accountType?: AccountType;
  branchId: number; branchName: string; branchAddress?: string; branchPhone1?: string;
  branchPhone2?: string | null; branchLatitude?: number | null; branchLongitude?: number | null; profileImageUrl?: string;
}
export interface LoginResponse { token: string; refreshToken: string; expiresAt: string; user: User }
export interface LoginCredentials { email: string; password: string }
export interface ApiError { message: string; code?: string; details?: any }
export interface ChangePasswordCredentials { currentPassword: string; newPassword: string; confirmPassword: string }
export interface resetPasswordCredentials { token: string; email: string; newPassword: string; confirmPassword: string }

import type { User } from '@/types/auth';

type Account = Pick<User, 'role' | 'accountType'>;
export const isTerminalAccount = (user: Account | null | undefined) => user?.accountType === 'terminal';
export const isPersonalKitchenAccount = (user: Account | null | undefined) => user?.role === 'Kitchen' && user.accountType === 'personal';
const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
export function accountCanVisit(user: Account | null | undefined, path: string): boolean {
  if (!user) return false;
  if (isTerminalAccount(user)) return user.role === 'Kitchen' && ['/kitchen', '/change-password'].some(root => under(path, root));
  if (user.role === 'Kitchen') return user.accountType === 'personal' && ['/permisos', '/documents', '/profile', '/change-password'].some(root => under(path, root));
  return true;
}
export function accountHome(user: Account | null | undefined): string {
  switch (user?.role) {
    case 'Superadmin': return '/dashboard';
    case 'Admin': return '/orders/new';
    case 'Cashier': return '/orders';
    case 'Deliveryman': return '/delivery';
    case 'Kitchen': return isTerminalAccount(user) ? '/kitchen' : '/permisos';
    default: return '/login';
  }
}
export function safeReturnPath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    && !/[\\\u0000-\u0020]/.test(value) && !under(value.split(/[?#]/)[0] ?? '', '/login') ? value : null;
}

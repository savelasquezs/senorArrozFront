import { describe, expect, it } from 'vitest';
import { accountCanVisit, accountHome, safeReturnPath } from '../employeeAccountAccess';
describe('cuentas personales y terminales', () => {
  const person = { role: 'Kitchen' as const, accountType: 'personal' as const };
  const terminal = { role: 'Kitchen' as const, accountType: 'terminal' as const };
  it.each(['/permisos', '/permisos/98e08165-42a1-42d9-a7dc-79e695207f74', '/documents', '/profile', '/change-password'])(
    'la persona puede consultar %s sin recibir pedidos', path => {
      expect(accountCanVisit(person, path)).toBe(true);
      expect(accountCanVisit(terminal, path)).toBe(path === '/change-password');
    });
  it.each(['/orders', '/customers', '/dashboard', '/kitchen', '/permisos-other'])(
    'la persona de cocina no puede entrar a %s', path => expect(accountCanVisit(person, path)).toBe(false));
  it('el destino inicial no depende de webAccessEnabled ni del estado activo', () => {
    expect(accountHome(person)).toBe('/permisos'); expect(accountHome(terminal)).toBe('/kitchen');
    expect(accountCanVisit({ role: 'Kitchen' }, '/kitchen')).toBe(false);
    expect(accountCanVisit(null, '/permisos')).toBe(false);
    expect(accountCanVisit({ role: 'Cashier', accountType: 'terminal' }, '/kitchen')).toBe(false);
  });
  it.each(['https://outside.invalid', '//outside.invalid', '/\\outside', '/login', '/login?redirect=/permisos', '/permisos\nsecret', '/ path', null, []])(
    'rechaza destinos inseguros %s', path => expect(safeReturnPath(path)).toBeNull());
  it('conserva un enlace interno al detalle después del login', () => {
    expect(safeReturnPath('/permisos/98e08165-42a1-42d9-a7dc-79e695207f74')).toBe('/permisos/98e08165-42a1-42d9-a7dc-79e695207f74');
  });
});

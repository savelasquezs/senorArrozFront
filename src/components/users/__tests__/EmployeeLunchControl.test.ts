import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import EmployeeLunchControl from '../EmployeeLunchControl.vue';
import type { EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';

const mocks = vi.hoisted(() => ({
  api: { me: vi.fn(), branch: vi.fn(), change: vi.fn() },
  auth: { isKitchen: false, user: { id: 1 }, logout: vi.fn() },
  push: vi.fn(),
}));
vi.mock('@/store/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({ on: vi.fn(), off: vi.fn(), connectionState: { value: 'disconnected' } }) }));
vi.mock('@/services/MainAPI/employeeLunchApi', async importOriginal => ({
  ...await importOriginal<object>(), employeeLunchApi: mocks.api,
}));
const idle = (id = 1): EmployeeLunchState => ({
  userId: id, name: `Empleado ${id}`, role: 'Cashier', activeLunch: null, lunches: [],
  serverTimeUtc: '2026-10-19T17:00:00Z',
});
const lunch = { id: 7, startedAt: '2026-10-19T17:00:00Z', endedAt: null, updatedAt: '2026-10-19T17:00:00Z' };
let wrapper: VueWrapper;
beforeEach(() => { vi.clearAllMocks(); mocks.auth.isKitchen = false; document.body.innerHTML = '<div id="app"></div>'; });
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; });
const show = async () => { wrapper = mount(EmployeeLunchControl, { attachTo: '#app' }); await flushPromises(); };
const password = async () => {
  const input = document.querySelector<HTMLInputElement>('#lunch-password')!;
  input.value = 'personal-password'; input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};
const submit = async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flushPromises(); };

describe('almuerzos', () => {
  it('no bloquea la operación si falla la consulta inicial de almuerzo', async () => {
    mocks.api.me.mockRejectedValue(new Error('Error interno del servidor'));
    await show();
    expect(document.getElementById('app')!.inert).not.toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Error interno del servidor');
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('recupera una salida guardada cuando se pierde su respuesta y mantiene el bloqueo', async () => {
    let server = idle();
    mocks.api.me.mockImplementation(async () => server);
    mocks.api.change.mockImplementation(async () => { server = { ...server, activeLunch: lunch }; throw new Error('Se perdió la conexión'); });
    await show(); await wrapper.get('button').trigger('click'); await flushPromises();
    await password(); await submit();
    expect(document.body.textContent).toContain('Estás almorzando');
    expect(document.body.textContent).toContain('Regresé de almorzar');
    expect(document.querySelector<HTMLInputElement>('#lunch-password')!.value).toBe('');
    expect(document.getElementById('app')!.inert).toBe(true);
    expect(mocks.api.change).toHaveBeenCalledTimes(1);
  });

  it('exige consultar de nuevo cuando falla la recuperación y no repite la escritura', async () => {
    mocks.api.me.mockResolvedValue(idle());
    await show(); await wrapper.get('button').trigger('click'); await flushPromises();
    mocks.api.change.mockRejectedValue(new Error('Error de red'));
    mocks.api.me.mockRejectedValue(new Error('Sin conexión'));
    await password(); await submit();
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(mocks.api.change).toHaveBeenCalledTimes(1);
    expect(document.getElementById('app')!.inert).toBe(true);
  });

  it('permite seleccionar cocineros individuales sin bloquear la pantalla compartida', async () => {
    mocks.auth.isKitchen = true;
    mocks.api.me.mockResolvedValue({ ...idle(), role: 'Kitchen' });
    mocks.api.branch.mockResolvedValue({ items: [idle(2), idle(3), idle(4)], totalCount: 3, page: 1, totalPages: 1 });
    mocks.api.change.mockResolvedValue(lunch);
    await show(); await wrapper.get('button').trigger('click'); await flushPromises();
    const select = document.querySelector<HTMLSelectElement>('#lunch-employee')!;
    select.value = '3'; select.dispatchEvent(new Event('change', { bubbles: true })); await flushPromises();
    await password(); await submit();
    expect(mocks.api.change).toHaveBeenCalledWith(expect.objectContaining({ userId: 3 }), 'personal-password', true);
    expect(document.getElementById('app')!.inert).not.toBe(true);
  });
});

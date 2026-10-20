import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import EmployeeLunchControl from '../EmployeeLunchControl.vue';
import type { EmployeeLunchState } from '@/services/MainAPI/employeeLunchApi';

const mocks = vi.hoisted(() => ({
  api: { me: vi.fn(), branch: vi.fn(), change: vi.fn() },
  auth: { isKitchen: false, user: { id: 1, role: 'Cashier', accountType: 'personal' }, logout: vi.fn() },
  route: { path: '/orders' }, push: vi.fn(),
  signalR: { on: vi.fn(), off: vi.fn() },
}));
vi.mock('@/store/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }));
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({ on: mocks.signalR.on, off: mocks.signalR.off, connectionState: { value: 'disconnected' } }) }));
vi.mock('@/services/MainAPI/employeeLunchApi', async importOriginal => ({
  ...await importOriginal<object>(), employeeLunchApi: mocks.api,
}));
const idle = (id = 1): EmployeeLunchState => ({
  userId: id, name: `Empleado ${id}`, role: 'Cashier', activeLunch: null, lunches: [],
  serverTimeUtc: '2026-10-19T17:00:00Z',
});
const lunch = { id: 7, startedAt: '2026-10-19T17:00:00Z', endedAt: null, updatedAt: '2026-10-19T17:00:00Z' };
let wrapper: VueWrapper;
beforeEach(() => {
  vi.clearAllMocks(); mocks.api.me.mockReset(); mocks.api.branch.mockReset(); mocks.api.change.mockReset(); mocks.auth.isKitchen = false;
  mocks.auth.user = { id: 1, role: 'Cashier', accountType: 'personal' };
  mocks.route.path = '/orders'; document.body.innerHTML = '<div id="app"></div>';
});
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
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(document.body.textContent).toContain('Error interno del servidor');
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });
  it('recupera una salida guardada cuando se pierde su respuesta y mantiene el bloqueo', async () => {
    let server = idle(); mocks.api.me.mockImplementation(async () => server);
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
    mocks.api.change.mockRejectedValue(new Error('Error de red')); mocks.api.me.mockRejectedValue(new Error('Sin conexión'));
    await password(); await submit();
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(mocks.api.change).toHaveBeenCalledTimes(1);
    expect(document.getElementById('app')!.inert).toBe(true);
  });
  it('permite seleccionar cocineros individuales sin bloquear la pantalla compartida', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 10, role: 'Kitchen', accountType: 'terminal' };
    mocks.api.branch.mockResolvedValue({ items: [idle(2), idle(3), idle(4)], totalCount: 3, page: 1, totalPages: 1 });
    mocks.api.change.mockResolvedValue(lunch);
    await show(); await wrapper.get('button').trigger('click'); await flushPromises();
    const select = document.querySelector<HTMLSelectElement>('#lunch-employee')!;
    select.value = '3'; select.dispatchEvent(new Event('change', { bubbles: true })); await flushPromises();
    await password(); await submit();
    expect(mocks.api.change).toHaveBeenCalledWith(expect.objectContaining({ userId: 3 }), 'personal-password', true);
    expect(document.getElementById('app')!.inert).not.toBe(true);
    expect(mocks.api.me).not.toHaveBeenCalled();
  });
  it('la cuenta personal de cocina consulta solo su almuerzo', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 1, role: 'Kitchen', accountType: 'personal' };
    mocks.api.me.mockResolvedValue({ ...idle(), role: 'Kitchen' });
    await show(); await wrapper.get('button').trigger('click'); await flushPromises();
    expect(mocks.api.me).toHaveBeenCalled(); expect(mocks.api.branch).not.toHaveBeenCalled();
    expect(document.querySelector('#lunch-employee')).toBeNull();
  });
  it('mantiene accesibles los permisos personales durante el almuerzo', async () => {
    mocks.route.path = '/permisos'; mocks.api.me.mockResolvedValue({ ...idle(), activeLunch: lunch });
    await show(); expect(document.getElementById('app')!.inert).not.toBe(true);
  });

  it('oculta el indicador del navbar cuando nadie está almorzando', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 10, role: 'Kitchen', accountType: 'terminal' };
    mocks.api.branch.mockResolvedValue({ items: [idle(2)], totalCount: 1, page: 1, totalPages: 1 });
    await show();
    expect(wrapper.text()).toContain('Almuerzos');
    expect(wrapper.find('[aria-controls="kitchen-lunch-active-list"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Empleado 2');
    expect(mocks.api.branch).toHaveBeenCalledWith(undefined, 1, 100);
  });

  it('muestra directamente el nombre y tiempo de un único cocinero en almuerzo', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 10, role: 'Kitchen', accountType: 'terminal' };
    mocks.api.branch.mockResolvedValue({ items: [{ ...idle(2), name: 'Carlos Ramírez', activeLunch: lunch }], totalCount: 1, page: 1, totalPages: 1 });
    await show();
    expect(wrapper.text()).toContain('Carlos Ramírez');
    expect(wrapper.find('[aria-controls="kitchen-lunch-active-list"]').exists()).toBe(false);
    expect(wrapper.find('[title="Carlos Ramírez está almorzando"]').exists()).toBe(true);
  });

  it('despliega una lista compacta cuando varios cocineros están almorzando', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 10, role: 'Kitchen', accountType: 'terminal' };
    mocks.api.branch.mockResolvedValue({
      items: [{ ...idle(2), name: 'Carlos Ramírez', activeLunch: lunch }, { ...idle(3), name: 'María López', activeLunch: { ...lunch, id: 8 } }],
      totalCount: 2, page: 1, totalPages: 1,
    });
    await show();
    const trigger = wrapper.get('[aria-controls="kitchen-lunch-active-list"]');
    expect(trigger.text()).toContain('2 almorzando');
    expect(wrapper.find('#kitchen-lunch-active-list').exists()).toBe(false);
    await trigger.trigger('click');
    expect(wrapper.get('#kitchen-lunch-active-list').text()).toContain('Carlos Ramírez');
    expect(wrapper.get('#kitchen-lunch-active-list').text()).toContain('María López');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(wrapper.find('#kitchen-lunch-active-list').exists()).toBe(false);
  });

  it('actualiza el navbar con SignalR y recoge empleados de todas las páginas', async () => {
    mocks.auth.isKitchen = true; mocks.auth.user = { id: 10, role: 'Kitchen', accountType: 'terminal' };
    mocks.api.branch.mockImplementation(async (_date: string | undefined, page: number) => ({
      items: page === 1 ? [idle(2)] : [{ ...idle(3), name: 'Andrés Rojas', activeLunch: lunch }],
      totalCount: 2, page, totalPages: 2,
    }));
    await show();
    expect(mocks.api.branch).toHaveBeenCalledWith(undefined, 2, 100);
    expect(wrapper.text()).toContain('Andrés Rojas');
    const listener = mocks.signalR.on.mock.calls.find(([event]) => event === 'EmployeeLunchChanged')![1];
    mocks.api.branch.mockResolvedValue({ items: [idle(2)], totalCount: 1, page: 1, totalPages: 1 });
    await listener(); await flushPromises();
    expect(wrapper.text()).not.toContain('Andrés Rojas');
  });
});

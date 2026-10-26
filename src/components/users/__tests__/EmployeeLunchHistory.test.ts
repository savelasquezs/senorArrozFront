import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';
import EmployeeLunchHistory from '../EmployeeLunchHistory.vue';

const mocks = vi.hoisted(() => ({
  auth: { isAdmin: false, isSuperadmin: false },
  api: { branch: vi.fn(), correct: vi.fn() },
  on: vi.fn(), off: vi.fn(),
}));
vi.mock('@/store/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({ on: mocks.on, off: mocks.off, connectionState: ref('connected') }) }));
vi.mock('@/services/MainAPI/employeeLunchApi', async original => ({ ...await original<object>(), employeeLunchApi: mocks.api }));
const lunch = { id: 7, startedAt: '2026-10-19T17:00:00Z', endedAt: '2026-10-19T17:35:00Z', updatedAt: '2026-10-19T17:35:00Z' };
const result = (name = 'Kelly', lunches: (typeof lunch)[] = [lunch]) => ({
  items: [{ userId: 11, name, role: 'Kitchen', lunches, activeLunch: null, serverTimeUtc: '2026-10-19T18:00:00Z' }],
  totalCount: 1, page: 1, totalPages: 1,
});
let wrapper: VueWrapper;
const show = async () => { wrapper = mount(EmployeeLunchHistory, { props: { branchId: 1 }, attachTo: document.body }); await flushPromises(); };
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.isAdmin = false; mocks.auth.isSuperadmin = false;
  mocks.api.branch.mockResolvedValue(result());
});
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; });

describe('historial de almuerzos', () => {
  it('permite al cajero consultar fechas y duraciones sin acciones de corrección', async () => {
    await show();
    expect(wrapper.text()).toContain('Kelly');
    expect(wrapper.text()).toContain('Cocina');
    expect(wrapper.text()).toContain('0:35');
    expect(wrapper.find('[aria-label^="Corregir almuerzo"]').exists()).toBe(false);
    await wrapper.get('input[type="date"]').setValue('2026-10-18');
    await flushPromises();
    expect(mocks.api.branch).toHaveBeenLastCalledWith('2026-10-18', 1, 50, expect.any(AbortSignal));
    expect(mocks.api.correct).not.toHaveBeenCalled();
  });

  it.each(['isAdmin', 'isSuperadmin'] as const)('permite a %s corregir con motivo y versión del registro', async role => {
    mocks.auth[role] = true;
    await show();
    await wrapper.get('[aria-label^="Corregir almuerzo"]').trigger('click');
    await flushPromises();
    const form = document.querySelector('form')!;
    expect(document.activeElement).toBe(form.querySelector('input'));
    form.querySelector('textarea')!.value = ' Olvidó registrar regreso ';
    form.querySelector('textarea')!.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(mocks.api.correct).toHaveBeenCalledWith(lunch, new Date(lunch.startedAt).toISOString(), new Date(lunch.endedAt).toISOString(), 'Olvidó registrar regreso');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra error recuperable y un estado vacío después del reintento', async () => {
    mocks.api.branch.mockRejectedValueOnce(new Error('Sin conexión'));
    await show();
    expect(wrapper.get('[role="alert"]').text()).toContain('Sin conexión');
    mocks.api.branch.mockResolvedValue({ items: [], totalCount: 0, totalPages: 0 });
    await wrapper.get('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Sin registros para esta fecha');
  });

  it('descarta respuestas de otra sucursal y actualiza por SignalR', async () => {
    let resolveOld!: (value: ReturnType<typeof result>) => void;
    mocks.api.branch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await show();
    mocks.api.branch.mockResolvedValue(result('Yoel'));
    await wrapper.setProps({ branchId: 2 });
    await flushPromises();
    resolveOld(result('Sucursal anterior'));
    await flushPromises();
    expect(wrapper.text()).toContain('Yoel');
    expect(wrapper.text()).not.toContain('Sucursal anterior');
    const listener = mocks.on.mock.calls.find(([event]) => event === 'EmployeeLunchChanged')![1];
    mocks.api.branch.mockResolvedValue(result('Yoel actualizado'));
    await listener(); await flushPromises();
    expect(wrapper.text()).toContain('Yoel actualizado');
  });

  it('no reintenta automáticamente una corrección rechazada por concurrencia', async () => {
    mocks.auth.isAdmin = true;
    mocks.api.correct.mockRejectedValue(new Error('El registro cambió. Vuelve a consultarlo.'));
    await show();
    await wrapper.get('[aria-label^="Corregir almuerzo"]').trigger('click');
    await flushPromises();
    const form = document.querySelector('form')!;
    const input = form.querySelector('textarea')!;
    input.value = 'Ajuste'; input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('El registro cambió');
    expect(mocks.api.correct).toHaveBeenCalledTimes(1);
  });
});

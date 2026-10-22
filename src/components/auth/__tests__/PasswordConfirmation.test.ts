import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PasswordConfirmation from '../PasswordConfirmation.vue';
const mocked = vi.hoisted(() => ({ auth: null as any }));
vi.mock('@/store/auth', () => ({ useAuthStore: () => mocked.auth }));
let wrapper: VueWrapper;
beforeEach(() => { mocked.auth = reactive({ user: { id: 7 }, userName: 'Persona' }); });
afterEach(() => wrapper?.unmount());
function show(action = vi.fn().mockResolvedValue(undefined)) {
  wrapper = mount(PasswordConfirmation, { props: { modelValue: true, description: 'Enviar permiso', action }, global: {
    stubs: {
      BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
      BaseButton: { props: ['type', 'disabled'], template: '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
    }
  } }); return action;
}
async function enter(value: string) { await wrapper.get('input').setValue(value); }
async function submit() { await wrapper.get('form').trigger('submit'); await flushPromises(); }
describe('confirmación de contraseña', () => {
  it('limpia la contraseña al enviar y bloquea escrituras duplicadas', async () => {
    let finish!: () => void;
    const action = show(vi.fn(() => new Promise<void>(resolve => { finish = resolve; })));
    await enter('  personal-password  '); await submit(); await submit();
    expect(action).toHaveBeenCalledExactlyOnceWith('  personal-password  ');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    finish(); await flushPromises(); expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
  });
  it('un error conserva el diálogo pero exige volver a escribir la contraseña', async () => {
    const action = show(vi.fn().mockRejectedValue(new Error('Contraseña incorrecta')));
    await enter('wrong'); await submit();
    expect(wrapper.get('[role="alert"]').text()).toBe('Contraseña incorrecta');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    await submit(); expect(action).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
  it('cancelar no ejecuta la acción', async () => {
    const action = show(); await enter('secret'); await wrapper.get('button[type="button"]').trigger('click');
    expect(action).not.toHaveBeenCalled(); expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
  });
  it('cambiar de usuario descarta la confirmación anterior', async () => {
    const action = show(); await enter('secret'); mocked.auth.user = { id: 8 }; await flushPromises();
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    await enter('another-password'); await submit(); expect(action).not.toHaveBeenCalled();
  });
  it('cerrar y reabrir no conserva secretos ni errores', async () => {
    show(); await enter('secret'); await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({ modelValue: true });
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
  });
});

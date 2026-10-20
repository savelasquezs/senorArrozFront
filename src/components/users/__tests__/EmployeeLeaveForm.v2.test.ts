import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmployeeLeaveForm from '@/components/users/EmployeeLeaveForm.vue';
import PasswordConfirmation from '@/components/auth/PasswordConfirmation.vue';
import LeaveAttachmentsPicker from '@/components/users/LeaveAttachmentsPicker.vue';
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue';
import { useAuthStore } from '@/store/auth';

const mocks = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/services/MainAPI/employeeLeaveApi', () => ({ employeeLeaveApi: { save: mocks.save } }));
vi.mock('@/store/auth', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: { id: 7 }, userName: 'Persona de prueba', branchName: 'Sucursal de prueba' });
  return { useAuthStore: () => state };
});
vi.mock('@/store/employeeLeaves', () => ({ useEmployeeLeavesStore: () => ({
  invalidate: mocks.invalidate, loadKinds: async () => {}, kinds: [
    { code: 'medical_appointment', label: 'Cita médica', paidByCompanyPolicy: true, evidence: [
      { code: 'appointment', label: 'Confirmación de cita', stage: 'before', required: true },
      { code: 'attendance', label: 'Constancia de asistencia', stage: 'after', required: true }] },
    { code: 'medical_emergency', label: 'Urgencia médica', paidByCompanyPolicy: true,
      evidence: [{ code: 'care', label: 'Constancia de atención', stage: 'after', required: true }] },
    { code: 'personal_errand', label: 'Diligencia personal', paidByCompanyPolicy: false, evidence: [] },
  ],
}) }));
const stubs = {
  teleport: true,
  BaseDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>' },
  BaseSelect: { props: ['modelValue', 'options', 'valueKey', 'displayKey', 'label', 'disabled'], emits: ['update:modelValue'],
    template: '<label>{{ label }}<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">Seleccionar</option><option v-for="option in options" :value="option[valueKey]">{{ option[displayKey] }}</option></select></label>' },
  BaseDateTimePicker: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>' },
  BaseDatePicker: { name: 'BaseDatePicker', props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  LeaveAttachmentsPicker: { name: 'LeaveAttachmentsPicker', props: ['modelValue', 'requirements', 'existing'], emits: ['update:modelValue'], template: '<div data-test="file-picker" />' },
  PasswordConfirmation: { name: 'PasswordConfirmation', props: ['modelValue', 'action', 'description'], template: '<div data-test="password-confirmation" />' },
};
async function open() {
  const wrapper = mount(EmployeeLeaveForm, { props: { modelValue: false }, global: { stubs } });
  await wrapper.setProps({ modelValue: true }); await flushPromises(); return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks(); (useAuthStore() as any).user = { id: 7 };
  mocks.save.mockResolvedValue({ publicId: 'a8e08165-42a1-42d9-a7dc-79e695207f74' });
});
describe('solicitud v2', () => {
  it('no mezcla motivos antes de elegir remuneración', async () => {
    const wrapper = await open();
    expect(wrapper.find('select').exists()).toBe(false);
    await wrapper.find('input[value="paid"]').setValue();
    expect(wrapper.find('select').text()).toContain('Cita médica');
    expect(wrapper.find('select').text()).not.toContain('Diligencia personal');
    await wrapper.find('input[value="unpaid"]').setValue();
    expect(wrapper.find('select').text()).toContain('Diligencia personal');
    expect(wrapper.find('select').text()).not.toContain('Cita médica');
    wrapper.unmount();
  });
  it('exige el soporte previo pero no pide la constancia posterior antes de asistir', async () => {
    const wrapper = await open();
    await wrapper.find('input[value="paid"]').setValue(); await wrapper.find('select').setValue('medical_appointment');
    await wrapper.find('textarea').setValue('Asistir a una cita programada.');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Adjunta antes de enviar: Confirmación de cita.');
    expect(wrapper.findComponent(PasswordConfirmation).props('modelValue')).toBe(false);
    wrapper.findComponent(LeaveAttachmentsPicker).vm.$emit('update:modelValue', [{ uploadKey: 'stable-upload', evidenceCode: 'appointment', file: new File(['%PDF-1.7'], 'cita.pdf', { type: 'application/pdf' }) }]);
    await flushPromises(); await wrapper.find('form').trigger('submit');
    expect(wrapper.findComponent(PasswordConfirmation).props('modelValue')).toBe(true);
    const action = wrapper.findComponent(PasswordConfirmation).props('action');
    await action('current-password');
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][2][0].evidenceCode).toBe('appointment');
    expect(mocks.save.mock.calls[0][1].requestedIsPaid).toBe(true);
    wrapper.unmount();
  });
  it('permite avisar de una urgencia sin un archivo imposible de aportar antes', async () => {
    const wrapper = await open();
    await wrapper.find('input[value="paid"]').setValue(); await wrapper.find('select').setValue('medical_emergency');
    await wrapper.find('textarea').setValue('Aviso de atención urgente.'); await wrapper.find('form').trigger('submit');
    expect(wrapper.findComponent(PasswordConfirmation).props('modelValue')).toBe(true);
    wrapper.unmount();
  });
  it('convierte un día completo a medianoche de Colombia con fin exclusivo', async () => {
    const wrapper = await open();
    await wrapper.find('input[value="unpaid"]').setValue(); await wrapper.find('select').setValue('personal_errand');
    await wrapper.find('input[value="days"]').setValue();
    const dates = wrapper.findAllComponents(BaseDatePicker);
    dates[0].vm.$emit('update:modelValue', '2026-10-21'); dates[1].vm.$emit('update:modelValue', '2026-10-21');
    await wrapper.find('textarea').setValue('Diligencia personal.'); await flushPromises();
    await wrapper.find('form').trigger('submit');
    await wrapper.findComponent(PasswordConfirmation).props('action')('current-password');
    expect(mocks.save.mock.calls[0][1]).toMatchObject({ startsAt: '2026-10-21T05:00:00.000Z', endsAt: '2026-10-22T05:00:00.000Z', isAllDay: true, requestedIsPaid: false });
    expect(wrapper.text()).toContain('1 día completo'); wrapper.unmount();
  });
  it('descarta archivos al cambiar de categoría y al cambiar de identidad', async () => {
    const wrapper = await open();
    await wrapper.find('input[value="paid"]').setValue(); await wrapper.find('select').setValue('medical_appointment');
    wrapper.findComponent(LeaveAttachmentsPicker).vm.$emit('update:modelValue', [{ uploadKey: 'upload', evidenceCode: 'appointment', file: new File(['pdf'], 'cita.pdf') }]);
    await flushPromises(); await wrapper.find('input[value="unpaid"]').setValue();
    await wrapper.find('select').setValue('personal_errand');
    expect(wrapper.findComponent(LeaveAttachmentsPicker).props('modelValue')).toEqual([]);
    (useAuthStore() as any).user = { id: 8 }; await flushPromises();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    expect(mocks.save).not.toHaveBeenCalled(); wrapper.unmount();
  });
});

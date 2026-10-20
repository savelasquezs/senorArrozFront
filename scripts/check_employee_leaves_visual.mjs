// Visual regression evidence uses real Vue views, controls and CSS, never production data or credentials.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from 'playwright';

const root = process.cwd(), temp = resolve(root, '.leave-visual-tmp'), output = resolve(root, 'test-results/leave-visual');
const id = '98e08165-42a1-42d9-a7dc-79e695207f74';
await mkdir(temp, { recursive: true }); await mkdir(output, { recursive: true });
const rules = [
  { code: 'appointment', label: 'Confirmación de cita', required: true, stage: 'before', instructions: 'Adjunta la confirmación de la cita programada.' },
  { code: 'attendance', label: 'Constancia de asistencia', required: true, stage: 'after', instructions: 'Entrega la constancia después de asistir.' },
];
const kinds = [
  { code: 'medical_appointment', label: 'Cita médica', paidByCompanyPolicy: true, evidence: rules,
    description: 'Adjunta la confirmación de la cita. Al regresar, entrega la constancia de asistencia, sin diagnóstico ni historia clínica.' },
  { code: 'medical_emergency', label: 'Urgencia médica propia o familiar', paidByCompanyPolicy: true,
    description: 'Puedes avisar ahora y presentar la constancia de atención después.', evidence: [{ ...rules[1], code: 'care', label: 'Constancia de atención' }] },
  { code: 'personal_errand', label: 'Diligencia personal', paidByCompanyPolicy: false, evidence: [], description: 'Explica brevemente la diligencia y el tiempo que necesitas.' },
];
const request = { publicId: id, userId: 8, branchId: 1, branchName: 'Sucursal de prueba', applicantName: 'Empleado de prueba', applicantRole: 'Kitchen', kind: 'medical_appointment', status: 'pending',
  startsAt: '2026-10-21T14:00:00Z', endsAt: '2026-10-21T16:30:00Z', createdAt: '2026-10-20T14:00:00Z', updatedAt: '2026-10-20T14:00:00Z', version: 1, isUnread: true,
  isAllDay: false, requestedIsPaid: true, isPaid: null, supportStatus: 'pending' };
const detail = { request, documentNumber: null, justification: 'Asistir a una cita programada y regresar al trabajo al finalizar. Datos ficticios para revisar la interfaz.',
  isPaid: null, decisionReason: null, decidedAt: null, decidedByName: null, supportRequired: true, supportDueAt: null, supportStatus: 'pending',
  returnedAt: null, returnVerifiedAt: null, verificationReason: null, canEdit: false, canReview: true, canCancel: true, canReturn: false, hasReviewer: true,
  attachments: [{ id: 1, fileName: 'confirmacion-cita.pdf', contentType: 'application/pdf', size: 42150, createdAt: request.createdAt, evidenceCode: 'appointment', reviewStatus: 'submitted', supersededAt: null }],
  evidenceRequirements: rules.map(rule => ({ ...rule, status: rule.stage === 'before' ? 'submitted' : 'missing' })), policyVersion: 2 };
const rows = [request, { ...request, publicId: '79aa29c2-bf3d-43a4-ab04-683ad36ccce8', kind: 'personal_errand', status: 'approved', requestedIsPaid: false, isPaid: false, supportStatus: 'not_required',
  startsAt: '2026-10-23T05:00:00Z', endsAt: '2026-10-24T05:00:00Z', isAllDay: true, isUnread: false }];
const fake = `import { reactive } from 'vue';
const kinds = ${JSON.stringify(kinds)};
const auth = reactive({ user: { id: 7, accountType: 'personal' }, userName: 'Usuario de prueba', branchName: 'Sucursal de prueba', isAuthenticated: true, isAdmin: false, isSuperadmin: true });
const leaves = reactive({ kinds, summary: { unread: 1, pendingReview: 1 }, isTerminal: false, canReview: true, loadKinds: async () => {}, refreshSummary: async () => {}, invalidate: () => {} });
export const useAuthStore = () => auth;
export const useEmployeeLeavesStore = () => leaves;
export const useBranchContextStore = () => ({ options: [{ id: 1, name: 'Sucursal de prueba' }], selectedBranchId: 1 });
export const useEmployeeLeaveUpdates = () => {};
export const employeeLeaveApi = {
  list: async () => ({ items: ${JSON.stringify(rows)}, totalCount: 2, page: 1, pageSize: 20, totalPages: 1 }),
  detail: async () => (${JSON.stringify(detail)}),
  history: async () => ({ items: [{ id: 1, operation: 'created', changedAt: '${request.createdAt}', actorName: 'Empleado de prueba', reason: 'Solicitud y soporte recibidos.' }], totalCount: 1, page: 1, totalPages: 1 }),
  read: async () => {}, summary: async () => ({ unread: 1, pendingReview: 1 }), catalog: async () => kinds,
  save: async () => { throw new Error('Visual fixture cannot write requests'); },
  change: async () => { throw new Error('Visual fixture cannot write decisions'); },
};`;
await writeFile(resolve(temp, 'fixtures.ts'), fake);
await writeFile(resolve(temp, 'Layout.vue'), '<template><main class="min-h-screen bg-gray-50 p-4 md:p-8"><slot /></main></template>');
await writeFile(resolve(temp, 'entry.ts'), `import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import '@/style.css';
import List from '@/views/EmployeeLeavesView.vue';
import Detail from '@/views/EmployeeLeaveDetailView.vue';
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/permisos', component: List }, { path: '/permisos/:publicId', component: Detail }] });
await router.push(location.search.includes('detail') ? '/permisos/${id}' : '/permisos?tab=review');
const app = createApp({ render: () => h(RouterView) });
app.use(createPinia()).use(router).mount('#app');`);
await writeFile(resolve(temp, 'index.html'), '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Permisos · revisión aislada</title></head><body><div id="app"></div><script type="module" src="/.leave-visual-tmp/entry.ts"></script></body></html>');
const aliases = ['@/store/auth', '@/store/employeeLeaves', '@/store/branchContext', '@/services/MainAPI/employeeLeaveApi', '@/composables/useEmployeeLeaveUpdates']
  .map(find => ({ find, replacement: resolve(temp, 'fixtures.ts') }));
aliases.push({ find: '@/components/layout/MainLayout.vue', replacement: resolve(temp, 'Layout.vue') }, { find: '@', replacement: resolve(root, 'src') });
const server = await createServer({ configFile: false, root, plugins: [vue(), tailwindcss()], resolve: { alias: aliases }, server: { host: '127.0.0.1', port: 4173, strictPort: true } });
let browser, page;
const errors = [];
try {
  await server.listen(); browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-CO', timezoneId: 'America/Bogota', reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(15000);
  const url = 'http://127.0.0.1:4173/.leave-visual-tmp/index.html';
  async function capture(name, fullPage = false) {
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: horizontal overflow`);
    await page.screenshot({ path: resolve(output, name + '.png'), fullPage, animations: 'disabled' });
  }
  async function openForm() {
    await page.getByRole('button', { name: 'Solicitar permiso', exact: true }).click();
    await page.locator('input[type=radio][value=paid]').check();
    // The shared select's associated label is its accessible name, not the placeholder text.
    await page.getByRole('button', { name: /Motivo del permiso/ }).click();
    await page.locator('body > div').getByText('Cita médica', { exact: true }).last().click();
    await page.locator('textarea').fill('Necesito asistir a una cita médica programada. Regresaré cuando finalice.');
    await page.locator('input[type=file]').setInputFiles({ name: 'confirmacion-cita.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nVisual fixture only') });
  }
  await page.goto(url); await page.getByRole('heading', { name: 'Permisos laborales', exact: true }).waitFor();
  await capture('01-desktop-inbox', true);
  await openForm(); await capture('02-desktop-request-hours');
  await page.locator('.leave-datetime .dp__input').first().click();
  await page.locator('.dp__menu').first().waitFor(); await capture('03-datepicker-over-dialog');
  await page.goto(url);
  await page.getByRole('heading', { name: 'Permisos laborales', exact: true }).waitFor();
  await openForm();
  await page.getByRole('radiogroup', { name: 'Duración' }).getByText('Días completos', { exact: true }).click();
  await capture('04-desktop-complete-days');
  await page.getByRole('button', { name: 'Revisar y enviar', exact: true }).click();
  await page.getByRole('heading', { name: 'Confirmar contraseña', exact: true }).waitFor();
  await capture('05-password-confirmation');
  await page.goto(url + '?detail=1'); await page.getByRole('heading', { name: 'Datos de la solicitud', exact: true }).waitFor();
  await capture('06-desktop-detail', true);
  await page.getByRole('button', { name: 'Verificar documento', exact: true }).click();
  await capture('07-document-review');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url); await page.getByRole('heading', { name: 'Permisos laborales', exact: true }).waitFor();
  await capture('08-mobile-inbox', true);
  await openForm(); await capture('09-mobile-request');
  const footer = await page.getByRole('button', { name: 'Revisar y enviar', exact: true }).boundingBox();
  assert.ok(footer && footer.y >= 0 && footer.y + footer.height <= 844, 'mobile submit footer must remain visible');
  await page.getByRole('dialog').locator('.overflow-y-auto').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await capture('10-mobile-documents');
  await page.goto(url + '?detail=1'); await page.getByRole('heading', { name: 'Datos de la solicitud', exact: true }).waitFor();
  await capture('11-mobile-detail', true);
  assert.deepEqual(errors, [], 'unexpected browser exceptions');
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ realViews: true, syntheticDataOnly: true, viewports: [1440, 390], horizontalOverflow: false, mobileFooterVisible: true, browserErrors: errors }, null, 2));
  console.log('Employee leave visual smoke passed; screenshots contain synthetic fixtures only.');
} catch (error) {
  console.error(error);
  if (page) await page.screenshot({ path: resolve(output, 'failed-screen.png'), fullPage: true }).catch(() => {});
  await writeFile(resolve(output, 'errors.json'), JSON.stringify({ error: String(error), browserErrors: errors }, null, 2));
  throw error;
} finally { await browser?.close(); await server.close(); await rm(temp, { recursive: true, force: true }); }

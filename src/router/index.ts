import { createRouter, createWebHistory, type RouteRecordRaw, type RouteRecordSingleView } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { hasAccessToken } from '@/services/auth/authSession';
import { accountCanVisit, accountHome, safeReturnPath } from '@/helpers/employeeAccountAccess';
import Login from '@/views/Login.vue';
import MainLayout from '@/components/layout/MainLayout.vue';

const admin = ['Superadmin', 'Admin'];
const office = [...admin, 'Cashier'];
const everybody = [...office, 'Kitchen', 'Deliveryman'];
function page(path: string, name: string, component: RouteRecordSingleView['component'], title: string,
  roles?: string[], requiresAuth = true): RouteRecordRaw {
  return { path, name, component, meta: { requiresAuth, requiresRole: roles, title,
    noCard: ['Dashboard', 'OrdersNew', 'OrderDetail', 'WhatsApp', 'WhatsAppTemplates'].includes(name),
    hideQuickOrder: ['Dashboard', 'EmployeeLunches', 'EmployeeLeaves', 'EmployeeLeaveDetail', 'Inventario'].includes(name),
  } };
}
const routes: RouteRecordRaw[] = [
  page('/settings/electronic-invoicing', 'BusinessInvoicing', () => import('@/views/BusinessInvoicing.vue'), 'Facturación electrónica', ['Superadmin']),
  { path: '/', redirect: '/login' },
  page('/login', 'Login', Login, 'Iniciar Sesión', undefined, false),
  page('/forgot-password', 'ForgotPassword', () => import('@/views/ForgotPassword.vue'), 'Recuperar Contraseña', undefined, false),
  page('/reset-password', 'ResetPassword', () => import('@/views/ResetPassword.vue'), 'Restablecer Contraseña', undefined, false),
  page('/change-password', 'ChangePassword', () => import('@/views/ChangePassword.vue'), 'Cambiar Contraseña'),
  page('/dashboard', 'Dashboard', () => import('@/views/Dashboard.vue'), 'Dashboard', admin),
  page('/branches', 'BranchesList', () => import('@/views/BranchesList.vue'), 'Sucursales', ['Superadmin']),
  page('/branches/:id', 'BranchDetail', () => import('@/views/BranchDetail.vue'), 'Detalle Sucursal', admin),
  page('/almuerzos', 'EmployeeLunches', () => import('@/views/EmployeeLunchesView.vue'), 'Almuerzos', office),
  page('/permisos', 'EmployeeLeaves', () => import('@/views/EmployeeLeavesView.vue'), 'Permisos laborales', everybody),
  page('/permisos/:publicId', 'EmployeeLeaveDetail', () => import('@/views/EmployeeLeaveDetailView.vue'), 'Detalle de permiso', everybody),
  page('/customers', 'CustomersList', () => import('@/views/CustomersList.vue'), 'Clientes', office),
  { path: '/customers/:id(\\d+)', redirect: to => ({ path: '/customers', query: { ...to.query, detail: String(to.params.id) } }) },
  page('/products', 'ProductsList', () => import('@/views/ProductsList.vue'), 'Productos', admin),
  { path: '/products/:id(\\d+)', redirect: to => ({ path: '/products', query: { detail: String(to.params.id) } }) },
  page('/product-categories', 'ProductCategoriesList', () => import('@/views/ProductCategoriesList.vue'), 'Categorías de Productos', admin),
  page('/banks/:id', 'BankDetail', () => import('@/views/BankDetail.vue'), 'Detalle Banco', admin),
  page('/apps/:id', 'AppDetail', () => import('@/views/AppDetail.vue'), 'Detalle App', admin),
  page('/orders', 'OrdersList', () => import('@/views/OrdersList.vue'), 'Lista de Pedidos', office),
  page('/orders/new', 'OrdersNew', () => import('@/views/Orders.vue'), 'Nuevo Pedido', office),
  page('/orders/:id', 'OrderDetail', () => import('@/views/OrderDetail.vue'), 'Detalle del Pedido', office),
  page('/kitchen', 'Kitchen', () => import('@/views/KitchenView.vue'), 'Cocina', [...admin, 'Kitchen']),
  page('/delivery', 'Delivery', () => import('@/views/DeliveryView.vue'), 'Domicilios', [...admin, 'Deliveryman']),
  page('/deliverymen', 'DeliverymenManagement', () => import('@/views/DeliverymenManagementView.vue'), 'Gestión de Domiciliarios', office),
  page('/expenses', 'Expenses', () => import('@/views/ExpensesView.vue'), 'Gastos', office),
  page('/inventory', 'Inventario', () => import('@/views/InventoryView.vue'), 'Inventario', admin),
  page('/expenses/menu-attribution', 'ExpenseMenuAttribution', () => import('@/views/ExpenseMenuAttributionView.vue'), 'Imputación gastos — menú', admin),
  page('/cash-register', 'CashRegister', () => import('@/views/CashRegisterView.vue'), 'Cuadre de Caja', office),
  page('/delivery-incidents', 'DeliveryTrackingIncidents', () => import('@/views/DeliveryTrackingIncidentsView.vue'), 'Revisión de seguimiento', admin),
  page('/delivery-alerts', 'DeliveryTrackingAlerts', () => import('@/views/DeliveryTrackingAlertsView.vue'), 'Alertas de seguimiento', admin),
  page('/integrations/apps/rappi', 'RappiOrders', () => import('@/views/RappiOrdersView.vue'), 'Pedidos Rappi', office),
  page('/whatsapp', 'WhatsApp', () => import('@/views/WhatsAppView.vue'), 'WhatsApp', office),
  page('/whatsapp/templates', 'WhatsAppTemplates', () => import('@/views/WhatsAppTemplatesView.vue'), 'Plantillas WhatsApp', office),
  page('/whatsapp/settings', 'WhatsAppChannelSettings', () => import('@/views/WhatsAppChannelSettingsView.vue'), 'Canal central de WhatsApp', admin),
  page('/profile', 'Profile', () => import('@/views/Profile.vue'), 'Perfil'),
  page('/documents', 'BusinessDocuments', () => import('@/views/BusinessDocumentsView.vue'), 'Documentos corporativos', everybody),
  page('/blog-seo', 'BlogPublishing', () => import('@/views/BlogPublishingView.vue'), 'Blog / SEO', ['Superadmin']),
];
const authenticatedRoutes = routes.filter(route => route.meta?.requiresAuth);
const router = createRouter({ history: createWebHistory(), routes: [
  ...routes.filter(route => !route.meta?.requiresAuth),
  { path: '/', name: 'AuthenticatedLayout', component: MainLayout, children: authenticatedRoutes },
],
  scrollBehavior(_to, _from, savedPosition) { return savedPosition ?? { top: 0 }; },
});
let accountRefresh: Promise<boolean> | undefined;
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore(), branches = useBranchContextStore();
  if (!auth.isAuthenticated && hasAccessToken()) auth.initializeAuth();
  document.title = to.meta.title ? `${to.meta.title} - Señor Arroz` : 'Señor Arroz';
  // La sesión anterior a la migración consulta el tipo real; no lo deduce del rol Kitchen.
  if (auth.isAuthenticated && auth.isKitchen && !auth.user?.accountType) {
    accountRefresh ??= auth.refreshAccessToken().finally(() => { accountRefresh = undefined; });
    await accountRefresh;
    if (auth.isAuthenticated && !auth.user?.accountType) await auth.logout();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    branches.reset(); return next({ path: '/login', query: { redirect: to.fullPath } });
  }
  if (auth.isAuthenticated && auth.user) {
    try { await branches.initializeForUser(auth.user); }
    catch (error) { console.error('No se pudo inicializar el contexto de sucursal:', error); }
  }
  if (auth.isSuperadmin && branches.isInitialized && !branches.hasBranches && !to.path.startsWith('/branches') && !to.path.startsWith('/permisos')) return next('/branches');
  if (to.path === '/login' && auth.isAuthenticated) {
    const target = safeReturnPath(to.query.redirect);
    return next(target && router.resolve(target).matched.length ? target : accountHome(auth.user));
  }
  if (to.meta.requiresAuth && auth.user && !accountCanVisit(auth.user, to.path)) return next(accountHome(auth.user));
  if (Array.isArray(to.meta.requiresRole) && (!auth.userRole || !to.meta.requiresRole.includes(auth.userRole))) return next(accountHome(auth.user));
  next();
});
export default router;

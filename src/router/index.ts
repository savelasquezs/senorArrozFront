// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { hasAccessToken } from '@/services/auth/authSession'
import { UserRole } from '@/types/auth'
import { bootstrapOrderCatalog } from '@/utils/orderCatalogBootstrap'
import { usePlatformStore } from '@/store/platform'
import { useTenantCapabilitiesStore } from '@/store/tenantCapabilities'
import PlatformLayout from '@/components/platform/PlatformLayout.vue'

// Import views
import Login from '@/views/Login.vue'
// import Dashboard from '@/views/Dashboard.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: {
            requiresAuth: false,
            title: 'Iniciar Sesión'
        }
    },
    {
        path: '/platform/login',
        name: 'PlatformLogin',
        component: () => import('@/views/platform/PlatformLogin.vue'),
        meta: { platformGuest: true, title: 'Acceso plataforma' }
    },
    {
        path: '/platform',
        component: PlatformLayout,
        redirect: '/platform/clients',
        meta: { requiresPlatformAuth: true },
        children: [
            { path: 'clients', name: 'PlatformClients', component: () => import('@/views/platform/PlatformClientsView.vue'), meta: { requiresPlatformAuth: true, title: 'Clientes SaaS' } },
            { path: 'plans', name: 'PlatformPlans', component: () => import('@/views/platform/PlatformPlansView.vue'), meta: { requiresPlatformAuth: true, title: 'Planes SaaS' } },
            { path: 'settings', name: 'PlatformSettings', component: () => import('@/views/platform/PlatformSettingsView.vue'), meta: { requiresPlatformAuth: true, title: 'Configuración SaaS' } },
            { path: 'audit', name: 'PlatformAudit', component: () => import('@/views/platform/PlatformAuditView.vue'), meta: { requiresPlatformAuth: true, title: 'Auditoría SaaS' } },
            { path: 'devices', name: 'PlatformDevices', component: () => import('@/views/platform/PlatformDevicesView.vue'), meta: { requiresPlatformAuth: true, title: 'Dispositivos SaaS' } }
        ]
    },
    {
        path: '/accept-invitation',
        name: 'AcceptTenantInvitation',
        component: () => import('@/views/AcceptTenantInvitation.vue'),
        meta: { title: 'Activar empresa' }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/views/ForgotPassword.vue'),
        meta: {
            requiresAuth: false,
            title: 'Recuperar Contraseña'
        }
    },
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('@/views/ResetPassword.vue'),
        meta: {
            requiresAuth: false,
            title: 'Restablecer Contraseña'
        }
    },
    {
        path: '/change-password',
        name: 'ChangePassword',
        component: () => import('@/views/ChangePassword.vue'),
        meta: {
            requiresAuth: true,
            title: 'Cambiar Contraseña'
        }
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            requiresModule: 'basic_dashboard',
            title: 'Dashboard'
        }
    },
    {
        path: '/branches',
        name: 'BranchesList',
        component: () => import('@/views/BranchesList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN],
            requiresModule: 'multi_branch',
            title: 'Sucursales'
        }
    },
    {
        path: '/branches/:id',
        name: 'BranchDetail',
        component: () => import('@/views/BranchDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Detalle Sucursal'
        }
    },
    {
        path: '/customers',
        name: 'CustomersList',
        component: () => import('@/views/CustomersList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            requiresModule: 'customers',
            title: 'Clientes'
        }
    },
    {
        path: '/customers/:id(\\d+)',
        redirect: to => ({
            path: '/customers',
            query: { ...to.query, detail: String(to.params.id) }
        })
    },
    {
        path: '/products',
        name: 'ProductsList',
        component: () => import('@/views/ProductsList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            requiresModule: 'catalog',
            title: 'Productos'
        }
    },
    {
        path: '/products/:id(\\d+)',
        redirect: to => ({
            path: '/products',
            query: { detail: String(to.params.id) }
        })
    },
    {
        path: '/product-categories',
        name: 'ProductCategoriesList',
        component: () => import('@/views/ProductCategoriesList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Categorías de Productos'
        }
    },
    {
        path: '/banks/:id',
        name: 'BankDetail',
        component: () => import('@/views/BankDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Detalle Banco'
        }
    },
    {
        path: '/apps/:id',
        name: 'AppDetail',
        component: () => import('@/views/AppDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Detalle App'
        }
    },
    {
        path: '/orders',
        name: 'OrdersList',
        component: () => import('@/views/OrdersList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Lista de Pedidos'
        }
    },
    {
        path: '/orders/new',
        name: 'OrdersNew',
        component: () => import('@/views/Orders.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Nuevo Pedido'
        }
    },
    {
        path: '/orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/OrderDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Detalle del Pedido'
        }
    },
    // {
    //     path: '/delivery',
    //     name: 'Delivery',
    //     component: () => import('@/views/DeliveryView.vue'),
    //     meta: {
    //         requiresAuth: true,
    //         requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.DELIVERYMAN],
    //         title: 'Módulo de Domicilios'
    //     }
    // },


    //   {
    //     path: '/orders',
    //     name: 'Orders',
    //     component: () => import('@/views/Orders.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin', 'Cashier'],
    //       title: 'Pedidos'
    //     }
    //   },
    {
        path: '/kitchen',
        name: 'Kitchen',
        component: () => import('@/views/KitchenView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.KITCHEN, UserRole.ADMIN, UserRole.SUPERADMIN],
            requiresModule: 'kitchen',
            title: 'Cocina'
        }
    },
    {
        path: '/delivery',
        name: 'Delivery',
        component: () => import('@/views/DeliveryView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.DELIVERYMAN, UserRole.ADMIN, UserRole.SUPERADMIN],
            title: 'Domicilios'
        }
    },
    {
        path: '/deliverymen',
        name: 'DeliverymenManagement',
        component: () => import('@/views/DeliverymenManagementView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            requiresModule: 'expenses',
            title: 'Gestión de Domiciliarios'
        }
    },
    //   {
    //     path: '/customers',
    //     name: 'Customers',
    //     component: () => import('@/views/Customers.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin', 'Cashier'],
    //       title: 'Clientes'
    //     }
    //   },
    //   {
    //     path: '/products',
    //     name: 'Products',
    //     component: () => import('@/views/Products.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin'],
    //       title: 'Productos'
    //     }
    //   },
    {
        path: '/expenses',
        name: 'Expenses',
        component: () => import('@/views/ExpensesView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Gastos'
        }
    },
    {
        path: '/expenses/menu-attribution',
        name: 'ExpenseMenuAttribution',
        component: () => import('@/views/ExpenseMenuAttributionView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            requiresModule: 'cost_attribution',
            title: 'Imputación gastos — menú'
        }
    },
    {
        path: '/cash-register',
        name: 'CashRegister',
        component: () => import('@/views/CashRegisterView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            requiresModule: 'cash_register',
            title: 'Cuadre de Caja'
        }
    },
    {
        path: '/delivery-incidents',
        name: 'DeliveryTrackingIncidents',
        component: () => import('@/views/DeliveryTrackingIncidentsView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            requiresModule: 'delivery_tracking',
            title: 'Revisión de seguimiento'
        }
    },
    {
        path: '/delivery-alerts',
        name: 'DeliveryTrackingAlerts',
        component: () => import('@/views/DeliveryTrackingAlertsView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            requiresModule: 'delivery_tracking',
            title: 'Alertas de seguimiento'
        }
    },
    {
        path: '/integrations/apps/rappi',
        name: 'RappiOrders',
        component: () => import('@/views/RappiOrdersView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            requiresAddon: 'rappi',
            title: 'Pedidos Rappi'
        }
    },
    {
        path: '/whatsapp',
        name: 'WhatsApp',
        component: () => import('@/views/WhatsAppView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            requiresAddon: 'whatsapp_ai',
            title: 'WhatsApp'
        }
    },
    {
        path: '/whatsapp/templates',
        name: 'WhatsAppTemplates',
        component: () => import('@/views/WhatsAppTemplatesView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Plantillas WhatsApp'
        }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: {
            requiresAuth: true,
            title: 'Perfil'
        }
    },
    {
        path: '/documents',
        name: 'BusinessDocuments',
        component: () => import('@/views/BusinessDocumentsView.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [
                UserRole.SUPERADMIN,
                UserRole.ADMIN,
                UserRole.CASHIER,
                UserRole.KITCHEN,
                UserRole.DELIVERYMAN
            ],
            requiresModule: 'business_documents',
            title: 'Documentos corporativos'
        }
    },
    //   // 404 page
    //   {
    //     path: '/:pathMatch(.*)*',
    //     name: 'NotFound',
    //     component: () => import('@/views/NotFound.vue'),
    //     meta: {
    //       title: 'Página no encontrada'
    //     }
    //   }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        }
        return { top: 0 }
    }
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
	const authStore = useAuthStore()
	const branchContext = useBranchContextStore()
	const platformStore = usePlatformStore()
	const capabilities = useTenantCapabilitiesStore()

    if (to.meta.requiresPlatformAuth || to.meta.platformGuest) {
        await platformStore.restore()
        if (to.meta.requiresPlatformAuth && !platformStore.authenticated) return next('/platform/login')
        if (to.meta.platformGuest && platformStore.authenticated) return next('/platform/clients')
        document.title = to.meta.title ? `${to.meta.title} - Plataforma` : 'Plataforma SaaS'
        return next()
    }

	// Initialize auth state if not already done
	if (!authStore.isAuthenticated && hasAccessToken()) {
		authStore.initializeAuth()
	}

    // Set page title
    document.title = to.meta.title ? `${to.meta.title} - Señor Arroz` : 'Señor Arroz'

    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        branchContext.reset()
        return next('/login')
    }

    if (authStore.isAuthenticated && authStore.user) {
        try {
            await capabilities.initialize()
            await branchContext.initializeForUser(authStore.user)
            await bootstrapOrderCatalog(authStore.userRole, branchContext.selectedBranchId)
        } catch (error) {
            console.error('No se pudo inicializar el contexto de sucursal:', error)
        }
    }

    if (to.meta.requiresModule && !capabilities.hasModule(String(to.meta.requiresModule))) return next(getRedirectPath(authStore.userRole))
    if (to.meta.requiresAddon && !capabilities.hasAddon(String(to.meta.requiresAddon))) return next(getRedirectPath(authStore.userRole))

    if (
        authStore.isSuperadmin
        && branchContext.isInitialized
        && !branchContext.hasBranches
        && !to.path.startsWith('/branches')
    ) {
        return next('/branches')
    }

    // If authenticated user tries to access login, redirect to dashboard
    if (to.path === '/login' && authStore.isAuthenticated) {
        const redirectPath = getRedirectPath(authStore.userRole)
        return next(redirectPath)
    }

    // Check role-based access
    if (to.meta.requiresRole && Array.isArray(to.meta.requiresRole)) {
        const userRole = authStore.userRole
        const allowedRoles = to.meta.requiresRole as string[]

        if (!userRole || !allowedRoles.includes(userRole)) {
            // Redirect to appropriate dashboard based on user role
            const redirectPath = getRedirectPath(userRole)
            return next(redirectPath)
        }
    }

    next()
})

// Helper function to get redirect path based on role
function getRedirectPath(role: string | null): string {
    switch (role) {
        case 'Superadmin':
            return '/dashboard'
        case 'Admin':
            return '/orders/new'
        case 'Cashier':
            return '/customers'
        case 'Kitchen':
            return '/kitchen'
        case 'Deliveryman':
            return '/delivery'
        default:
            return '/dashboard'
    }
}

export default router

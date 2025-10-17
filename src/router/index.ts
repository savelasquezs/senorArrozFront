// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'

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
            title: 'Dashboard'
        },
        children: [
            {
                path: 'global',
                name: 'GlobalDashboard',
                component: () => import('@/views/dashboard/GlobalDashboard.vue'),
                meta: {
                    requiresAuth: true,
                    requiresRole: [UserRole.SUPERADMIN],
                    title: 'Dashboard Global'
                }
            },


        ]
    },
    {
        path: '/branches',
        name: 'BranchesList',
        component: () => import('@/views/BranchesList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN],
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
            title: 'Clientes'
        }
    },
    {
        path: '/customers/:id',
        name: 'CustomerDetail',
        component: () => import('@/views/CustomerDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Detalle Cliente'
        }
    },
    {
        path: '/products',
        name: 'ProductsList',
        component: () => import('@/views/ProductsList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Productos'
        }
    },
    {
        path: '/products/:id',
        name: 'ProductDetail',
        component: () => import('@/views/ProductDetail.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN],
            title: 'Detalle Producto'
        }
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
        name: 'Orders',
        component: () => import('@/views/OrdersList.vue'),
        meta: {
            requiresAuth: true,
            requiresRole: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER],
            title: 'Pedidos'
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
    //   {
    //     path: '/kitchen',
    //     name: 'Kitchen',
    //     component: () => import('@/views/Kitchen.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Kitchen'],
    //       title: 'Cocina'
    //     }
    //   },
    //   {
    //     path: '/delivery',
    //     name: 'Delivery',
    //     component: () => import('@/views/Delivery.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Deliveryman'],
    //       title: 'Domicilios'
    //     }
    //   },
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
    //   {
    //     path: '/expenses',
    //     name: 'Expenses',
    //     component: () => import('@/views/Expenses.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin'],
    //       title: 'Gastos'
    //     }
    //   },
    //   {
    //     path: '/users',
    //     name: 'Users',
    //     component: () => import('@/views/Users.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin'],
    //       title: 'Usuarios'
    //     }
    //   },
    //   {
    //     path: '/reports',
    //     name: 'Reports',
    //     component: () => import('@/views/Reports.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin', 'Cashier'],
    //       title: 'Reportes'
    //     }
    //   },
    //   {
    //     path: '/cash-register',
    //     name: 'CashRegister',
    //     component: () => import('@/views/CashRegister.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       requiresRole: ['Superadmin', 'Admin', 'Cashier'],
    //       title: 'Caja'
    //     }
    //   },
    //   {
    //     path: '/profile',
    //     name: 'Profile',
    //     component: () => import('@/views/Profile.vue'),
    //     meta: {
    //       requiresAuth: true,
    //       title: 'Perfil'
    //     }
    //   },
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
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        }
        return { top: 0 }
    }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Initialize auth state if not already done
    if (!authStore.isAuthenticated && localStorage.getItem('auth_token')) {
        authStore.initializeAuth()
    }

    // Set page title
    document.title = to.meta.title ? `${to.meta.title} - Señor Arroz` : 'Señor Arroz'

    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        return next('/login')
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
            return '/dashboard/global'
        case 'Admin':
            return '/dashboard/branch'
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
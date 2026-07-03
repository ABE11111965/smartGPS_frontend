import { createRouter, createWebHashHistory } from 'vue-router'
import { isDemoMode } from '@/services/config'
import { tokenManager } from '@/services/token'
import type { UserRole } from '@/types'

const EmptyRoute = { template: '<div />' }

const routes = [
  { path: '/', redirect: '/overview' },
  { path: '/login', name: 'login', component: EmptyRoute, meta: { public: true } },
  { path: '/overview', name: 'overview', component: EmptyRoute },
  { path: '/tracking', name: 'tracking', component: EmptyRoute, meta: { roles: ['SHIPPER', 'DISPATCHER', 'ADMIN'] } },
  { path: '/dispatch', name: 'dispatch', component: EmptyRoute, meta: { roles: ['DISPATCHER', 'ADMIN'] } },
  { path: '/driver', name: 'driver', component: EmptyRoute, meta: { roles: ['DRIVER', 'DISPATCHER', 'ADMIN'] } },
  { path: '/alerts', name: 'alerts', component: EmptyRoute, meta: { roles: ['SHIPPER', 'WAREHOUSE', 'DISPATCHER', 'ADMIN'] } },
  { path: '/warehouse', name: 'warehouse', component: EmptyRoute, meta: { roles: ['WAREHOUSE', 'ADMIN'] } },
  { path: '/assistant', name: 'assistant', component: EmptyRoute, meta: { roles: ['SHIPPER', 'DISPATCHER', 'ADMIN'] } },
  { path: '/:pathMatch(.*)*', redirect: '/overview' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const authenticated = isDemoMode()
    ? Boolean(localStorage.getItem('smart-logistics-token'))
    : Boolean(tokenManager.getAccessToken())

  if (to.meta.public) return authenticated ? { name: 'overview' } : true
  if (!authenticated) return { name: 'login', query: { redirect: to.fullPath } }

  const roles = to.meta.roles as UserRole[] | undefined
  const apiRole = tokenManager.getUser()?.role
  const demoRole = localStorage.getItem('smart-logistics-role') as UserRole | null
  const role = isDemoMode() ? demoRole : apiRole
  if (roles?.length && (!role || !roles.includes(role))) return { name: 'overview' }
  return true
})

import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../composables/useAuth'

// Lazy-loaded pages
const Home = () => import('../pages/Home.vue')
const Explore = () => import('../pages/Explore.vue')
const Dashboard = () => import('../pages/Dashboard.vue')
const Progress = () => import('../pages/Progress.vue')
const Partner = () => import('../pages/Partner.vue')
const PartnerEventEdit = () => import('../pages/PartnerEventEdit.vue')
const ActivityDetails = () => import('../pages/ActivityDetails.vue')
const Admin = () => import('../pages/Admin.vue')
const Auth = () => import('../pages/Auth.vue')
const Login = () => import('../pages/Login.vue')
const Register = () => import('../pages/Register.vue')
const About = () => import('../pages/About.vue')
const Accessibility = () => import('../pages/Accessibility.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/explore', name: 'explore', component: Explore },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true, roles: ['user'] },
    },
    { path: '/activity/:id', name: 'activity-details', component: ActivityDetails },
    {
      path: '/progress',
      name: 'progress',
      component: Progress,
      meta: { requiresAuth: true, roles: ['user'] },
    },
    {
      path: '/partner',
      name: 'partner',
      component: Partner,
      meta: { requiresAuth: true, roles: ['partner'] },
    },
    {
      path: '/partner/edit/:id',
      name: 'partner-edit',
      component: PartnerEventEdit,
      meta: { requiresAuth: true, roles: ['partner'] },
    },
    {
      path: '/admin',
      name: 'admin',
      component: Admin,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    { path: '/auth', name: 'auth', component: Auth },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
    { path: '/about', name: 'about', component: About },
    { path: '/accessibility', name: 'accessibility', component: Accessibility },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router

// Global navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta && to.meta.requiresAuth
  const allowedRoles = to.meta && to.meta.roles
  const user = getCurrentUser()

  if (requiresAuth) {
    if (!user) {
      // not signed in
      return next({ name: 'login' })
    }
    if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
      // signed in but role not allowed
      return next({ name: 'home' })
    }
  }
  return next()
})

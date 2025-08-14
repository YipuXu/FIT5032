import { createRouter, createWebHistory } from 'vue-router'

// Lazy-loaded pages
const Home = () => import('../pages/Home.vue')
const Explore = () => import('../pages/Explore.vue')
const Dashboard = () => import('../pages/Dashboard.vue')
const Partner = () => import('../pages/Partner.vue')
const Admin = () => import('../pages/Admin.vue')
const Auth = () => import('../pages/Auth.vue')
const About = () => import('../pages/About.vue')
const Accessibility = () => import('../pages/Accessibility.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/explore', name: 'explore', component: Explore },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    { path: '/partner', name: 'partner', component: Partner },
    { path: '/admin', name: 'admin', component: Admin },
    { path: '/auth', name: 'auth', component: Auth },
    { path: '/about', name: 'about', component: About },
    { path: '/accessibility', name: 'accessibility', component: Accessibility },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router

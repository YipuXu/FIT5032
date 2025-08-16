<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCurrentUser, logout } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const currentUser = ref(getCurrentUser())

const isActive = (name) => {
  try {
    return route.name === name
  } catch (_) {
    return false
  }
}

const dashboardRoute = computed(() => {
  if (!currentUser.value) return { name: 'login' }
  const role = currentUser.value.role
  if (role === 'admin') return { name: 'admin' }
  if (role === 'partner') return { name: 'partner' }
  return { name: 'dashboard' }
})

// handleStorage removed - auth state managed by Firebase onAuthStateChanged

function handleAuthChanged(e) {
  // e.detail contains the safe user object or null
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
  } catch (_) {
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('mm-auth-changed', handleAuthChanged)
})
onUnmounted(() => {
  window.removeEventListener('mm-auth-changed', handleAuthChanged)
})

function handleSignOut() {
  logout()
  currentUser.value = null
  router.push({ name: 'home' })
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
    <div class="container">
      <RouterLink class="navbar-brand fw-semibold" to="/">Mindful Movement</RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink :class="['nav-link', { active: isActive('home') }]" to="/">Home</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :class="['nav-link', { active: isActive('explore') }]" to="/explore"
              >Explore</RouterLink
            >
          </li>
          <li class="nav-item">
            <RouterLink
              :class="['nav-link', { active: isActive('dashboard') }]"
              :to="dashboardRoute"
              >Dashboard</RouterLink
            >
          </li>
          <!-- Partner/Admin links intentionally hidden from top-level nav; access via Dashboard or dropdown -->
          <li class="nav-item">
            <RouterLink :class="['nav-link', { active: isActive('about') }]" to="/about"
              >About</RouterLink
            >
          </li>

          <li v-if="!currentUser" class="nav-item ms-lg-3">
            <RouterLink class="btn btn-outline-primary" to="/login">Login</RouterLink>
          </li>

          <li v-else class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {{ currentUser.email }}
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <!-- Show all dashboard links but disable those not allowed by role -->
              <li>
                <component
                  :is="
                    currentUser && ['user', 'admin'].includes(currentUser.role)
                      ? 'RouterLink'
                      : 'button'
                  "
                  class="dropdown-item"
                  :to="
                    currentUser && ['user', 'admin'].includes(currentUser.role)
                      ? '/dashboard'
                      : undefined
                  "
                  :disabled="!(currentUser && ['user', 'admin'].includes(currentUser.role))"
                  :title="
                    currentUser && ['user', 'admin'].includes(currentUser.role)
                      ? ''
                      : 'Not authorized'
                  "
                >
                  User Dashboard
                </component>
              </li>
              <li>
                <component
                  :is="
                    currentUser && ['partner', 'admin'].includes(currentUser.role)
                      ? 'RouterLink'
                      : 'button'
                  "
                  class="dropdown-item"
                  :to="
                    currentUser && ['partner', 'admin'].includes(currentUser.role)
                      ? '/partner'
                      : undefined
                  "
                  :disabled="!(currentUser && ['partner', 'admin'].includes(currentUser.role))"
                  :title="
                    currentUser && ['partner', 'admin'].includes(currentUser.role)
                      ? ''
                      : 'Not authorized'
                  "
                >
                  Partner Dashboard
                </component>
              </li>
              <li>
                <component
                  :is="currentUser && currentUser.role === 'admin' ? 'RouterLink' : 'button'"
                  class="dropdown-item"
                  :to="currentUser && currentUser.role === 'admin' ? '/admin' : undefined"
                  :disabled="!(currentUser && currentUser.role === 'admin')"
                  :title="currentUser && currentUser.role === 'admin' ? '' : 'Not authorized'"
                >
                  Admin Dashboard
                </component>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li><button class="dropdown-item" @click="handleSignOut">Sign Out</button></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar-brand {
  letter-spacing: 0.2px;
}
</style>

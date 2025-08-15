<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, logout } from '../composables/useAuth'

const router = useRouter()
const currentUser = ref(getCurrentUser())

const dashboardRoute = computed(() => {
  if (!currentUser.value) return { name: 'login' }
  const role = currentUser.value.role
  if (role === 'admin') return { name: 'admin' }
  if (role === 'partner') return { name: 'partner' }
  return { name: 'dashboard' }
})

function handleStorage(e) {
  if (e.key === 'mm_current_user') {
    currentUser.value = getCurrentUser()
  }
}

function handleAuthChanged(e) {
  // e.detail contains the safe user object or null
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
  } catch (_) {
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  window.addEventListener('mm-auth-changed', handleAuthChanged)
})
onUnmounted(() => {
  window.removeEventListener('storage', handleStorage)
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
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/explore">Explore</RouterLink></li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="dashboardRoute">Dashboard</RouterLink>
          </li>
          <!-- Partner/Admin links intentionally hidden from top-level nav; access via Dashboard or dropdown -->
          <li class="nav-item"><RouterLink class="nav-link" to="/about">About</RouterLink></li>

          <li v-if="!currentUser" class="nav-item">
            <RouterLink class="nav-link" to="/login">Login</RouterLink>
          </li>
          <li v-if="!currentUser" class="nav-item ms-lg-3">
            <RouterLink class="btn btn-primary" to="/register">Sign Up</RouterLink>
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
                  :is="currentUser && currentUser.role === 'user' ? 'RouterLink' : 'button'"
                  class="dropdown-item"
                  :to="currentUser && currentUser.role === 'user' ? '/dashboard' : undefined"
                  :disabled="!(currentUser && currentUser.role === 'user')"
                  :title="currentUser && currentUser.role === 'user' ? '' : 'Not authorized'"
                >
                  User Dashboard
                </component>
              </li>
              <li>
                <component
                  :is="currentUser && currentUser.role === 'partner' ? 'RouterLink' : 'button'"
                  class="dropdown-item"
                  :to="currentUser && currentUser.role === 'partner' ? '/partner' : undefined"
                  :disabled="!(currentUser && currentUser.role === 'partner')"
                  :title="currentUser && currentUser.role === 'partner' ? '' : 'Not authorized'"
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

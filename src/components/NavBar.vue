<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, logout } from '../composables/useAuth'

const router = useRouter()
const currentUser = ref(getCurrentUser())

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
          <li class="nav-item"><RouterLink class="nav-link" to="/explore">Explore</RouterLink></li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/dashboard">Dashboard</RouterLink>
          </li>
          <li class="nav-item"><RouterLink class="nav-link" to="/partner">Partner</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/admin">Admin</RouterLink></li>
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
              <li><RouterLink class="dropdown-item" to="/dashboard">Dashboard</RouterLink></li>
              <li><RouterLink class="dropdown-item" to="/partner">Partner</RouterLink></li>
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

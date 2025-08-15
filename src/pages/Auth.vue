<script setup>
import { ref, reactive } from 'vue'
import { registerUser, loginUser, logout, getCurrentUser } from '../composables/useAuth'

const mode = ref('login')
const form = reactive({ name: '', email: '', password: '', role: 'user' })
const errors = reactive({ name: '', email: '', password: '', general: '' })
const current = ref(getCurrentUser())

function clearErrors() {
  errors.name = errors.email = errors.password = errors.general = ''
}

async function handleSubmit() {
  clearErrors()
  try {
    if (mode.value === 'register') {
      await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      })
    } else {
      await loginUser({ email: form.email, password: form.password })
    }
    current.value = getCurrentUser()
  } catch (err) {
    errors.general = err.message || 'Authentication error'
  }
}

function handleLogout() {
  logout()
  current.value = null
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Login / Register</h1>
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">{{ mode === 'register' ? 'Register' : 'Login' }}</h5>
            <form @submit.prevent="handleSubmit" novalidate>
              <div v-if="mode === 'register'" class="mb-3">
                <label class="form-label">Full Name</label>
                <input v-model="form.name" type="text" class="form-control" required />
                <div v-if="errors.name" class="text-danger small">{{ errors.name }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
                <div v-if="errors.email" class="text-danger small">{{ errors.email }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-control"
                  minlength="6"
                  required
                />
                <div v-if="errors.password" class="text-danger small">{{ errors.password }}</div>
              </div>
              <div class="mb-3" v-if="mode === 'register'">
                <label class="form-label">Role</label>
                <select v-model="form.role" class="form-select">
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div v-if="errors.general" class="text-danger mb-2">{{ errors.general }}</div>
              <div class="d-grid gap-2">
                <button class="btn btn-primary" type="submit">
                  {{ mode === 'register' ? 'Register' : 'Login' }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="mode = mode === 'register' ? 'login' : 'register'"
                >
                  {{ mode === 'register' ? 'Switch to Login' : 'Switch to Register' }}
                </button>
              </div>
            </form>
            <div v-if="current" class="mt-3">
              <div class="small">
                Signed in as <strong>{{ current.email }}</strong> (role: <em>{{ current.role }}</em
                >)
              </div>
              <button class="btn btn-sm btn-outline-danger mt-2" @click="handleLogout">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">External Auth</h5>
            <button class="btn btn-outline-primary w-100" disabled aria-disabled="true">
              Continue with Google
            </button>
            <div class="small mm-muted mt-2">Placeholder for Firebase Auth / OAuth providers.</div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

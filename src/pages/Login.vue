<script setup>
defineOptions({ name: 'LoginPage' })
import { reactive, ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loginUser, getCurrentUser } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const loading = ref(false)
const rememberMe = ref(false)
const showPassword = ref(false)

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').toLowerCase())
const canSubmit = computed(
  () => isValidEmail(form.email) && (form.password || '').length >= 6 && !loading.value,
)

// Real-time validation
watch(
  () => form.email,
  (v) => {
    if (!v) {
      errors.email = ''
      return
    }
    if (!isValidEmail(v)) errors.email = 'Please enter a valid email address'
    else errors.email = ''
  },
)

watch(
  () => form.password,
  (v) => {
    if (!v) {
      errors.password = ''
      return
    }
    if ((v || '').length < 9) errors.password = 'Password must be at least 9 characters'
    else errors.password = ''
  },
)

function clearErrors() {
  errors.email = errors.password = ''
}

async function handleSubmit() {
  clearErrors()
  try {
    if (!isValidEmail(form.email)) {
      errors.email = 'Please enter a valid email address'
      return
    }
    if ((form.password || '').length < 6) {
      errors.password = 'Password must be at least 6 characters'
      return
    }

    loading.value = true
    await loginUser({ email: form.email, password: form.password })
    const u = getCurrentUser()

    // Handle redirect parameter
    const redirectPath = route.query.redirect
    if (redirectPath && typeof redirectPath === 'string') {
      router.push(redirectPath)
    } else {
      // Role-based redirect
      if (u && u.role === 'admin') router.push({ name: 'admin' })
      else if (u && u.role === 'partner') router.push({ name: 'partner' })
      else router.push({ name: 'dashboard' })
    }
  } catch (err) {
    // Show login error below password field
    errors.password = err.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  alert('Please contact support to reset your password.')
}
</script>

<template>
  <main class="container py-4">
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mm-breadcrumb">
        <li class="breadcrumb-item">
          <router-link :to="{ name: 'home' }">Home</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Login</li>
      </ol>
    </nav>
    <h1 class="fw-bold mb-3">Login</h1>
    <div class="row g-4 align-items-stretch">
      <!-- Left: Form -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm h-100">
          <div class="card-body p-3 p-md-4">
            <form @submit.prevent="handleSubmit" novalidate>
              <div class="mt-2">
                <label class="form-label">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control"
                  placeholder="name@example.com"
                  required
                />
                <div class="field-hint mt-1">
                  <span v-if="errors.email" class="small text-danger">{{ errors.email }}</span>
                  <span v-else class="small">&nbsp;</span>
                </div>
              </div>
              <div class="mt-2">
                <label class="form-label">Password</label>
                <div class="input-group">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    v-model="form.password"
                    class="form-control"
                    minlength="6"
                    required
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <div class="field-hint mt-1">
                  <span v-if="errors.password" class="small text-danger">{{
                    errors.password
                  }}</span>
                  <span v-else class="small">&nbsp;</span>
                </div>
              </div>

              <!-- Remember Me & Forgot Password -->
              <div class="row g-2 mt-2">
                <div class="col-12 col-md-6">
                  <div class="form-check">
                    <input
                      v-model="rememberMe"
                      class="form-check-input"
                      type="checkbox"
                      id="rememberMe"
                    />
                    <label class="form-check-label small" for="rememberMe">Remember me</label>
                  </div>
                </div>
                <div class="col-12 col-md-6 text-end">
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 text-decoration-none"
                    @click="handleForgotPassword"
                    style="color: #588157"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div class="d-grid mt-3">
                <button
                  class="btn d-flex align-items-center justify-content-center gap-2"
                  :class="{
                    'btn-primary': canSubmit,
                    'btn-secondary': !canSubmit,
                  }"
                  :disabled="!canSubmit"
                  :style="
                    !canSubmit
                      ? { backgroundColor: '#DAD7CD', borderColor: '#DAD7CD', color: '#000000' }
                      : { backgroundColor: '#588157', borderColor: '#588157' }
                  "
                >
                  <span
                    v-if="loading"
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Right: Info -->
      <div class="col-12 col-lg-5">
        <div class="card h-100 border-0 bg-light shadow-sm">
          <div class="card-body p-3 p-md-4">
            <h2 class="h6 fw-bold mb-3">Welcome back</h2>
            <ul class="mb-3 ps-3">
              <li class="mb-2">Access your dashboard and manage your bookings</li>
              <li class="mb-2">See upcoming activities tailored to you</li>
              <li class="mb-2">Continue tracking your progress</li>
            </ul>
            <div class="small text-muted">
              Don't have an account?
              <router-link
                :to="{ name: 'register' }"
                class="text-decoration-none"
                style="color: #588157"
                >Sign up here</router-link
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.card .form-label {
  font-weight: 600;
}
.field-hint {
  min-height: 1rem;
}
.field-hint .small {
  font-size: 0.85rem;
  line-height: 1.25;
  font-weight: 400;
}
/* Theme checkbox color */
.form-check-input {
  accent-color: #588157;
}
.form-check-input:checked {
  background-color: #588157;
  border-color: #588157;
}
.form-check-input:focus {
  border-color: #588157;
  box-shadow: 0 0 0 0.2rem rgba(88, 129, 87, 0.25);
}
</style>

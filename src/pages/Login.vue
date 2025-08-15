<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser, getCurrentUser } from '../composables/useAuth'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '', general: '' })
const loading = ref(false)

function clearErrors() {
  errors.email = errors.password = errors.general = ''
}

async function handleSubmit() {
  clearErrors()
  loading.value = true
  try {
    await loginUser({ email: form.email, password: form.password })
    // redirect to dashboard after login
    router.push({ name: 'dashboard' })
  } catch (err) {
    errors.general = err.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Login</h1>
    <div class="row">
      <div class="col-12 col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <form @submit.prevent="handleSubmit" novalidate>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
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
              </div>
              <div v-if="errors.general" class="text-danger mb-2">{{ errors.general }}</div>
              <div class="d-grid">
                <button class="btn btn-primary" :disabled="loading">Sign In</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

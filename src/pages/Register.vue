<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../composables/useAuth'
import { useSuburbs } from '../composables/useSuburbs'

const router = useRouter()
const { sortedSuburbs } = useSuburbs()

const form = reactive({
  name: '',
  gender: '',
  email: '',
  password: '',
  confirmPassword: '',
  suburb: '',
  role: 'user',
  reason: '',
})
const errors = reactive({
  name: '',
  gender: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: '',
})
const loading = ref(false)

function clearErrors() {
  errors.name = ''
  errors.gender = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.general = ''
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  return re.test(String(email || '').toLowerCase())
}

function isStrongPassword(pw) {
  // > 8 chars (min 9), contains upper, lower, digit, special
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/
  return re.test(String(pw || ''))
}

function validateForm() {
  clearErrors()
  let ok = true
  const name = (form.name || '').trim()
  if (name.length < 3) {
    errors.name = 'Name must be at least 3 characters'
    ok = false
  }
  if (!form.gender) {
    errors.gender = 'Please select a gender'
    ok = false
  }
  if (!isValidEmail(form.email)) {
    errors.email = 'Please enter a valid email address'
    ok = false
  }
  if (!isStrongPassword(form.password)) {
    errors.password =
      'Password must be 9+ chars and include upper, lower, number, and a special symbol'
    ok = false
  }
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
    ok = false
  }
  return ok
}

async function handleSubmit() {
  clearErrors()
  try {
    if (!validateForm()) return
    loading.value = true
    // role-based redirect after registration - registerUser returns the user object
    const user = await registerUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      gender: form.gender,
      suburb: form.suburb,
      reason: form.reason,
    })
    if (user && user.role === 'admin') router.push({ name: 'admin' })
    else if (user && user.role === 'partner') router.push({ name: 'partner' })
    else router.push({ name: 'dashboard' })
  } catch (err) {
    errors.general = err.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Register</h1>
    <div class="row">
      <div class="col-12 col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <form @submit.prevent="handleSubmit" novalidate>
              <div class="mb-3">
                <label class="form-label">Full Name</label>
                <input v-model="form.name" type="text" class="form-control" required />
                <div v-if="errors.name" class="small text-danger mt-1">{{ errors.name }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Gender</label>
                <select v-model="form.gender" class="form-select">
                  <option value="">Select a gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
                <div v-if="errors.gender" class="small text-danger mt-1">{{ errors.gender }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
                <div v-if="errors.email" class="small text-danger mt-1">{{ errors.email }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-control"
                  minlength="9"
                  required
                />
                <div class="form-text">
                  Must be 9+ characters and include upper, lower, number, and special symbol.
                </div>
                <div v-if="errors.password" class="small text-danger mt-1">
                  {{ errors.password }}
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Confirm Password</label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  class="form-control"
                  minlength="9"
                  required
                />
                <div v-if="errors.confirmPassword" class="small text-danger mt-1">
                  {{ errors.confirmPassword }}
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Suburb</label>
                <select v-model="form.suburb" class="form-select">
                  <option value="">Select a suburb</option>
                  <option v-for="s in sortedSuburbs" :key="s" :value="s">{{ s }}</option>
                </select>
                <div class="form-text">Optional. Helps us suggest nearby activities.</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Role</label>
                <select v-model="form.role" class="form-select">
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason to Join</label>
                <textarea
                  v-model="form.reason"
                  class="form-control"
                  rows="2"
                  placeholder="Optional. Tell us a bit about your goals (e.g. stress relief, social, fitness)."
                ></textarea>
              </div>
              <div v-if="errors.general" class="text-danger mb-2">{{ errors.general }}</div>
              <div class="d-grid">
                <button class="btn btn-primary" :disabled="loading">Create account</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

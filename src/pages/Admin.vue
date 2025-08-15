<script setup>
defineOptions({ name: 'AdminPage' })
import { ref, computed, onMounted } from 'vue'
import { getUsers, deleteUserByEmail } from '../composables/useAuth'

const users = ref([])

function load() {
  users.value = getUsers()
}

onMounted(load)

const counts = computed(() => {
  const usersCount = users.value.filter((u) => u.role === 'user').length
  const partners = users.value.filter((u) => u.role === 'partner').length
  const admins = users.value.filter((u) => u.role === 'admin').length
  return { usersCount, partners, admins }
})

// Filter & sort state
const roleFilter = ref('all')
const sortBy = ref('email')
const asc = ref(true)

const filteredSortedUsers = computed(() => {
  let arr = users.value.slice()
  if (roleFilter.value !== 'all') {
    arr = arr.filter((u) => u.role === roleFilter.value)
  }
  arr.sort((a, b) => {
    const aVal = String(a[sortBy.value] ?? '').toLowerCase()
    const bVal = String(b[sortBy.value] ?? '').toLowerCase()
    if (aVal < bVal) return asc.value ? -1 : 1
    if (aVal > bVal) return asc.value ? 1 : -1
    return 0
  })
  return arr
})

function removeUser(email) {
  if (!confirm(`Delete user ${email}?`)) return
  deleteUserByEmail(email)
  load()
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Admin Dashboard</h1>
    <p class="text-muted">Platform overview and simple metrics.</p>
    <div class="row g-3 mb-4">
      <div class="col-12 col-md-4">
        <div class="mm-surface p-3 text-center h-100 d-flex flex-column justify-content-center">
          <div class="small mm-muted">Users</div>
          <div class="fw-bold">{{ counts.usersCount }}</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="mm-surface p-3 text-center h-100 d-flex flex-column justify-content-center">
          <div class="small mm-muted">Partners</div>
          <div class="fw-bold">{{ counts.partners }}</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="mm-surface p-3 text-center h-100 d-flex flex-column justify-content-center">
          <div class="small mm-muted">Admins</div>
          <div class="fw-bold">{{ counts.admins }}</div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex gap-2 mb-3">
          <div class="flex-grow-1">
            <select v-model="roleFilter" class="form-select">
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="partner">Partner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <select v-model="sortBy" class="form-select">
              <option value="email">Email</option>
              <option value="name">Name</option>
              <option value="role">Role</option>
            </select>
          </div>
          <div>
            <button class="btn btn-outline-secondary" @click="asc = !asc">
              {{ asc ? 'Asc' : 'Desc' }}
            </button>
          </div>
          <div>
            <button class="btn btn-primary" @click="load">Refresh</button>
          </div>
        </div>
        <h5 class="card-title">User List</h5>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filteredSortedUsers" :key="u.id">
                <td>{{ u.email }}</td>
                <td>{{ u.name }}</td>
                <td>{{ u.role }}</td>
                <td>{{ new Date(u.createdAt).toLocaleString() }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-danger" @click="removeUser(u.email)">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

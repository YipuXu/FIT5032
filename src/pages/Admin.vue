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
      <div class="col-6 col-md-3">
        <div class="mm-surface p-3 text-center">
          <div class="small mm-muted">Users</div>
          <div class="fw-bold">{{ counts.usersCount }}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="mm-surface p-3 text-center">
          <div class="small mm-muted">Partners</div>
          <div class="fw-bold">{{ counts.partners }}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="mm-surface p-3 text-center">
          <div class="small mm-muted">Admins</div>
          <div class="fw-bold">{{ counts.admins }}</div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
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
              <tr v-for="u in users" :key="u.id">
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

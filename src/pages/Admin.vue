<script setup>
defineOptions({ name: 'AdminPage' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../firebase/index.js'
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore'

const users = ref([])
const searchQuery = ref('')
const selectedUserIds = ref(new Set())

function toggleSelect(id) {
  const s = new Set(selectedUserIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedUserIds.value = s
}

function toggleSelectAll(checked) {
  if (checked) {
    const s = new Set(filteredSortedUsers.value.map((u) => u.id))
    selectedUserIds.value = s
  } else {
    selectedUserIds.value = new Set()
  }
}

function exportSelectedCsv() {
  const sel = Array.from(selectedUserIds.value)
  if (sel.length === 0) {
    alert('No users selected for export')
    return
  }
  const rows = [['id', 'name', 'email', 'role', 'createdAt']]
  for (const id of sel) {
    const u = users.value.find((x) => x.id === id)
    if (u) rows.push([u.id, u.name, u.email, u.role, u.createdAt])
  }
  const csv = rows
    .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'users_selected.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function sendBulkEmail() {
  const sel = Array.from(selectedUserIds.value)
  if (sel.length === 0) {
    alert('No users selected for bulk email')
    return
  }
  // UI-only demo
  alert(`Bulk email (UI only) would be sent to ${sel.length} users.`)
}

let unsubscribe = null
function subscribeUsers() {
  try {
    const col = collection(db, 'users')
    unsubscribe = onSnapshot(col, (snap) => {
      const arr = []
      snap.forEach((d) => {
        const data = d.data() || {}
        arr.push({
          id: data.uid || d.id,
          uid: data.uid || d.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'user',
          createdAt: data.createdAt || new Date(0).toISOString(),
        })
      })
      users.value = arr
    })
  } catch {}
}

onMounted(subscribeUsers)
onUnmounted(() => {
  try {
    if (unsubscribe) unsubscribe()
  } catch {}
})

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
  const q = searchQuery.value.trim().toLowerCase()
  if (roleFilter.value !== 'all') {
    arr = arr.filter((u) => u.role === roleFilter.value)
  }
  if (q) {
    arr = arr.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q),
    )
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

async function removeUser(uid) {
  if (!confirm(`Delete user ${uid}?`)) return
  try {
    await deleteDoc(doc(db, 'users', uid))
  } catch (e) {
    alert('Failed to delete user: ' + (e?.message || e))
  }
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
        <h5 class="card-title">User List</h5>
        <div class="d-flex gap-1 mb-0 align-items-center">
          <div class="flex-grow-1 me-1">
            <input
              v-model="searchQuery"
              class="form-control"
              placeholder="Search by name, email, or role"
            />
          </div>
          <div>
            <select v-model="roleFilter" class="form-select">
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="partner">Partner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 32px">
                  <input
                    type="checkbox"
                    @change="toggleSelectAll($event.target.checked)"
                    :checked="
                      selectedUserIds.size > 0 &&
                      selectedUserIds.size === filteredSortedUsers.length
                    "
                  />
                </th>
                <th>
                  <div class="d-flex align-items-center justify-content-between">
                    <span>Email</span>
                    <div class="sort-vertical ms-2">
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted',
                          { 'active-sort': sortBy === 'email' && asc },
                        ]"
                        @click.prevent="((sortBy = 'email'), (asc = true))"
                        aria-label="Sort email ascending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 6l-6 8h12l-6-8z" />
                        </svg>
                      </button>
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted mt-1',
                          { 'active-sort': sortBy === 'email' && !asc },
                        ]"
                        @click.prevent="((sortBy = 'email'), (asc = false))"
                        aria-label="Sort email descending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 18l6-8H6l6 8z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </th>
                <th>
                  <div class="d-flex align-items-center justify-content-between">
                    <span>Name</span>
                    <div class="sort-vertical ms-2">
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted',
                          { 'active-sort': sortBy === 'name' && asc },
                        ]"
                        @click.prevent="((sortBy = 'name'), (asc = true))"
                        aria-label="Sort name ascending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 6l-6 8h12l-6-8z" />
                        </svg>
                      </button>
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted mt-1',
                          { 'active-sort': sortBy === 'name' && !asc },
                        ]"
                        @click.prevent="((sortBy = 'name'), (asc = false))"
                        aria-label="Sort name descending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 18l6-8H6l6 8z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </th>
                <th>
                  <div class="d-flex align-items-center justify-content-between">
                    <span>Role</span>
                    <div class="sort-vertical ms-2">
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted',
                          { 'active-sort': sortBy === 'role' && asc },
                        ]"
                        @click.prevent="((sortBy = 'role'), (asc = true))"
                        aria-label="Sort role ascending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 6l-6 8h12l-6-8z" />
                        </svg>
                      </button>
                      <button
                        :class="[
                          'btn btn-link p-0 text-muted mt-1',
                          { 'active-sort': sortBy === 'role' && !asc },
                        ]"
                        @click.prevent="((sortBy = 'role'), (asc = false))"
                        aria-label="Sort role descending"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path d="M12 18l6-8H6l6 8z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filteredSortedUsers" :key="u.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedUserIds.has(u.id)"
                    @change="toggleSelect(u.id)"
                  />
                </td>
                <td>{{ u.email }}</td>
                <td>{{ u.name }}</td>
                <td>{{ u.role }}</td>
                <td>{{ new Date(u.createdAt).toLocaleString() }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-danger" @click="removeUser(u.uid)">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-start gap-2 mt-3">
          <button class="btn btn-success" @click="exportSelectedCsv">Export CSV</button>
          <button class="btn btn-outline-secondary" @click="sendBulkEmail">
            Bulk Email (UI Only)
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

.card-title { margin-bottom: 0; } .card-body .table-responsive { margin-top: 0; }

<style scoped>
.sort-vertical {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
.sort-vertical {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.sort-vertical button {
  line-height: 0.45;
  font-size: 0.62rem;
  padding: 0;
  margin: 0;
  border: 0;
}
.sort-vertical svg {
  display: block;
  width: 10px;
  height: 10px;
}
.active-sort {
  color: var(--mm-green) !important;
}
</style>

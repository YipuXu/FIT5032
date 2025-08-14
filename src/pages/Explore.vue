<script setup>
import { ref } from 'vue'

const query = ref('')
const results = ref([
  { id: 'a1', title: 'Sunset Yoga', location: 'Fitzroy Gardens', time: 'Sat 17:30' },
  { id: 'a2', title: 'Creative Pottery', location: 'Collingwood Studio', time: 'Wed 19:00' },
])
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Explore Activities</h1>
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-6">
        <input v-model="query" class="form-control" placeholder="Search activities or locations" />
      </div>
      <div class="col-12 col-md-3">
        <select class="form-select">
          <option>All</option>
          <option>Yoga</option>
          <option>Creative</option>
        </select>
      </div>
      <div class="col-12 col-md-3"><button class="btn btn-primary w-100">Search</button></div>
    </div>
    <div class="row g-3">
      <div class="col-12 col-md-6 col-lg-4" v-for="r in results" :key="r.id">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">{{ r.title }}</h5>
            <div class="text-muted small">{{ r.location }} · {{ r.time }}</div>
          </div>
          <div class="card-footer bg-white">
            <button class="btn btn-primary w-100">Register</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

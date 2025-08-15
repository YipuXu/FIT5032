<script setup>
defineOptions({ name: 'PartnerEventCreatePage' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Google Maps helpers (same pattern as Partner.vue)
function loadGoogleMapsPartner(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps)
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google.maps)
        else reject(new Error('Google Maps failed to load'))
      })
      existing.addEventListener('error', () => reject(new Error('Google Maps script error')))
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}&libraries=places,geocoding`
    s.async = true
    s.defer = true
    s.setAttribute('data-gmaps', '1')
    s.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps)
      else reject(new Error('Google Maps failed to initialize'))
    }
    s.onerror = () => reject(new Error('Google Maps script failed to load'))
    document.head.appendChild(s)
  })
}

const PARTNER_EVENTS_KEY = 'partner_events_v1'

const router = useRouter()

const form = ref({
  title: '',
  location: '',
  date: '',
  time: '',
  capacity: 10,
  lat: null,
  lng: null,
  type: 'yoga',
  details: '',
  intensity: 'medium',
})

const partnerMapEl = ref(null)
let partnerMap = null
let partnerMarker = null

onMounted(async () => {
  try {
    const g = await loadGoogleMapsPartner(import.meta.env.VITE_GOOGLE_MAPS_KEY || '')
    const center = { lat: -37.8136, lng: 144.9631 }
    partnerMap = new g.Map(partnerMapEl.value, { center, zoom: 13, streetViewControl: false })
    partnerMarker = new g.Marker({ map: partnerMap })
    partnerMap.addListener('click', (ev) => {
      const lat = ev.latLng.lat()
      const lng = ev.latLng.lng()
      form.value.lat = lat
      form.value.lng = lng
      partnerMarker.setPosition({ lat, lng })
      const geocoder = new g.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          form.value.location = results[0].formatted_address || ''
        }
      })
    })
    const locInput = document.getElementById('partner-location-input-create')
    if (locInput) {
      const ac = new g.places.Autocomplete(locInput)
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          form.value.lat = lat
          form.value.lng = lng
          partnerMarker.setPosition({ lat, lng })
          partnerMap.panTo({ lat, lng })
          form.value.location = place.formatted_address || place.name || ''
        }
      })
    }
  } catch (err) {
    console.warn('Partner create map init failed', err)
  }
})

function save() {
  if (!form.value.title || !form.value.location || !form.value.date || !form.value.time) {
    alert('Please fill in Title, Location, Date and Time.')
    return
  }
  try {
    const dateTime = new Date(`${form.value.date}T${form.value.time}`)
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const event = {
      id: crypto.randomUUID(),
      ownerEmail: localStorage.getItem('mm_current_user')
        ? JSON.parse(localStorage.getItem('mm_current_user')).email
        : '',
      title: form.value.title.trim(),
      location: form.value.location.trim(),
      dateTime: dateTime.toISOString(),
      capacity: Number(form.value.capacity) || 10,
      lat: form.value.lat || null,
      lng: form.value.lng || null,
      type: form.value.type || 'other',
      details: form.value.details || '',
      intensity: form.value.intensity || 'medium',
    }
    all.push(event)
    localStorage.setItem(PARTNER_EVENTS_KEY, JSON.stringify(all))
    router.push({ name: 'partner' })
  } catch (err) {
    console.warn('Failed to create event', err)
    alert('Failed to create event')
  }
}

function cancel() {
  router.push({ name: 'partner' })
}
</script>

<template>
  <main class="container py-4">
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mm-breadcrumb">
        <li class="breadcrumb-item">
          <router-link :to="{ name: 'partner' }">Partner Dashboard</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Create Event</li>
      </ol>
    </nav>
    <h1 class="fw-bold mb-3">Create Event</h1>
    <div class="card">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-2">
            <label class="form-label small">Title</label>
            <input v-model="form.title" class="form-control" placeholder="Beginner's Yoga" />
          </div>
          <div class="col-12 col-md-1">
            <label class="form-label small">Type</label>
            <select v-model="form.type" class="form-select">
              <option value="yoga">Yoga</option>
              <option value="walk">Walk</option>
              <option value="meditation">Meditation</option>
              <option value="creative">Creative</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="col-6 col-md-1">
            <label class="form-label small">Intensity</label>
            <select v-model="form.intensity" class="form-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label small">Location</label>
            <input
              id="partner-location-input-create"
              v-model="form.location"
              class="form-control"
              placeholder="Carlton Gardens"
            />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small">Date</label>
            <input v-model="form.date" type="date" class="form-control" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small">Time</label>
            <input v-model="form.time" type="time" class="form-control" />
          </div>
          <div class="col-6 col-md-1">
            <label class="form-label small">Capacity</label>
            <input v-model.number="form.capacity" type="number" min="1" class="form-control" />
          </div>
        </div>
        <div class="mt-3">
          <label class="form-label small">Event Details</label>
          <textarea
            v-model="form.details"
            class="form-control"
            rows="1"
            placeholder="Add longer details about the event, e.g., agenda, what to bring, accessibility notes..."
          ></textarea>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-success" @click="save">Create</button>
            <button class="btn btn-outline-secondary" @click="cancel">Cancel</button>
          </div>
        </div>
        <div class="mt-3">
          <small class="text-muted">Or pick location on map:</small>
          <div ref="partnerMapEl" class="border rounded mt-2" style="height: 410px"></div>
          <div class="small text-muted mt-2">
            Selected:
            <strong>
              {{ form.lat ? form.lat.toFixed(5) : '-' }},
              {{ form.lng ? form.lng.toFixed(5) : '-' }}</strong
            >
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

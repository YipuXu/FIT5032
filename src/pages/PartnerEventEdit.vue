<script setup>
defineOptions({ name: 'PartnerEventEditPage' })
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

const route = useRoute()
const router = useRouter()

const form = ref({
  id: '',
  title: '',
  location: '',
  date: '',
  time: '',
  capacity: 10,
  lat: null,
  lng: null,
  type: 'yoga',
  details: '',
})

const partnerMapEl = ref(null)
let partnerMap = null
let partnerMarker = null

onMounted(async () => {
  const id = route.params.id
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const ev = all.find((x) => x.id === id)
    if (!ev) return router.replace({ name: 'partner' })
    form.value.id = ev.id
    form.value.title = ev.title || ''
    form.value.location = ev.location || ''
    form.value.date = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(0, 10) : ''
    form.value.time = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(11, 16) : ''
    form.value.capacity = ev.capacity || 10
    form.value.lat = ev.lat || null
    form.value.lng = ev.lng || null
    form.value.type = ev.type || 'other'
    form.value.details = ev.details || ''

    try {
      const g = await loadGoogleMapsPartner(import.meta.env.VITE_GOOGLE_MAPS_KEY || '')
      const center = { lat: form.value.lat || -37.8136, lng: form.value.lng || 144.9631 }
      partnerMap = new g.Map(partnerMapEl.value, { center, zoom: 13, streetViewControl: false })
      partnerMarker = new g.Marker({ map: partnerMap })
      if (form.value.lat != null && form.value.lng != null) {
        partnerMarker.setPosition({ lat: form.value.lat, lng: form.value.lng })
        partnerMap.panTo({ lat: form.value.lat, lng: form.value.lng })
      }
      partnerMap.addListener('click', (ev) => {
        const lat = ev.latLng.lat()
        const lng = ev.latLng.lng()
        form.value.lat = lat
        form.value.lng = lng
        partnerMarker.setPosition({ lat, lng })
        // reverse geocode
        const geocoder = new g.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            form.value.location = results[0].formatted_address || ''
          }
        })
      })
      const locInput = document.getElementById('partner-location-input-edit')
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
      console.warn('Partner edit map init failed', err)
    }
  } catch (err) {
    router.replace({ name: 'partner' })
  }
})

onMounted(() => {
  const id = route.params.id
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const ev = all.find((x) => x.id === id)
    if (!ev) return router.replace({ name: 'partner' })
    form.value.id = ev.id
    form.value.title = ev.title || ''
    form.value.location = ev.location || ''
    form.value.date = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(0, 10) : ''
    form.value.time = ev.dateTime ? new Date(ev.dateTime).toISOString().slice(11, 16) : ''
    form.value.capacity = ev.capacity || 10
    form.value.lat = ev.lat || null
    form.value.lng = ev.lng || null
    form.value.type = ev.type || 'other'
  } catch (err) {
    router.replace({ name: 'partner' })
  }
})

function save() {
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const idx = all.findIndex((x) => x.id === form.value.id)
    if (idx === -1) return router.push({ name: 'partner' })
    const dateTime = new Date(`${form.value.date}T${form.value.time}`)
    all[idx] = {
      ...all[idx],
      title: form.value.title.trim(),
      location: form.value.location.trim(),
      dateTime: dateTime.toISOString(),
      capacity: Number(form.value.capacity) || 10,
      lat: form.value.lat || null,
      lng: form.value.lng || null,
      type: form.value.type || 'other',
      details: form.value.details || '',
    }
    localStorage.setItem(PARTNER_EVENTS_KEY, JSON.stringify(all))
    router.push({ name: 'partner' })
  } catch (err) {
    alert('Failed to save changes')
  }
}

function cancel() {
  router.push({ name: 'partner' })
}
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Edit Event</h1>
    <div class="card">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-3">
            <label class="form-label small">Title</label>
            <input v-model="form.title" class="form-control" placeholder="Beginner's Yoga" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label small">Location</label>
            <input
              id="partner-location-input-edit"
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
        <div class="row mt-3">
          <div class="col-12">
            <label class="form-label small">Event Details</label>
            <textarea
              v-model="form.details"
              class="form-control"
              rows="1"
              placeholder="Add longer details about the event, e.g., agenda, what to bring, accessibility notes..."
            ></textarea>
            <div class="mt-2 d-flex gap-2">
              <button class="btn btn-success" @click="save">Save</button>
              <button class="btn btn-outline-secondary" @click="cancel">Cancel</button>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <small class="text-muted">Or pick location on map:</small>
          <div ref="partnerMapEl" class="border rounded mt-2" style="height: 410px"></div>
          <div class="small text-muted mt-2">
            Selected:
            <strong
              >{{ form.lat ? form.lat.toFixed(5) : '-' }},
              {{ form.lng ? form.lng.toFixed(5) : '-' }}</strong
            >
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>

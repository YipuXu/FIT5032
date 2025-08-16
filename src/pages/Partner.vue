<script setup>
defineOptions({ name: 'PartnerPage' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser } from '../composables/useAuth'
import { useEventTypes } from '../composables/useEventTypes'
import { auth, db } from '../firebase/index.js'
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

// Replaced local storage with Firestore subscriptions

// Reactive state
const currentUser = ref(getCurrentUser())
const myEvents = ref([])
const allBookings = ref([])
const allReviews = ref([])
let unsubEvents = null
let unsubBookings = null
let unsubReviews = null

const showCreate = ref(false)
const form = ref({
  title: '',
  location: '',
  date: '',
  time: '',
  capacity: 10,
  lat: null,
  lng: null,
  type: 'yoga',
})
const editingId = ref(null)
const showDetailsModal = ref(false)
const selectedEvent = ref(null)
const eventAttendees = ref([])
const eventReviews = ref([])
const filterEventId = ref(null)
const managedEventTitle = ref('')
const showEventDropdown = ref(false)
const router = useRouter()
// event types (defaults + custom)
const { allTypes } = useEventTypes()

// Google Maps for partner event location picker
const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
const partnerMapEl = ref(null)
let partnerMap = null
let partnerMarker = null
let partnerPlacesAutocomplete = null
let partnerGeocoder = null

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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding`
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

async function initPartnerMap() {
  if (!GMAPS_API_KEY) return
  try {
    const g = await loadGoogleMapsPartner(GMAPS_API_KEY)
    const center = { lat: -37.8136, lng: 144.9631 }
    partnerMap = new g.Map(partnerMapEl.value, { center, zoom: 13, streetViewControl: false })
    partnerMarker = new g.Marker({ map: partnerMap })
    partnerGeocoder = new g.Geocoder()
    partnerMap.addListener('click', (ev) => {
      const lat = ev.latLng.lat()
      const lng = ev.latLng.lng()
      form.value.lat = lat
      form.value.lng = lng
      partnerMarker.setPosition({ lat, lng })

      // Reverse geocode the selected coordinates to get an address
      partnerGeocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          form.value.location = results[0].formatted_address || ''
          // Update the autocomplete input field value manually to reflect the new address
          const locInput = document.getElementById('partner-location-input')
          if (locInput) locInput.value = form.value.location
        } else {
          console.warn('Geocoder failed due to: ' + status)
          form.value.location = '' // Clear location on geocoding failure
        }
      })
    })
    // Autocomplete for location input
    const locInput = document.getElementById('partner-location-input')
    if (locInput) {
      partnerPlacesAutocomplete = new g.places.Autocomplete(locInput)
      partnerPlacesAutocomplete.addListener('place_changed', () => {
        const place = partnerPlacesAutocomplete.getPlace()
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
    console.warn('Partner map init failed', err)
  }
}

watch(showCreate, (v) => {
  if (v) setTimeout(() => initPartnerMap(), 300)
})

function handleAuthChanged(e) {
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
    loadAll()
  } catch (error) {
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('mm-auth-changed', handleAuthChanged)
  loadAll()
})
onUnmounted(() => {
  window.removeEventListener('mm-auth-changed', handleAuthChanged)
  try {
    if (unsubEvents) unsubEvents()
  } catch {}
  try {
    if (unsubBookings) unsubBookings()
  } catch {}
  try {
    if (unsubReviews) unsubReviews()
  } catch {}
})

function loadAll() {
  loadEvents()
  loadBookings()
  loadReviews()
}

function loadEvents() {
  try {
    if (unsubEvents) {
      try {
        unsubEvents()
      } catch {}
    }
    const user = auth.currentUser
    const ownerUid = user ? user.uid : ''
    if (!ownerUid) {
      myEvents.value = []
      return
    }
    const q = query(collection(db, 'events'), where('ownerUid', '==', ownerUid))
    unsubEvents = onSnapshot(
      q,
      (snap) => {
        const list = []
        snap.forEach((d) => {
          const data = d.data()
          list.push({
            id: d.id,
            ...data,
            dateTime: data.dateTime?.toDate() || data.dateTime,
          })
        })
        // Sort by dateTime on client side to avoid Firebase index requirement
        list.sort((a, b) => {
          const dateA = new Date(a.dateTime)
          const dateB = new Date(b.dateTime)
          return dateA - dateB
        })
        myEvents.value = list
      },
      (error) => {
        console.error('Error fetching partner events:', error)
        myEvents.value = []
      },
    )
  } catch (error) {
    console.error('Error setting up events subscription:', error)
    myEvents.value = []
  }
}

function loadBookings() {
  try {
    if (unsubBookings) {
      try {
        unsubBookings()
      } catch {}
    }
    const q = query(collection(db, 'bookings'))
    unsubBookings = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => {
        const data = d.data() || {}
        list.push({
          id: d.id,
          ...data,
          // normalized fields for UI
          email: data.userEmail || data.email || '',
          name: data.snapshot?.title || data.name || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        })
      })
      allBookings.value = list
    })
  } catch (error) {
    allBookings.value = []
  }
}

function loadReviews() {
  try {
    if (unsubReviews) {
      try {
        unsubReviews()
      } catch {}
    }
    const q = query(collection(db, 'reviews'))
    unsubReviews = onSnapshot(q, (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      allReviews.value = list
    })
  } catch (error) {
    allReviews.value = []
  }
}

function resetForm() {
  form.value = {
    title: '',
    location: '',
    date: '',
    time: '',
    capacity: 10,
    lat: null,
    lng: null,
    type: 'yoga',
  }
  editingId.value = null
}

// createEvent removed - now using separate PartnerEventCreate.vue page with Firebase

function editEvent(id) {
  try {
    router.push({ name: 'partner-edit', params: { id } })
  } catch (err) {
    console.warn('Edit event failed', err)
  }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return
  try {
    await deleteDoc(doc(db, 'events', id))
  } catch (error) {
    alert('Failed to delete this event')
  }
}

function bookedCountFor(ev) {
  return allBookings.value.filter((b) => b.eventId === ev.id && b.status === 'booked').length
}

// KPIs
const totalBookingsThisMonth = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 1)
  const myIds = new Set(myEvents.value.map((e) => e.id))
  return allBookings.value.filter((b) => {
    const t = new Date(b.createdAt)
    const matchesId = myIds.has(String(b.eventId))
    return matchesId && t >= start && t < end
  }).length
})

const activeEvents = computed(() => {
  const now = new Date()
  return myEvents.value.filter((e) => new Date(e.dateTime) >= now).length
})

// Reviews: only compute from actual user reviews; if none, show zeros
const newReviews = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 1)
  const myIds = new Set(myEvents.value.map((e) => e.id))
  return allReviews.value.filter((r) => {
    const rid = String(r.eventId || '').replace(/^pe_/, '')
    const when = new Date(r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt)
    return myIds.has(rid) && when >= start && when < end
  }).length
})

const averageRating = computed(() => {
  const myIds = new Set(myEvents.value.map((e) => e.id))
  const mine = allReviews.value.filter((r) =>
    myIds.has(String(r.eventId || '').replace(/^pe_/, '')),
  )
  if (mine.length === 0) return '0.0'
  const avg = mine.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / mine.length
  return avg.toFixed(1)
})

// Split events into upcoming (today and future) and past (before today)
function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const upcomingEvents = computed(() => {
  const start = getStartOfToday()
  return myEvents.value
    .filter((e) => new Date(e.dateTime) >= start)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
})

const pastEvents = computed(() => {
  const start = getStartOfToday()
  return myEvents.value
    .filter((e) => new Date(e.dateTime) < start)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
})

// Activity feed (latest 5)
const recentFeed = computed(() => {
  const myIds = new Set(myEvents.value.map((e) => e.id))
  const items = []

  // Add booking activities
  allBookings.value
    .filter((b) => myIds.has(String(b.eventId)))
    .forEach((b) => {
      const when = new Date(b.createdAt).toLocaleString()
      items.push({
        type: 'booking',
        createdAt: b.createdAt,
        message: `${b.email || 'Someone'} just booked your event. (${when})`,
      })
    })

  // Add review activities
  allReviews.value
    .filter((r) => myIds.has(String(r.eventId || '').replace(/^pe_/, '')))
    .forEach((r) => {
      const when = new Date(
        r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt,
      ).toLocaleString()
      const event = myEvents.value.find((e) => e.id === String(r.eventId || '').replace(/^pe_/, ''))
      const eventTitle = event ? event.title : 'an event'
      items.push({
        type: 'review',
        createdAt: r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt,
        message: `${r.reviewerEmail || r.email || 'Someone'} reviewed your event ${eventTitle} with ${r.rating} stars. (${when})`,
      })
    })

  // Sort all items by creation date, most recent first
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (items.length === 0) {
    return ['No recent activity. Create an event to start receiving bookings or reviews.']
  }
  return items.map((item) => item.message)
})

// Registered Users
const registeredUsers = computed(() => {
  const myEventIds = new Set(myEvents.value.map((e) => e.id))
  return allBookings.value.filter((b) => myEventIds.has(String(b.eventId)))
})

// Registered Users displayed with optional event filter
const displayedRegisteredUsers = computed(() => {
  if (!filterEventId.value) return registeredUsers.value
  const id = filterEventId.value
  return registeredUsers.value.filter((b) => String(b.eventId) === String(id))
})

function contactUser(booking) {
  alert(
    `Contacting ${booking.email || 'User'}. In a real app, this would open an email client or messaging interface.`,
  )
}

async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    })
    alert('Booking cancelled successfully!')
  } catch (error) {
    alert('Failed to cancel booking.')
  }
}

// function viewEventDetails(id) {
//   selectedEvent.value = myEvents.value.find((e) => e.id === id)
//   if (!selectedEvent.value) return
//
//   // Filter attendees for this event
//   eventAttendees.value = allBookings.value.filter(
//     (b) =>
//       b.activityId === selectedEvent.value.id || b.activityId === `pe_${selectedEvent.value.id}`,
//   )
//
//   // Filter reviews for this event
//   eventReviews.value = allReviews.value.filter(
//     (r) => String(r.activityId || '').replace(/^pe_/, '') === selectedEvent.value.id,
//   )
//
//   showDetailsModal.value = true
// }

function manageEvent(id) {
  filterEventId.value = id
  const ev = myEvents.value.find((e) => e.id === id)
  managedEventTitle.value = ev ? ev.title : ''
  setTimeout(() => {
    const el = document.getElementById('events-and-feed-section')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

function clearManageFilter() {
  filterEventId.value = null
  managedEventTitle.value = ''
}

function toggleEventDropdown() {
  showEventDropdown.value = !showEventDropdown.value
}

function selectFilterEvent(id) {
  showEventDropdown.value = false
  if (id) {
    manageEvent(id)
  } else {
    clearManageFilter()
  }
}

// New functions for CSV export and bulk email
function exportToCsv() {
  if (displayedRegisteredUsers.value.length === 0) {
    alert('No users to export.')
    return
  }

  const headers = ['User Email', 'Activity Title', 'Registered At']
  const rows = displayedRegisteredUsers.value.map((user) => [
    user.email,
    user.name,
    new Date(user.createdAt).toLocaleString(),
  ])

  let csvContent = headers.join(',') + '\n'
  rows.forEach((row) => {
    csvContent += row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n'
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `registered_users_${managedEventTitle.value || 'all'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    alert('Exported to CSV successfully!')
  } else {
    alert('Your browser does not support downloading files directly.')
  }
}

function sendBulkEmail() {
  if (displayedRegisteredUsers.value.length === 0) {
    alert('No users to email.')
    return
  }
  const emails = displayedRegisteredUsers.value.map((user) => user.email).join('; ')
  alert(
    `Simulating bulk email to the following users:\n${emails}\n\n(In a real application, this would send actual emails.)`,
  )
}

// New functions for bulk booking cancellation
const selectedBookings = ref([])
const sortBy = ref('')
const sortDir = ref('asc') // 'asc' or 'desc'

const sortedRegisteredUsers = computed(() => {
  const arr = [...displayedRegisteredUsers.value]
  if (!sortBy.value) return arr
  arr.sort((a, b) => {
    let va = a[sortBy.value]
    let vb = b[sortBy.value]
    // normalize dates
    if (sortBy.value === 'createdAt') {
      va = new Date(a.createdAt).getTime() || 0
      vb = new Date(b.createdAt).getTime() || 0
    }
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return arr
})

const allSelected = computed(() => {
  return (
    sortedRegisteredUsers.value.length > 0 &&
    selectedBookings.value.length === sortedRegisteredUsers.value.length
  )
})

function toggleAll() {
  // If not all currently selected, select all; otherwise clear selection
  if (!allSelected.value) {
    selectedBookings.value = sortedRegisteredUsers.value.map((b) => b.id)
  } else {
    selectedBookings.value = []
  }
}

function toggleBookingSelection(bookingId) {
  const index = selectedBookings.value.indexOf(bookingId)
  if (index > -1) {
    selectedBookings.value.splice(index, 1)
  } else {
    selectedBookings.value.push(bookingId)
  }
}

function toggleSort(key) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'asc'
  }
}

// Events sorting
const eventsSortBy = ref('')
const eventsSortDir = ref('asc')

const sortedUpcomingEvents = computed(() => {
  const arr = [...upcomingEvents.value]
  if (!eventsSortBy.value) return arr
  arr.sort((a, b) => {
    let va, vb
    if (eventsSortBy.value === 'title') {
      va = (a.title || '').toLowerCase()
      vb = (b.title || '').toLowerCase()
    } else if (eventsSortBy.value === 'dateTime') {
      va = new Date(a.dateTime).getTime() || 0
      vb = new Date(b.dateTime).getTime() || 0
    } else if (eventsSortBy.value === 'booked') {
      va = bookedCountFor(a)
      vb = bookedCountFor(b)
    } else {
      va = a[eventsSortBy.value]
      vb = b[eventsSortBy.value]
    }
    if (va < vb) return eventsSortDir.value === 'asc' ? -1 : 1
    if (va > vb) return eventsSortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return arr
})

function toggleEventsSort(key) {
  if (eventsSortBy.value === key) {
    eventsSortDir.value = eventsSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    eventsSortBy.value = key
    eventsSortDir.value = 'asc'
  }
}

// bulkCancelBookings removed per request
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">Partner Dashboard</h1>

    <!-- KPI Row -->
    <div class="row g-3 align-items-stretch mb-3">
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ totalBookingsThisMonth }}</div>
            <div class="small text-muted">Total Bookings (This Month)</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ activeEvents }}</div>
            <div class="small text-muted">Active Events</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ newReviews }}</div>
            <div class="small text-muted">New Reviews</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-5 fw-bold">{{ averageRating }}★</div>
            <div class="small text-muted">Average Rating</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create form -->
    <div
      v-if="showCreate"
      class="card mb-3"
      id="create-event-form-section"
      style="scroll-margin-top: 70px"
    >
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-2">
            <label class="form-label small">Title</label>
            <input v-model="form.title" class="form-control" placeholder="Beginner's Yoga" />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label small">Location</label>
            <input
              id="partner-location-input"
              v-model="form.location"
              class="form-control"
              placeholder="Carlton Gardens"
            />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label small">Type</label>
            <select v-model="form.type" class="form-select">
              <option value="yoga">Yoga</option>
              <option v-for="t in allTypes" :key="t" :value="t">
                {{ t.charAt(0).toUpperCase() + t.slice(1) }}
              </option>
            </select>
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
          <div class="col-6 col-md-1 d-grid">
            <button class="btn btn-success" @click="createEvent">Save</button>
          </div>
        </div>
        <div class="mt-3">
          <small class="text-muted">Or pick location on map:</small>
          <div ref="partnerMapEl" class="border rounded mt-2" style="height: 220px"></div>
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

    <div class="row g-3" id="events-and-feed-section" style="scroll-margin-top: 55px">
      <div class="col-12 col-xl-7">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title mb-0">Upcoming Events Schedule</h5>
              <button
                class="btn btn-primary btn-sm"
                @click.prevent="router.push({ name: 'partner-create' })"
              >
                + Create New Event
              </button>
            </div>
            <div class="table-responsive" style="max-height: 230px; overflow-y: auto">
              <table class="table align-middle">
                <thead>
                  <tr
                    style="
                      position: sticky;
                      top: 0;
                      background-color: var(--mm-surface);
                      z-index: 1;
                    "
                  >
                    <th>
                      <button class="btn btn-link p-0" @click.prevent="toggleEventsSort('title')">
                        Event Name
                        <span v-if="eventsSortBy === 'title'" class="sort-indicator">{{
                          eventsSortDir === 'asc' ? '▲' : '▼'
                        }}</span>
                      </button>
                    </th>
                    <th style="width: 160px">
                      <button
                        class="btn btn-link p-0"
                        @click.prevent="toggleEventsSort('dateTime')"
                      >
                        Date
                        <span v-if="eventsSortBy === 'dateTime'" class="sort-indicator">{{
                          eventsSortDir === 'asc' ? '▲' : '▼'
                        }}</span>
                      </button>
                    </th>
                    <th style="width: 170px">
                      <button class="btn btn-link p-0" @click.prevent="toggleEventsSort('booked')">
                        Booked / Capacity
                        <span v-if="eventsSortBy === 'booked'" class="sort-indicator">{{
                          eventsSortDir === 'asc' ? '▲' : '▼'
                        }}</span>
                      </button>
                    </th>
                    <th style="width: 180px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ev in sortedUpcomingEvents" :key="ev.id">
                    <td>{{ ev.title }}</td>
                    <td>{{ new Date(ev.dateTime).toLocaleString() }}</td>
                    <td>{{ bookedCountFor(ev) }} / {{ ev.capacity }}</td>
                    <td>
                      <div class="d-flex align-items-center">
                        <button
                          class="icon-btn soft text-secondary me-2"
                          @click="editEvent(ev.id)"
                          title="Edit event"
                          aria-label="Edit event"
                        >
                          <!-- pencil icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M12.146.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.793 9.793a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168L12.146.146zM11.207 2L3 10.207V13h2.793L14 4.793 11.207 2z"
                            />
                          </svg>
                        </button>
                        <button
                          class="icon-btn soft text-success me-2"
                          @click="manageEvent(ev.id)"
                          title="Manage event"
                          aria-label="Manage event"
                        >
                          <!-- eye icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8z" />
                            <path d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" fill="#fff" />
                          </svg>
                        </button>
                        <button
                          class="icon-btn soft text-danger"
                          @click="deleteEvent(ev.id)"
                          title="Delete event"
                          aria-label="Delete event"
                        >
                          <!-- trash icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7z"
                            />
                            <path
                              fill-rule="evenodd"
                              d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2h3.11a1 1 0 0 1 .98-.79h2.82c.44 0 .82.31.98.79H14.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="upcomingEvents.length === 0">
                    <td colspan="4" class="text-muted">
                      No events yet. Use "Create New Event" to add your first activity.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-5">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <h5 class="card-title">Recent Activity Feed</h5>
            <div class="d-flex flex-column gap-2" style="max-height: 250px; overflow-y: auto">
              <div
                v-for="(msg, i) in recentFeed"
                :key="i"
                class="mm-surface px-3 py-2 rounded border small"
              >
                {{ msg }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Registered Users section -->
    <div class="card mm-surface mt-4" id="registered-users-section">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Registered Users</h5>
          <div class="d-flex align-items-center gap-2">
            <div class="position-relative">
              <button
                class="btn btn-sm btn-success d-flex align-items-center"
                @click.prevent="toggleEventDropdown"
                aria-haspopup="true"
                :aria-expanded="showEventDropdown"
              >
                <span class="me-2">{{ managedEventTitle || 'Managing' }}</span>
                <span class="small">▾</span>
              </button>
              <div
                v-if="showEventDropdown"
                class="dropdown-menu show"
                style="
                  position: absolute;
                  right: 0;
                  top: calc(100% + 6px);
                  z-index: 1050;
                  min-width: 12rem;
                "
              >
                <button
                  class="dropdown-item"
                  v-for="ev in myEvents"
                  :key="ev.id"
                  @click.prevent="selectFilterEvent(ev.id)"
                >
                  {{ ev.title }}
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item text-muted" @click.prevent="selectFilterEvent(null)">
                  Show all events
                </button>
              </div>
            </div>
            <button class="btn btn-sm btn-info" @click="exportToCsv">Export CSV</button>
            <button class="btn btn-sm btn-secondary" @click="sendBulkEmail">Bulk Email</button>
            <button class="btn btn-sm btn-outline-secondary" @click="clearManageFilter">
              Clear filter
            </button>
          </div>
        </div>
        <div class="table-responsive" style="max-height: 230px; overflow-y: auto">
          <table class="table align-middle">
            <thead>
              <tr style="position: sticky; top: 0; background-color: var(--mm-surface); z-index: 1">
                <th style="width: 30px">
                  <input type="checkbox" :checked="allSelected" @change="toggleAll" />
                </th>
                <th>
                  <button class="btn btn-link p-0" @click.prevent="toggleSort('email')">
                    User Email
                    <span v-if="sortBy === 'email'" class="sort-indicator">{{
                      sortDir === 'asc' ? '▲' : '▼'
                    }}</span>
                  </button>
                </th>
                <th>
                  <button class="btn btn-link p-0" @click.prevent="toggleSort('name')">
                    Activity Title
                    <span v-if="sortBy === 'name'" class="sort-indicator">{{
                      sortDir === 'asc' ? '▲' : '▼'
                    }}</span>
                  </button>
                </th>
                <th>
                  <button class="btn btn-link p-0" @click.prevent="toggleSort('createdAt')">
                    Registered At
                    <span v-if="sortBy === 'createdAt'" class="sort-indicator">{{
                      sortDir === 'asc' ? '▲' : '▼'
                    }}</span>
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in sortedRegisteredUsers" :key="booking.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="selectedBookings.includes(booking.id)"
                    @change="toggleBookingSelection(booking.id)"
                  />
                </td>
                <td>{{ booking.email }}</td>
                <td>{{ booking.name }}</td>
                <td>{{ new Date(booking.createdAt).toLocaleString() }}</td>
                <td>
                  <div class="btn-group" role="group">
                    <button
                      class="icon-btn soft text-success me-2"
                      @click="contactUser(booking)"
                      title="Contact user"
                      aria-label="Contact user"
                    >
                      <!-- envelope icon -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5L8 9 0 5.5V4z" />
                        <path
                          d="M0 6.697V12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.697l-7.555 4.07a1 1 0 0 1-.89 0L0 6.697z"
                        />
                      </svg>
                    </button>
                    <button
                      class="icon-btn soft text-danger"
                      @click="cancelBooking(booking.id)"
                      title="Cancel booking"
                      aria-label="Cancel booking"
                    >
                      <!-- trash icon -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path
                          d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-7z"
                        />
                        <path
                          fill-rule="evenodd"
                          d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2h3.11a1 1 0 0 1 .98-.79h2.82c.44 0 .82.31.98.79H14.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118z"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="displayedRegisteredUsers.length === 0">
                <td colspan="5" class="text-muted">No users registered for your events yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Past Events -->
    <div class="row g-3 mt-3">
      <div class="col-12">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <h5 class="card-title mb-0">Past Events</h5>
            <div class="table-responsive mt-3">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th style="width: 140px">Booked / Capacity</th>
                    <th style="width: 180px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ev in pastEvents" :key="ev.id">
                    <td>{{ ev.title }}</td>
                    <td>{{ new Date(ev.dateTime).toLocaleString() }}</td>
                    <td>{{ bookedCountFor(ev) }} / {{ ev.capacity }}</td>
                    <td>
                      <div class="btn-group btn-group-sm" role="group">
                        <button
                          class="icon-btn soft text-secondary me-2"
                          @click="editEvent(ev.id)"
                          title="Edit event"
                          aria-label="Edit event"
                        >
                          <!-- pencil icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M12.146.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.793 9.793a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168L12.146.146zM11.207 2L3 10.207V13h2.793L14 4.793 11.207 2z"
                            />
                          </svg>
                        </button>
                        <button
                          class="icon-btn soft text-success"
                          @click="router.push({ name: 'activity-details', params: { id: ev.id } })"
                          title="View details"
                          aria-label="View details"
                        >
                          <!-- eye icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8z" />
                            <path d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" fill="#fff" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="pastEvents.length === 0">
                    <td colspan="4" class="text-muted">No past events.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Details Modal -->
    <div
      v-if="showDetailsModal"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-labelledby="eventDetailsModalLabel"
      aria-hidden="true"
      style="background-color: rgba(0, 0, 0, 0.5)"
      @click.self="showDetailsModal = false"
    >
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="eventDetailsModalLabel">
              Event Details: {{ selectedEvent?.title }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="showDetailsModal = false"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <h6>Attendees</h6>
            <ul class="list-group mb-3">
              <li v-if="eventAttendees.length === 0" class="list-group-item text-muted">
                No attendees for this event.
              </li>
              <li
                v-for="att in eventAttendees"
                :key="att.id"
                class="list-group-item d-flex justify-content-between align-items-center"
              >
                {{ att.email }} - {{ att.name }} ({{ att.attendees }} attendees)
                <button class="btn btn-sm btn-outline-danger" @click="cancelBooking(att.id)">
                  Cancel Booking
                </button>
              </li>
            </ul>

            <h6>Reviews</h6>
            <ul class="list-group">
              <li v-if="eventReviews.length === 0" class="list-group-item text-muted">
                No reviews for this event yet.
              </li>
              <li v-for="rev in eventReviews" :key="rev.id" class="list-group-item">
                <strong>{{ rev.email }}</strong> rated {{ rev.rating }} stars: "{{ rev.comment }}"
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.sort-indicator {
  display: inline-block;
  margin-left: 6px;
  font-size: 0.8rem;
  color: var(--mm-muted, #6c757d);
}
.btn-link.p-0 {
  color: var(--bs-body-color, #212529);
  text-decoration: none;
}
.btn-link.p-0:hover {
  text-decoration: underline;
}
.icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn svg {
  width: 20px;
  height: 20px;
}
.icon-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
}
.icon-btn:focus {
  outline: 2px solid rgba(0, 123, 255, 0.25);
  outline-offset: 2px;
}
.icon-btn.soft {
  border-radius: 4.5px;
  padding: 4.5px;
}
.icon-btn.soft.text-success {
  background-color: rgba(88, 129, 87, 0.1);
}
.icon-btn.soft.text-danger {
  background-color: rgba(220, 53, 69, 0.06);
}
.icon-btn.soft.text-secondary {
  background-color: rgba(108, 117, 125, 0.06);
}
.icon-btn.soft:hover {
  filter: brightness(0.95);
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCurrentUser } from '../composables/useAuth'
defineOptions({ name: 'ProgressPage' })

// Storage keys
const STORAGE_KEY = 'a12_demo_events_v1'
const REVIEWS_KEY = 'mm_reviews_v1'
const PARTNER_EVENTS_KEY = 'partner_events_v1'

// State
const currentUser = ref(getCurrentUser())
const events = ref([])
const reviews = ref([])
const partnerEvents = ref([])

// Per-row rating input map
const newMoodById = ref({})
const hoverById = ref({})

function handleAuthChanged(e) {
  try {
    currentUser.value = e && e.detail ? e.detail : getCurrentUser()
    loadEvents()
    loadReviews()
  } catch (error) {
    currentUser.value = getCurrentUser()
  }
}

onMounted(() => {
  window.addEventListener('mm-auth-changed', handleAuthChanged)
  window.addEventListener('storage', handleStorage)
  loadEvents()
  loadReviews()
  loadPartnerEvents()
})
onUnmounted(() => {
  window.removeEventListener('mm-auth-changed', handleAuthChanged)
  window.removeEventListener('storage', handleStorage)
})

function handleStorage(e) {
  if (
    e.key === STORAGE_KEY ||
    e.key === REVIEWS_KEY ||
    e.key === PARTNER_EVENTS_KEY ||
    e.key === 'mm_current_user'
  ) {
    loadEvents()
    loadReviews()
    loadPartnerEvents()
  }
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : []
    if (currentUser.value && currentUser.value.email) {
      events.value = all
        .filter((ev) => (ev.email || '').toLowerCase() === currentUser.value.email.toLowerCase())
        .sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1))
    } else {
      events.value = []
    }
  } catch (error) {
    events.value = []
  }
}

function loadReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    const all = raw ? JSON.parse(raw) : []
    if (currentUser.value && currentUser.value.email) {
      reviews.value = all.filter(
        (r) => (r.email || '').toLowerCase() === currentUser.value.email.toLowerCase(),
      )
    } else {
      reviews.value = []
    }
  } catch (error) {
    reviews.value = []
  }
}

function loadPartnerEvents() {
  try {
    const raw = localStorage.getItem(PARTNER_EVENTS_KEY)
    partnerEvents.value = raw ? JSON.parse(raw) : []
  } catch (error) {
    partnerEvents.value = []
  }
}

function getEventStartDateTime(ev) {
  if (ev && ev.dateTime) return ev.dateTime
  // try look up partner event by normalized id
  const id = ev && ev.activityId ? String(ev.activityId).replace(/^pe_/, '') : null
  if (id) {
    const found = partnerEvents.value.find((e) => e.id === id)
    if (found && found.dateTime) return found.dateTime
  }
  // fallback to createdAt as a last resort
  return ev && ev.createdAt ? ev.createdAt : null
}

// Derived analytics
const totalActivities = computed(() => events.value.length)

const activityFrequency = computed(() => {
  const freq = new Map()
  for (const ev of events.value) {
    const key = ev.name || 'Activity'
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  let top = { name: 'N/A', count: 0 }
  for (const [name, count] of freq.entries()) {
    if (count > top.count) top = { name, count }
  }
  return top
})

// Simple deterministic "mood" from event id so UI is stable without extra inputs (range 3-5)
function pseudoMoodFromId(id) {
  if (!id) return 4
  let sum = 0
  for (let i = 0; i < String(id).length; i++) sum += String(id).charCodeAt(i)
  return 3 + (sum % 3) // 3,4,5
}

const moodRatings = computed(() => {
  const dist = { 3: 0, 4: 0, 5: 0 }
  for (const ev of events.value) {
    const review = reviews.value.find(
      (r) => r.activityId === ev.activityId || r.bookingId === ev.id,
    )
    if (review) {
      const m = Number(review.rating) || 0
      if (m >= 3 && m <= 5) dist[m] = (dist[m] || 0) + 1
    }
  }
  return dist
})

const averageMood = computed(() => {
  // Only include reviews that correspond to this user's bookings (events.value)
  const bookingIds = new Set(events.value.map((e) => e.id))
  const relevant = reviews.value.filter((r) => bookingIds.has(r.bookingId))
  if (relevant.length === 0) return '0.0'
  let total = 0
  let count = 0
  for (const r of relevant) {
    const rating = Number(r.rating)
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      total += rating
      count++
    }
  }
  return count === 0 ? '0.0' : (total / count).toFixed(1)
})

function getMoodRatingForBooking(bookingId) {
  // Prefer an explicit review linked to the bookingId; otherwise accept a review the user made for the same activity
  const foundByBooking = reviews.value.find((r) => r.bookingId === bookingId)
  if (foundByBooking) return foundByBooking.rating
  // fallback: if this review was made for the activity (no bookingId), match on activityId
  const booking = events.value.find((e) => e.id === bookingId)
  if (!booking) return null
  const foundByActivity = reviews.value.find(
    (r) => String(r.activityId).replace(/^pe_/, '') === String(booking.activityId),
  )
  return foundByActivity ? foundByActivity.rating : null
}

function submitMoodRating(booking, rating) {
  if (!rating || rating < 1 || rating > 5) {
    alert('Please select a rating between 1 and 5.')
    return
  }
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const existingIndex = all.findIndex(
      (r) => r.bookingId === booking.id && r.email === booking.email,
    )

    const newReview = {
      id: crypto.randomUUID(),
      bookingId: booking.id,
      activityId: booking.activityId, // use original activity id for linking to partner events
      email: booking.email,
      rating: Number(rating),
      createdAt: new Date().toISOString(),
    }

    if (existingIndex > -1) {
      all[existingIndex] = newReview
    } else {
      all.push(newReview)
    }
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all))
    loadReviews() // Reload reviews to update UI
    // clear cached input
    try {
      delete newMoodById.value[booking.id]
    } catch (_) {}
    alert('Mood rating submitted!')
  } catch (error) {
    console.error('Failed to submit mood rating', error)
    alert('Failed to submit mood rating.')
  }
}

function canRate(booking) {
  const dtStr = getEventStartDateTime(booking)
  if (!dtStr) return false
  const dt = new Date(dtStr)
  if (Number.isNaN(dt.getTime())) return false
  const now = new Date()
  if (dt > now) return false

  // disallow rating if the user has already left a review for this booking or for the same activity
  const existing = getMoodRatingForBooking(booking.id)
  return existing == null
}

function hoverStar(id, n) {
  hoverById.value[id] = n || 0
}

const activeStreak = computed(() => {
  // Count consecutive active weeks including this week
  if (events.value.length === 0) return 0
  const dates = events.value
    .map((e) => new Date(e.createdAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a)
  let streak = 0
  let weekCursor = new Date()
  weekCursor.setHours(0, 0, 0, 0)
  const day = weekCursor.getDay()
  const diffToMon = (day + 6) % 7
  weekCursor.setDate(weekCursor.getDate() - diffToMon) // Monday of this week
  let idx = 0
  while (true) {
    const nextWeek = new Date(weekCursor)
    nextWeek.setDate(weekCursor.getDate() + 7)
    let found = false
    while (idx < dates.length) {
      const d = dates[idx]
      if (d >= weekCursor && d < nextWeek) {
        found = true
        idx++
      } else if (d < weekCursor) {
        break
      } else {
        idx++
      }
      if (found) break
    }
    if (found) streak++
    else break
    weekCursor.setDate(weekCursor.getDate() - 7)
  }
  return streak
})

// Time-series for bar (count) + line (avg mood) by month over last 6 months
const seriesData = computed(() => {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString(undefined, { month: 'short' })
    const start = new Date(d)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const items = events.value.filter((e) => {
      const t = new Date(e.createdAt)
      return t >= start && t < end
    })
    const count = items.length
    const moodAvg = items.length
      ? items.reduce((s, e) => {
          const review = reviews.value.find(
            (r) => r.activityId === e.activityId || r.bookingId === e.id,
          )
          return s + (review ? Number(review.rating) : pseudoMoodFromId(e.id))
        }, 0) / items.length
      : 0
    out.push({ label, count, mood: moodAvg })
  }
  return out
})

// Pie chart helpers
function computePieArcs(values) {
  const total = values.reduce((s, v) => s + v, 0) || 1
  let acc = 0
  return values.map((v) => {
    const start = (acc / total) * Math.PI * 2
    acc += v
    const end = (acc / total) * Math.PI * 2
    return { start, end }
  })
}

const activityTypes = computed(() => {
  // naive grouping by keywords inside name
  const types = { yoga: 0, walk: 0, meditation: 0, creative: 0, other: 0 }
  for (const ev of events.value) {
    const name = (ev.name || '').toLowerCase()
    if (name.includes('yoga')) types.yoga++
    else if (name.includes('walk')) types.walk++
    else if (name.includes('meditation')) types.meditation++
    else if (name.includes('creative') || name.includes('workshop')) types.creative++
    else types.other++
  }
  return types
})

const activityTypeValues = computed(() => Object.values(activityTypes.value))
const moodDistValues = computed(() => [
  moodRatings.value[3],
  moodRatings.value[4],
  moodRatings.value[5],
])
</script>

<template>
  <main class="container py-4">
    <h1 class="fw-bold mb-3">My Progress</h1>

    <!-- Top filters (UI placeholders) -->
    <div class="d-flex flex-wrap gap-2 mb-3">
      <select class="form-select form-select-sm w-auto">
        <option>Last 30 days</option>
        <option>Last 90 days</option>
        <option>All time</option>
      </select>
      <select class="form-select form-select-sm w-auto">
        <option>All types</option>
        <option>Yoga</option>
        <option>Walk</option>
        <option>Meditation</option>
        <option>Creative</option>
      </select>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-xl-7">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <h5 class="card-title">Activity & Mood Correlation</h5>
            <svg :width="'100%'" height="240" viewBox="0 0 640 240" preserveAspectRatio="none">
              <rect x="0" y="0" width="640" height="240" fill="var(--mm-paper, #fff)" />
              <!-- Bars -->
              <g>
                <template v-for="(pt, idx) in seriesData" :key="'bar' + idx">
                  <rect
                    :x="40 + idx * 90"
                    :y="200 - pt.count * 30"
                    width="40"
                    :height="pt.count * 30"
                    fill="var(--mm-green,#588157)"
                    opacity="0.8"
                  />
                  <text :x="60 + idx * 90" y="220" font-size="10" text-anchor="middle">
                    {{ pt.label }}
                  </text>
                </template>
              </g>
              <!-- Line -->
              <polyline
                :points="
                  seriesData.map((pt, idx) => `${60 + idx * 90},${200 - pt.mood * 30}`).join(' ')
                "
                fill="none"
                stroke="var(--mm-forest,#344e41)"
                stroke-width="2"
              />
            </svg>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="card mm-surface h-100">
          <div class="card-body">
            <h5 class="card-title mb-3">Activity Types & Mood Ratings</h5>
            <div class="d-flex gap-3 flex-wrap align-items-center">
              <!-- Activity Types Pie -->
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="80" fill="#f1f3f5" />
                <template v-for="(arc, i) in computePieArcs(activityTypeValues)" :key="'a' + i">
                  <path
                    :d="piePath(90, 90, 80, arc.start, arc.end)"
                    :fill="piePalette[i % piePalette.length]"
                  />
                </template>
                <text x="90" y="95" text-anchor="middle" class="small">Types</text>
              </svg>
              <!-- Mood Ratings Pie -->
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="80" fill="#f1f3f5" />
                <template v-for="(arc, i) in computePieArcs(moodDistValues)" :key="'m' + i">
                  <path
                    :d="piePath(90, 90, 80, arc.start, arc.end)"
                    :fill="piePalette[(i + 2) % piePalette.length]"
                  />
                </template>
                <text x="90" y="95" text-anchor="middle" class="small">Mood</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-6 fw-bold">{{ totalActivities }}</div>
            <div class="text-muted small">Total Activities Attended</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="h3 fw-bold text-capitalize">{{ activityFrequency.name || 'N/A' }}</div>
            <div class="text-muted small">Most Frequent Activity</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-6 fw-bold">{{ averageMood }}</div>
            <div class="text-muted small">Average Mood</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="card text-center mm-surface h-100">
          <div class="card-body">
            <div class="display-6 fw-bold">{{ activeStreak }}</div>
            <div class="text-muted small">Active Streak (weeks)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity history -->
    <div class="card mm-surface">
      <div class="card-body">
        <h5 class="card-title">Activity History</h5>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Mood rating</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in events" :key="ev.id">
                <td>{{ ev.name }}</td>
                <td>{{ new Date(getEventStartDateTime(ev)).toLocaleString() }}</td>
                <td>
                  <template v-if="getMoodRatingForBooking(ev.id) !== null">
                    <div class="star-display">
                      <span
                        v-for="n in 5"
                        :key="n"
                        class="star"
                        :class="{ active: n <= getMoodRatingForBooking(ev.id) }"
                      >
                        ★
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <template v-if="canRate(ev)">
                      <div class="star-input d-inline-block me-2">
                        <span
                          v-for="n in 5"
                          :key="n"
                          class="star"
                          :class="{ active: (hoverById[ev.id] || newMoodById[ev.id] || 0) >= n }"
                          @mouseover="hoverStar(ev.id, n)"
                          @mouseleave="hoverStar(ev.id, 0)"
                          @click="newMoodById[ev.id] = n"
                          role="button"
                          aria-label="Rate {{ n }}"
                          tabindex="0"
                        >
                          ★
                        </span>
                      </div>
                      <button
                        class="btn btn-sm btn-outline-primary"
                        :disabled="!newMoodById[ev.id]"
                        @click="submitMoodRating(ev, newMoodById[ev.id])"
                      >
                        Submit
                      </button>
                    </template>
                    <span v-else class="text-muted small">Available after event</span>
                  </template>
                </td>
                <td><button class="btn btn-sm btn-outline-secondary">View Details</button></td>
              </tr>
              <tr v-if="events.length === 0">
                <td colspan="4" class="text-muted">No activity yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
// Non-reactive helpers for pie path and palette (outside setup to avoid recreation)
export default {
  methods: {
    piePath(cx, cy, r, start, end) {
      const x1 = cx + r * Math.cos(start)
      const y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(end)
      const y2 = cy + r * Math.sin(end)
      const largeArc = end - start > Math.PI ? 1 : 0
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    },
  },
  computed: {
    piePalette() {
      return ['#A3B18A', '#588157', '#3A5A40', '#344E41', '#DAD7CD']
    },
  },
}
</script>

<style scoped>
.card-title {
  margin-bottom: 0.75rem;
}
.table {
  --bs-table-bg: transparent;
}
.star-input .star {
  font-size: 20px;
  color: #d0d0d0;
  cursor: pointer;
  user-select: none;
  line-height: 1;
}
.star-input .star.active {
  color: #ff9800;
}
.star-display .star {
  font-size: 18px;
  color: #d0d0d0;
  line-height: 1;
}
.star-display .star.active {
  color: #ff9800;
}
</style>

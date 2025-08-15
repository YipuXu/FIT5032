// English-only comments and code. Front-end only auth helper using LocalStorage.
// NOTE: This is a demo implementation for the assignment. Do NOT use client-only
// authentication for production apps.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function hashPassword(password) {
  const enc = new TextEncoder()
  const data = enc.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const arr = Array.from(new Uint8Array(hash))
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('mm_users') || '[]')
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem('mm_users', JSON.stringify(users))
}

function deleteUserByEmail(email) {
  try {
    const users = getUsers().filter((u) => u.email.toLowerCase() !== email.toLowerCase())
    saveUsers(users)
    return true
  } catch {
    return false
  }
}

function setCurrentUser(user) {
  // Only store safe fields
  const safe = { email: user.email, role: user.role, name: user.name }
  localStorage.setItem('mm_current_user', JSON.stringify(safe))
  // notify same-window listeners that auth changed
  try {
    window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: safe }))
  } catch {
    // ignore in older browsers
  }
  return safe
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('mm_current_user'))
  } catch {
    return null
  }
}

async function registerUser({ name, email, password, role = 'user' }) {
  // Basic client-side validation
  if (!email || !password || !name) throw new Error('Missing fields')
  const users = getUsers()
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered')
  }
  const hashed = await hashPassword(password)
  const user = {
    id: `u_${Date.now()}`,
    name: escapeHtml(name),
    email: email.toLowerCase(),
    passwordHash: hashed,
    role,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  return setCurrentUser(user)
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new Error('Missing fields')
  const users = getUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) throw new Error('Invalid credentials')
  const hashed = await hashPassword(password)
  if (hashed !== user.passwordHash) throw new Error('Invalid credentials')
  return setCurrentUser(user)
}

function logout() {
  localStorage.removeItem('mm_current_user')
  try {
    window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: null }))
  } catch {
    // ignore
  }
}

export {
  registerUser,
  loginUser,
  logout,
  getCurrentUser,
  getUsers,
  hashPassword,
  deleteUserByEmail,
}

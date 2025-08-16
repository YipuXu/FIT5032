// English-only comments and code. Auth helper now prefers Firebase Auth and keeps
// a local mirror (mm_current_user, mm_users) for role/profile compatibility.
// NOTE: This remains a demo; do not use client-only storage for production roles.

import { auth } from '../firebase/index.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'

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
  if (!email || !password || !name) throw new Error('Missing fields')
  // Create account in Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const fbUser = cred.user
  try {
    await updateProfile(fbUser, { displayName: name })
  } catch {}
  // Also keep a local profile record for role management
  const users = getUsers()
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  const profile = {
    id: existing?.id || `u_${Date.now()}`,
    name: escapeHtml(name),
    email: email.toLowerCase(),
    role,
    createdAt: existing?.createdAt || new Date().toISOString(),
    uid: fbUser.uid,
  }
  const next = existing
    ? users.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? profile : u))
    : [...users, profile]
  saveUsers(next)
  return setCurrentUser(profile)
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new Error('Missing fields')
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const fbUser = cred.user
  const users = getUsers()
  const local = users.find((u) => u.email.toLowerCase() === (fbUser.email || '').toLowerCase())
  const safe = {
    email: fbUser.email,
    role: local?.role || 'user',
    name: fbUser.displayName || local?.name || fbUser.email,
    uid: fbUser.uid,
  }
  return setCurrentUser(safe)
}

async function logout() {
  try {
    await firebaseSignOut(auth)
  } catch {}
  localStorage.removeItem('mm_current_user')
  try {
    window.dispatchEvent(new CustomEvent('mm-auth-changed', { detail: null }))
  } catch {}
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

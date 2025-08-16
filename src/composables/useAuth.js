// English-only comments and code. Auth helper now prefers Firebase Auth and keeps
// a local mirror (mm_current_user, mm_users) for role/profile compatibility.
// NOTE: This remains a demo; do not use client-only storage for production roles.

import { auth, db } from '../firebase/index.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

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

// getUsers, saveUsers, deleteUserByEmail removed - user management now in Firebase

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
  // Write role profile into Firestore: users/{uid}
  const profile = {
    uid: fbUser.uid,
    name: escapeHtml(name),
    email: (fbUser.email || email).toLowerCase(),
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true })

  return setCurrentUser(profile)
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new Error('Missing fields')
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const fbUser = cred.user
  // Prefer Firestore role
  let role = 'user'
  let name = fbUser.displayName || fbUser.email
  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid))
    if (snap.exists()) {
      const data = snap.data()
      role = data.role || role
      name = data.name || name
    }
  } catch {}
  const safe = { email: fbUser.email, role, name, uid: fbUser.uid }
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

export { registerUser, loginUser, logout, getCurrentUser, setCurrentUser, hashPassword }

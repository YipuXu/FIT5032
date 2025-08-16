// Firebase initialization for Mindful Movement
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAhZ6mek5xWWHB6zQaCTzXgotcFO-fZpb4',
  authDomain: 'mindful-movement-yipu-xu.firebaseapp.com',
  projectId: 'mindful-movement-yipu-xu',
  storageBucket: 'mindful-movement-yipu-xu.firebasestorage.app',
  messagingSenderId: '545161611556',
  appId: '1:545161611556:web:cfc6149391a72195f8cbb1',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

export { app, auth, onAuthStateChanged }

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAeRuMhRo3eGD7ottzQ9XVMjEL9HI5mcDU',
  authDomain: 'zeery-4c4c7.firebaseapp.com',
  projectId: 'zeery-4c4c7',
  storageBucket: 'zeery-4c4c7.firebasestorage.app',
  messagingSenderId: '187383793882',
  appId: '1:187383793882:web:0e91abf7e6b43cb601bde3',
  measurementId: 'G-6DNEV10TM3',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

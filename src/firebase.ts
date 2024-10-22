// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: 'AIzaSyA9DXnX6YSjjwBQW90jjaGZsffCFXbktcU',
    authDomain: 'senior-project-662d8.firebaseapp.com',
    projectId: 'senior-project-662d8',
    storageBucket: 'senior-project-662d8.appspot.com',
    messagingSenderId: '1004878179078',
    appId: '1:1004878179078:web:873572183e8c3b25d8cc87',
    measurementId: 'G-G8SG7LNKQL',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const database = getFirestore(app)
export const auth = getAuth(app)
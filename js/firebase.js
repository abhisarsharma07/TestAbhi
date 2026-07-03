/* -------------------------------------------------------------
   TestAbhi - Firebase Initialization
------------------------------------------------------------- */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBDvLUxcghyqjblhaFmScrbJby-68DOlTQ",
    authDomain: "testabhi-c3421.firebaseapp.com",
    projectId: "testabhi-c3421",
    storageBucket: "testabhi-c3421.firebasestorage.app",
    messagingSenderId: "586548737172",
    appId: "1:586548737172:web:b4b0524e41cf3b63a93081",
    measurementId: "G-56M01GJZKR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCV7xvHceicz5s-pUEmDn2veQn8peDoa-M",
  authDomain: "tv-controller-remot.firebaseapp.com",
  projectId: "tv-controller-remot",
  storageBucket: "tv-controller-remot.firebasestorage.app",
  messagingSenderId: "1025144374360",
  appId: "1:1025144374360:web:39a5bd2553bf14dd3c762d",
  measurementId: "G-5QNB215H0B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

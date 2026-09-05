import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Configuración de Firebase.
 *
 * Para conectarla a tu proyecto de Firebase:
 *  1. Ve a https://console.firebase.google.com
 *  2. Crea un proyecto (o usa uno existente).
 *  3. En "Descripción general del proyecto" → "Configuración del proyecto"
 *     → "Tus aplicaciones" → "Web".
 *  4. Copia aquí los valores de apiKey, authDomain, projectId, etc.
 *
 * También puedes usar variables de entorno (ver .env.example):
 *   VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCPAVU05OEzjieUR0OYkhxMn0yfAE8XhAI",
  authDomain: "carnicerialasmaldivas.firebaseapp.com",
  projectId: "carnicerialasmaldivas",
  storageBucket: "carnicerialasmaldivas.firebasestorage.app",
  messagingSenderId: "18845978328",
  appId: "1:18845978328:web:4059d8d84014c2a68211ad",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
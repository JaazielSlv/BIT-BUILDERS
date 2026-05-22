import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOM478alvySMdPAYHey7QQgUR__8fZZNY",
  authDomain: "bitbuilders000.firebaseapp.com",
  projectId: "bitbuilders000",
  storageBucket: "bitbuilders000.firebasestorage.app",
  messagingSenderId: "699397878152",
  appId: "1:699397878152:web:203f16a0e62d028e19ca3d"
};

// Inicializando Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

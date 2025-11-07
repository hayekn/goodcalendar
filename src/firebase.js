import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔥 replace with your Firebase project info
const firebaseConfig = {
  apiKey: "AIzaSyCVOWRz48Jz9lT1in3tIqVGDosmMlEmcq0",
  authDomain: "tracker-92901.firebaseapp.com",
  projectId: "tracker-92901",
  storageBucket: "tracker-92901.firebasestorage.app",
  messagingSenderId: "222325967743",
  appId: "1:222325967743:web:c86334e2754db3841b684a",
  measurementId: "G-GM4CCLCWHQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

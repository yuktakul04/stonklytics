// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRLDOKOp514zGlr7kawPUH0D40iT67ELk",
  authDomain: "stonklytics-60ac0.firebaseapp.com",
  projectId: "stonklytics-60ac0",
  storageBucket: "stonklytics-60ac0.firebasestorage.app",
  messagingSenderId: "890432146101",
  appId: "1:890432146101:web:46cec3395c2bbd8dff4cfc",
  measurementId: "G-DWSQD2FG4M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
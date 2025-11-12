import axios from 'axios';
import { auth } from './firebase';

// Try proxy first, fallback to direct connection
const baseURL = import.meta.env.DEV
    ? '/api'  // Use proxy in development
    : 'http://localhost:8000/api';  // Direct connection fallback

export const api = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
})

export async function fetchSummary(symbol) {
    const res = await api.get(`/summary/${encodeURIComponent(symbol)}`);
    // expected shape: { symbol, summary, source } from the backend
    return res.data;
  }

// Add request interceptor to include Firebase token
api.interceptors.request.use(
    async (config) => {
        // Get the current user
        const user = auth.currentUser;

        if (user) {
            try {
                // Get the Firebase ID token
                const token = await user.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            } catch (error) {
                console.error('Error getting Firebase token:', error);
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

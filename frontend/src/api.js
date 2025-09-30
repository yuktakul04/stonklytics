import axios from 'axios';

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




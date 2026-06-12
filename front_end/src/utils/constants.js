const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const API_BASE_URL = rawApiBaseUrl.endsWith('/api')
  ? rawApiBaseUrl
  : `${rawApiBaseUrl.replace(/\/$/, '')}/api`;

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
};

export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup', 
  DASHBOARD: '/dashboard',
  HISTORY: '/history',
  SETTINGS: '/settings'
};
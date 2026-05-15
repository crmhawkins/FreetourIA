import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store/useStore';

const getServerBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    if (__DEV__) {
      console.warn('[API] EXPO_PUBLIC_API_URL not set, using localhost fallback');
      return 'http://localhost:3000';
    }
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
  }
  // Remove trailing slash if present
  return url.replace(/\/$/, '');
};

/** Base server URL (e.g. http://192.168.1.10:3000) — use this to build media URLs */
export const SERVER_BASE_URL = getServerBaseUrl();

const apiClient = axios.create({
  baseURL: `${SERVER_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch {
    // Silent fail — request proceeds without auth
  }
  return config;
});

// Handle response errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear both in-memory state and persisted auth
      useStore.getState().logout();
    }

    if (!error.response) {
      error.userMessage = 'Connection error. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const API_TIMEOUT_MS = 30_000;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
    },
    validateStatus: (status) => status >= 200 && status < 300,
});

export function getApiBaseUrl(): string {
    return API_BASE_URL;
}

export function getMediaSocketUrl(): string {
    return API_BASE_URL.replace(/\/$/, '');
}

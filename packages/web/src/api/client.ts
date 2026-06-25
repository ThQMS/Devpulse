import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';

/** A normalised error shape that every rejected request resolves to. */
export interface ApiError {
  message: string;
  status: number;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Map any AxiosError to a consistent { message, status }.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string } }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.error?.message ?? error.message ?? 'Unexpected network error';
    const normalised: ApiError = { message, status };
    return Promise.reject(normalised);
  },
);

/** Unwraps the `{ data }` envelope returned by every endpoint. */
export function unwrap<T>(payload: { data: T }): T {
  return payload.data;
}

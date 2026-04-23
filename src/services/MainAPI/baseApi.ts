// src/services/baseApi.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export class BaseApi {
	protected api: AxiosInstance;

	constructor() {
		this.api = axios.create({
			baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
			timeout: 10000,
			headers: { 'Content-Type': 'application/json' },
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		this.api.interceptors.request.use(
			(config) => {
				const token = localStorage.getItem('auth_token');
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
				}
				// FormData: no forzar Content-Type para que el navegador envíe multipart con boundary
				if (config.data instanceof FormData) {
					delete config.headers['Content-Type'];
				}
				return config;
			},
			(error) => Promise.reject(error)
		);

		this.api.interceptors.response.use(
			(response) => response,
			async (error) => {
				const originalRequest = error.config;
				const url = String(originalRequest?.url ?? '');
				// No reintentar login/refresh ni entrar en bucle si el refresh devuelve 401
				if (
					url.includes('/auth/login') ||
					url.includes('/auth/refresh')
				) {
					return Promise.reject(error);
				}
				if (error.response?.status === 401 && !originalRequest._retry) {
					originalRequest._retry = true;
					try {
						const refreshToken = localStorage.getItem('refresh_token');
						if (refreshToken) {
							const response = await this.api.post('/auth/refresh', {
								refreshToken,
							});
							const { token, refreshToken: newRefresh } = response.data;
							localStorage.setItem('auth_token', token);
							if (newRefresh) {
								localStorage.setItem('refresh_token', newRefresh);
							}
							originalRequest.headers.Authorization = `Bearer ${token}`;
							return this.api(originalRequest);
						}
					} catch {
						localStorage.clear();
						window.location.href = '/login';
					}
				}
				return Promise.reject(error);
			}
		);
	}

	protected handleError(error: any): Error {
		if (error.response) {
			const data = error.response.data;
			const status = error.response.status as number;
			// #region agent log
			if (status === 500) {
				fetch('http://127.0.0.1:7318/ingest/1919580f-ef77-45e7-8913-3193e1e0f3d7', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b12624' },
					body: JSON.stringify({
						sessionId: 'b12624',
						hypothesisId: 'H500',
						runId: 'api-error',
						location: 'baseApi.ts:handleError',
						message: 'http_500',
						data: {
							url: String(error.config?.url ?? ''),
							status,
							detail: data?.detail ?? null,
							apiMessage: data?.message ?? null,
						},
						timestamp: Date.now(),
					}),
				}).catch(() => {});
			}
			// #endregion
			if (data?.errors) {
				const validationMessages = Object.values(data.errors)
					.flat()
					.join(' | ');
				return new Error(validationMessages);
			}
			if (data?.message || data?.error) {
				const base = (data.message || data.error) as string;
				if (data?.detail) {
					return new Error(`${base} — ${String(data.detail)}`);
				}
				return new Error(base);
			}
			return new Error(
				`Error ${error.response.status}: ${error.response.statusText}`
			);
		} else if (error.request) {
			return new Error(
				'No se pudo conectar con el servidor. Verifica tu conexión.'
			);
		} else {
			return new Error(error.message || 'Error inesperado');
		}
	}

	// Métodos genéricos
	async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		try {
			const response = await this.api.get(url, config);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async post<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<T> {
		try {
			const response = await this.api.post(url, data, config);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async put<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<T> {
		try {
			const response = await this.api.put(url, data, config);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async patch<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<T> {
		try {
			const response = await this.api.patch(url, data, config);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		try {
			const response = await this.api.delete(url, config);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}
}

// src/services/baseApi.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export class BaseApi {
	protected api: AxiosInstance;

	constructor() {
		this.api = axios.create({
			baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7049/api',
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
				return config;
			},
			(error) => Promise.reject(error)
		);

		this.api.interceptors.response.use(
			(response) => response,
			async (error) => {
				const originalRequest = error.config;
				if (error.response?.status === 401 && !originalRequest._retry) {
					originalRequest._retry = true;
					try {
						const refreshToken = localStorage.getItem('refresh_token');
						if (refreshToken) {
							const response = await this.api.post('/auth/refresh', {
								refreshToken,
							});
							localStorage.setItem('auth_token', response.data.token);
							originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
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
			if (data?.errors) {
				const validationMessages = Object.values(data.errors)
					.flat()
					.join(' | ');
				return new Error(validationMessages);
			}
			if (data?.message || data?.error) {
				return new Error(data.message || data.error);
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

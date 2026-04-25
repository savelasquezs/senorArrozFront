// src/services/baseApi.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken } from '@/services/auth/authSession';

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
				const token = getAccessToken();
				if (token) {
					config.headers = config.headers ?? {};
					config.headers.Authorization = `Bearer ${token}`;
				}
				// FormData: no forzar Content-Type para que el navegador envie multipart con boundary
				if (config.data instanceof FormData && config.headers) {
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

				if (
					url.includes('/auth/login') ||
					url.includes('/auth/refresh')
				) {
					return Promise.reject(error);
				}

				if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
					originalRequest._retry = true;
					const token = await refreshAccessToken();

					if (token) {
						originalRequest.headers = originalRequest.headers ?? {};
						originalRequest.headers.Authorization = `Bearer ${token}`;
						return this.api(originalRequest);
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
				const base = (data.message || data.error) as string;
				if (data?.detail) {
					return new Error(`${base} - ${String(data.detail)}`);
				}
				return new Error(base);
			}
			return new Error(
				`Error ${error.response.status}: ${error.response.statusText}`
			);
		} else if (error.request) {
			return new Error(
				'No se pudo conectar con el servidor. Verifica tu conexion.'
			);
		} else {
			return new Error(error.message || 'Error inesperado');
		}
	}

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

// src/services/authApi.ts
import { BaseApi } from './baseApi';
import type {
	LoginCredentials,
	LoginResponse,
	ChangePasswordCredentials,
} from '@/types/auth';

class AuthApi extends BaseApi {
	async login(credentials: LoginCredentials): Promise<LoginResponse> {
		try {
			const response = await this.api.post('/auth/login', credentials);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async logout(refreshToken: string): Promise<void> {
		try {
			await this.api.post('/auth/logout', { refreshToken });
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async refreshToken(refreshToken: string): Promise<LoginResponse> {
		try {
			const response = await this.api.post('/auth/refresh', { refreshToken });
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async changePassword(passwordData: ChangePasswordCredentials): Promise<void> {
		try {
			await this.api.post('/auth/change-password', passwordData);
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async forgotPassword(email: string): Promise<{ message: string }> {
		try {
			const response = await this.api.post('/auth/forgot-password', { email });
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	async resetPassword(resetData: {
		token: string;
		email: string;
		newPassword: string;
		confirmPassword: string;
	}): Promise<void> {
		try {
			await this.api.post('/auth/reset-password', resetData);
		} catch (error: any) {
			throw this.handleError(error);
		}
	}
}

export const authApi = new AuthApi();

import apiClient, { ApiResponse, setAuthTokens, clearAuthTokens } from './api';
import { User, LoginRequest, RegisterRequest, Token } from './types';

class AuthService {
  async login(credentials: LoginRequest): Promise<{ user: User; token: Token }> {
    try {
      const response = await apiClient.post<ApiResponse<{ user: User; token: Token }>>(
        '/auth/login',
        credentials
      );

      const { user, token } = response.data.data!;
      
      // Store tokens
      await setAuthTokens(token.access_token, token.refresh_token);
      
      return { user, token };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(userData: RegisterRequest): Promise<{ user: User; token: Token }> {
    try {
      const response = await apiClient.post<ApiResponse<{ user: User; token: Token }>>(
        '/auth/register',
        userData
      );

      const { user, token } = response.data.data!;
      
      // Store tokens
      await setAuthTokens(token.access_token, token.refresh_token);
      
      return { user, token };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed, but clearing local tokens anyway');
    } finally {
      await clearAuthTokens();
    }
  }

  async refreshToken(): Promise<Token> {
    try {
      const response = await apiClient.post<ApiResponse<Token>>('/auth/refresh');
      const token = response.data.data!;
      
      await setAuthTokens(token.access_token, token.refresh_token);
      
      return token;
    } catch (error: any) {
      await clearAuthTokens();
      throw new Error('Token refresh failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get user info');
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<ApiResponse<User>>('/users/profile', updates);
      return response.data.data!;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send reset email');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.post('/auth/verify-email', { token });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  }
}

export default new AuthService();

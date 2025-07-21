import apiClient, { ApiResponse, setAuthTokens, clearAuthTokens } from './api';
import { User, LoginRequest, RegisterRequest, Token } from './types';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { getGoogleClientId } from '../config/oauth';

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = getGoogleClientId();
const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

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

  async googleLogin(): Promise<{ user: User; token: Token }> {
    try {
      // For now, show demo mode since OAuth requires proper Google setup
      const isDemoMode = GOOGLE_CLIENT_ID === 'demo-client-id';
      
      if (isDemoMode) {
        // Demo Google login - simulate the OAuth flow
        const demoUser = {
          id: 'google-demo-user',
          email: 'demo.google@shelflife.ai',
          username: 'googledemo',
          full_name: 'Demo Google User',
          profile_image_url: 'https://via.placeholder.com/150?text=Google+Demo',
          is_google_user: true,
        };
        
        const demoToken = {
          access_token: 'demo-google-access-token-' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'demo-google-refresh-token-' + Date.now(),
        };
        
        // Store demo tokens
        await setAuthTokens(demoToken.access_token, demoToken.refresh_token);
        
        return { user: demoUser as User, token: demoToken as Token };
      }
      
      // Real Google OAuth implementation (when proper credentials are configured)
      const codeVerifier = await AuthSession.AuthRequest.makeCodeChallenge();
      
      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        codeChallenge: codeVerifier.codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        additionalParameters: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const authResult = await authRequest.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (authResult.type === 'success' && authResult.params.code) {
        const response = await apiClient.post<ApiResponse<{ user: User; token: Token }>>(
          '/oauth/google/callback',
          {
            auth_code: authResult.params.code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier.codeVerifier,
          }
        );

        const { user, token } = response.data.data!;
        await setAuthTokens(token.access_token, token.refresh_token);
        return { user, token };
      } else {
        throw new Error('Google authentication was cancelled or failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google login failed');
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

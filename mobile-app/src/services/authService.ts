import apiClient, { ApiResponse, setAuthTokens, clearAuthTokens } from './api';
import { User, LoginRequest, RegisterRequest, Token } from './types';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { getGoogleClientId } from '../config/oauth';

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

// Helper function to extract redirect URI from auth result
const extractRedirectUri = (authResultUrl: string): string => {
  try {
    const url = new URL(authResultUrl);
    // Return the base URL without query parameters
    return `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch (error) {
    console.error('❌ Error extracting redirect URI:', error);
    // Fallback to a reasonable default
    return 'http://localhost:8081';
  }
};

// Google OAuth configuration
const GOOGLE_CLIENT_ID = getGoogleClientId();
const redirectUri = AuthSession.makeRedirectUri({});

class AuthService {
  async login(credentials: LoginRequest): Promise<{ user: User; token: Token }> {
    try {
      const response = await apiClient.post<Token>(
        '/auth/login',
        credentials
      );

      const tokenData = response.data;
      
      // Store tokens
      await setAuthTokens(tokenData.access_token, tokenData.refresh_token);
      
      return { 
        user: tokenData.user!, 
        token: tokenData 
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Login failed');
    }
  }

  async googleLogin(): Promise<{ user: User; token: Token }> {
    try {
      // Check if we have real Google OAuth configured
      const hasRealOAuth = GOOGLE_CLIENT_ID && 
        GOOGLE_CLIENT_ID !== 'demo-client-id' && 
        !GOOGLE_CLIENT_ID.includes('your-');
      
      if (!hasRealOAuth) {
        // Demo Google login - simulate the OAuth flow
        const demoUser: User = {
          id: 'google-demo-user',
          email: 'demo.google@shelflife.ai',
          username: 'googledemo',
          first_name: 'Demo',
          last_name: 'Google User',
          full_name: 'Demo Google User',
          is_active: true,
          is_verified: true,
          is_google_user: true,
          created_at: new Date().toISOString(),
          phone: null,
          city: null,
          state: null,
          country: null,
          latitude: null,
          longitude: null,
          updated_at: null,
          profile_image_url: null
        };
        
        const demoToken: Token = {
          access_token: 'demo-google-access-token-' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'demo-google-refresh-token-' + Date.now(),
          user: demoUser
        };
        
        // Store demo tokens
        await setAuthTokens(demoToken.access_token, demoToken.refresh_token);
        
        return { user: demoUser, token: demoToken };
      }
      
      // Real Google OAuth implementation with PKCE support
      console.log('🔐 Starting real Google OAuth flow with PKCE...');
      console.log('📱 Client ID:', GOOGLE_CLIENT_ID);
      
      // Create PKCE request (Expo handles code_verifier/code_challenge automatically)
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        codeChallenge: undefined, // Let Expo auto-generate
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      console.log('🌐 Redirect URI:', redirectUri);
      console.log('🔒 PKCE enabled');
      
      const authResult = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      console.log('📡 Auth result:', authResult);

      if (authResult.type === 'success' && authResult.params.code) {
        console.log('✅ Got authorization code, sending to backend...');
        console.log('📤 Sending auth code to backend:', authResult.params.code?.substring(0, 10) + '...');
        
        // IMPORTANT: Extract the redirect URI that Google actually used
        const actualRedirectUri = extractRedirectUri(authResult.url || '');
        console.log('🔗 Using redirect URI:', actualRedirectUri);
        
        // Get the code verifier for PKCE
        const codeVerifier = request.codeVerifier;
        console.log('🔒 Code verifier available:', !!codeVerifier);
        
        // Send to backend with JSON data including PKCE code verifier
        const response = await apiClient.post<Token>(
          '/oauth/google/exchange-code',  // ← Try the alternative endpoint
          {
            code: authResult.params.code,  // Use 'code' not 'auth_code'
            redirect_uri: actualRedirectUri,  // ← This is the key fix!
            code_verifier: codeVerifier,  // ← PKCE code verifier
            platform: 'mobile'
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('🎉 Backend response received');
        const tokenData = response.data;
        
        if (!tokenData.access_token || !tokenData.user) {
          throw new Error('Invalid response from Google OAuth');
        }
        
        console.log('🎉 Successfully exchanged code for tokens!');
        console.log('👤 User:', tokenData.user.email);
        
        await setAuthTokens(tokenData.access_token, tokenData.refresh_token);
        return { user: tokenData.user!, token: tokenData };
      } else {
        console.log('❌ Google auth cancelled or failed:', authResult);
        throw new Error('Google authentication was cancelled or failed');
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      console.error('📊 Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Log the full error response for debugging
      if (error.response?.data) {
        console.log('🔍 Full backend error:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(error.response?.data?.detail || error.response?.data?.message || error.message || 'Google login failed');
    }
  }

  async register(userData: RegisterRequest): Promise<{ user: User; token: Token }> {
    try {
      // First register the user
      await apiClient.post<ApiResponse<any>>('/auth/register', userData);
      
      // Then login to get tokens
      return await this.login({
        email: userData.email,
        password: userData.password!
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Registration failed');
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
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to get user info');
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

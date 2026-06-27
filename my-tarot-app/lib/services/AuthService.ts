import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { apiConfig, endpoints, buildApiUrl } from '../config/api';

const TOKEN_KEY = 'user_jwt_token';
const USER_ID_KEY = 'user_id';
const TOKEN_EXPIRY_KEY = 'token_expiry';

interface UserResponse {
  id: number;
  installation_id: string;
  created_at: string;
  last_active_at: string;
}

interface AnonymousUserResponse {
  user: UserResponse;
  access_token: string;
  token_type: string;
}

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async registerAnonymousUser(): Promise<AnonymousUserResponse> {
    console.log('🚀 === AuthService.registerAnonymousUser() 开始 ===');
    try {
      const installationId = Application.androidId || Device.modelName || 'unknown';
      console.log('📱 Device installation ID:', installationId);
      console.log('🌐 Base URL:', apiConfig.baseUrl);

      const apiUrl = buildApiUrl(endpoints.auth.register);
      console.log('🔗 Request URL:', apiUrl);

      console.log('📦 Request body:', JSON.stringify({
        installation_id: installationId,
      }));

      console.log('🚀 Sending fetch request...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          installation_id: installationId,
        }),
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AnonymousUserResponse = await response.json();

      await this.saveToken(data.access_token);
      await SecureStore.setItemAsync(USER_ID_KEY, data.user.id.toString());

      // JWT tokens typically have longer expiry times, set a default of 30 days
      const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());

      console.log('✅ Anonymous user registered successfully:', data.user.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to register anonymous user:', error);
      throw error;
    }
  }

  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    console.log('🔍 === getToken() 开始 ===');
    try {
      console.log('📱 Retrieving token from SecureStore...');
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log('📱 Token from storage:', token ? 'Found' : 'Not found');

      if (!token) {
        console.log('❌ No token found in storage');
        return null;
      }

      console.log('🔒 Validating token...');
      const isValid = await this.validateToken();
      console.log('🔒 Token validation result:', isValid ? 'Valid' : 'Invalid');

      if (!isValid) {
        console.log('🗑️ Clearing invalid token...');
        await this.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  async getUserId(): Promise<string | null> {
    try {
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      return userId;
    } catch (error) {
      console.error('Failed to get user id:', error);
      return null;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (!expiryStr) {
        return false;
      }

      const expiryTime = parseInt(expiryStr, 10);
      const now = Date.now();

      return now < expiryTime;
    } catch (error) {
      console.error('Failed to validate token:', error);
      return false;
    }
  }

  async clearAllAuthData(): Promise<void> {
    console.log('🗑️ === clearAllAuthData() 开始 ===');
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      console.log('🗑️ All auth data cleared');
    } catch (error) {
      console.error('Failed to clear all auth data:', error);
    }
  }

  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      console.log('🗑️ Token cleared');
    } catch (error) {
      console.error('Failed to clear token:', error);
      throw error;
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  async initializeUser(): Promise<boolean> {
    console.log('🚀 === AuthService.initializeUser() 开始 ===');
    try {
      // 在开发环境下，总是清除旧token并重新注册，确保与后端同步
      if (__DEV__) {
        console.log('🧹 开发模式：清除旧的认证数据...');
        await this.clearAllAuthData();
      } else {
        console.log('🔍 Checking for existing token...');
        const existingToken = await this.getToken();
        console.log('🔍 Existing token check result:', existingToken ? 'Found valid token' : 'No valid token');

        if (existingToken) {
          console.log('✅ Existing valid token found, skipping registration');
          return true;
        }
      }

      console.log('🔄 Registering anonymous user...');
      await this.registerAnonymousUser();
      console.log('✅ registerAnonymousUser completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      return false;
    }
  }
}

export default AuthService;

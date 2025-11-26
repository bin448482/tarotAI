import AuthService from './AuthService';
import { apiConfig, buildApiUrl } from '../config/api';

export interface UserBalance {
  user_id: number;
  credits: number;
  last_updated: string;
}

export interface UserTransaction {
  id: number;
  user_id: number;
  transaction_type: string;
  credit_change: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export interface UserInfo {
  id: number;
  installation_id: string;
  email?: string;
  email_verified: boolean;
  email_verified_at?: string;
  created_at: string;
  last_active_at: string;
  total_credits_purchased: number;
  total_credits_consumed: number;
}

export interface BalanceResponse {
  user_id: number;
  credits: number;
  last_updated: string;
}

export interface TransactionHistoryResponse {
  transactions: UserTransaction[];
  total_count: number;
  has_more: boolean;
}

export interface UserStatsResponse {
  total_readings: number;
  total_ai_readings: number;
  total_spent: number;
  registration_date: string;
}

class UserService {
  private static instance: UserService;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async getUserProfile(): Promise<UserInfo | null> {
    console.log('👤 === UserService.getUserProfile() 开始 ===');
    try {
      const authHeaders = await this.authService.getAuthHeaders();

      if (!authHeaders.Authorization) {
        console.log('❌ No authorization token available');
        return null;
      }

      const apiUrl = buildApiUrl('/api/v1/me');
      console.log('🔗 Request URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Token expired, clearing auth data');
          await this.authService.clearAllAuthData();
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UserInfo = await response.json();
      console.log('✅ User profile retrieved successfully:', data.email ? 'with email' : 'no email');
      return data;
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      return null;
    }
  }

  async getUserBalance(): Promise<BalanceResponse | null> {
    console.log('🏦 === UserService.getUserBalance() 开始 ===');
    try {
      const authHeaders = await this.authService.getAuthHeaders();

      if (!authHeaders.Authorization) {
        console.log('❌ No authorization token available');
        return null;
      }

      const apiUrl = buildApiUrl('/api/v1/me/balance');
      console.log('🔗 Request URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Token expired, clearing auth data');
          await this.authService.clearAllAuthData();
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BalanceResponse = await response.json();
      console.log('✅ Balance retrieved successfully:', data.credits);
      return data;
    } catch (error) {
      console.error('❌ Failed to get user balance:', error);
      return null;
    }
  }

  async getUserTransactions(limit: number = 10, offset: number = 0): Promise<TransactionHistoryResponse | null> {
    console.log('📊 === UserService.getUserTransactions() 开始 ===');
    try {
      const authHeaders = await this.authService.getAuthHeaders();

      if (!authHeaders.Authorization) {
        console.log('❌ No authorization token available');
        return null;
      }

      const apiUrl = buildApiUrl(`/api/v1/me/transactions?limit=${limit}&offset=${offset}`);
      console.log('🔗 Request URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Token expired, clearing auth data');
          await this.authService.clearAllAuthData();
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TransactionHistoryResponse = await response.json();
      console.log('✅ Transactions retrieved successfully:', data.total_count);
      return data;
    } catch (error) {
      console.error('❌ Failed to get user transactions:', error);
      return null;
    }
  }

  async getUserStats(): Promise<UserStatsResponse | null> {
    console.log('📈 === UserService.getUserStats() 开始 ===');
    try {
      const authHeaders = await this.authService.getAuthHeaders();

      if (!authHeaders.Authorization) {
        console.log('❌ No authorization token available');
        return null;
      }

      const apiUrl = buildApiUrl('/api/v1/me/stats');
      console.log('🔗 Request URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 Token expired, clearing auth data');
          await this.authService.clearAllAuthData();
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UserStatsResponse = await response.json();
      console.log('✅ Stats retrieved successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      return null;
    }
  }

  /**
   * 校验 Google Play 购买并入账
   */
  async verifyGooglePurchase(payload: {
    installation_id: string;
    product_id: string;
    purchase_token: string;
  }): Promise<{ success: boolean; credits_awarded?: number; new_balance?: number } | null> {
    console.log('🧾 === UserService.verifyGooglePurchase() 开始 ===');
    try {
      const authHeaders = await this.authService.getAuthHeaders();
      if (!authHeaders.Authorization) {
        console.log('❌ No authorization token available');
        return null;
      }

      const apiUrl = buildApiUrl('/api/v1/payments/google/verify');
      console.log('🔗 Request URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response received:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        // 4xx/5xx 返回 null，让前端显示兜底提示
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Failed to verify Google purchase:', error);
      return null;
    }
  }

  /**
   * 获取用户完整信息（档案 + 余额 + 统计数据）
   */
  async getUserInfo(): Promise<{ profile: UserInfo | null; balance: BalanceResponse | null; stats: UserStatsResponse | null; transactions: UserTransaction[] }> {
    console.log('👤 === UserService.getUserInfo() 开始 ===');
    try {
      const [profile, balance, stats, transactionHistory] = await Promise.all([
        this.getUserProfile(),
        this.getUserBalance(),
        this.getUserStats(),
        this.getUserTransactions(5, 0) // 只获取最近5条交易记录
      ]);

      return {
        profile,
        balance,
        stats,
        transactions: transactionHistory?.transactions || []
      };
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      return {
        profile: null,
        balance: null,
        stats: null,
        transactions: []
      };
    }
  }
}

export default UserService;

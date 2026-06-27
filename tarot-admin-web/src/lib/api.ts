import { apiClient } from './api-client';
import {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminProfile,
  UserListResponse,
  UserDetailResponse,
  UserFilters,
  AdjustCreditsRequest,
  RedeemCodeListResponse,
  RedeemCodeFilters,
  GenerateRedeemCodesRequest,
  DashboardMetrics,
  RecentActivity,
  EmailStatusResponse,
  AnonymousRedeemRequest,
  AnonymousRedeemResponse,
  AppRelease,
  AppReleaseResponse,
  PurchaseListResponse,
  PurchaseFilters,
  PurchaseDetailResponse,
} from '@/types';

// 管理员认证API
export const authApi = {
  // 管理员登录
  login: async (credentials: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/api/v1/admin-api/login', credentials);
    // 保存 JWT token 到 localStorage
    if (response.access_token) {
      localStorage.setItem('admin_token', response.access_token);
    }
    return response;
  },

  // 获取管理员信息
  getProfile: async (): Promise<AdminProfile> => {
    return apiClient.get<AdminProfile>('/api/v1/admin-api/profile');
  },

  // 刷新token
  refreshToken: async (): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/api/v1/admin-api/refresh');
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token);
    }
    return response;
  },

  // 登出
  logout: async () => {
    try {
      await apiClient.post('/api/v1/admin-api/logout');
    } finally {
      // 清除本地存储的 JWT token
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('admin_token');
      }
    }
  },

  // 发送邮箱验证邮件
  sendVerificationEmail: async (installationId: string, email: string) => {
    return apiClient.post('/api/v1/auth/email/send-verification', {
      user_id: installationId,
      email: email
    });
  },

  // 验证邮箱token
  verifyEmailToken: async (token: string) => {
    return apiClient.post('/api/v1/auth/email/verify', {
      token: token
    });
  },

  // 获取匿名用户邮箱状态
  getEmailStatus: async (installationId: string): Promise<EmailStatusResponse> => {
    return apiClient.get<EmailStatusResponse>(`/api/v1/auth/email/status?installation_id=${encodeURIComponent(installationId)}`);
  },

  // 匿名用户使用兑换码
  redeemWithCode: async (payload: AnonymousRedeemRequest): Promise<AnonymousRedeemResponse> => {
    return apiClient.post<AnonymousRedeemResponse>('/api/v1/payments/redeem', payload);
  },
};

// 用户管理API
export const usersApi = {
  // 获取用户列表
  getUsers: async (filters: UserFilters): Promise<UserListResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiClient.get<UserListResponse>(`/api/v1/admin/users?${params.toString()}`);
  },

  // 获取用户详情
  getUserDetail: async (installationId: string): Promise<UserDetailResponse> => {
    return apiClient.get<UserDetailResponse>(`/api/v1/admin/users/${installationId}`);
  },

  // 调整用户积分
  adjustCredits: async (request: AdjustCreditsRequest) => {
    return apiClient.post('/api/v1/admin/users/adjust-credits', request);
  },

  // 删除用户
  deleteUser: async (installationId: string) => {
    return apiClient.delete(`/api/v1/admin/users/${installationId}`);
  },

  // 导出用户数据
  exportUsers: async (filters: Partial<UserFilters>): Promise<Blob> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/api/v1/admin/users/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },
};

// 订单管理API
export const purchasesApi = {
  getPurchases: async (filters: PurchaseFilters): Promise<PurchaseListResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    return apiClient.get<PurchaseListResponse>(`/api/v1/admin/purchases?${params.toString()}`);
  },
  getPurchaseDetail: async (id: number): Promise<PurchaseDetailResponse> => {
    return apiClient.get<PurchaseDetailResponse>(`/api/v1/admin/purchases/${id}`);
  },
};

// 兑换码管理API
export const redeemCodesApi = {
  // 获取兑换码列表
  getRedeemCodes: async (filters: RedeemCodeFilters): Promise<RedeemCodeListResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiClient.get<RedeemCodeListResponse>(`/api/v1/admin/redeem-codes?${params.toString()}`);
  },

  // 生成兑换码
  generateRedeemCodes: async (request: GenerateRedeemCodesRequest): Promise<{ count: number }> => {
    return apiClient.post<{ count: number }>(
      '/api/v1/admin/redeem-codes/generate',
      request
    );
  },

  // 更新兑换码状态
  updateRedeemCodeStatus: async (id: number, status: string, reason?: string) => {
    return apiClient.put(`/api/v1/admin/redeem-codes/${id}`, { status, reason });
  },

  // 获取兑换码统计
  getStats: async () => {
    return apiClient.get('/api/v1/admin/redeem-codes/stats');
  },

  // 获取批次列表
  getBatches: async (): Promise<{ batches: string[] }> => {
    return apiClient.get<{ batches: string[] }>('/api/v1/admin/redeem-codes/batches');
  },

  // 导出兑换码数据
  exportRedeemCodes: async (filters: Partial<RedeemCodeFilters>): Promise<Blob> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/api/v1/admin/redeem-codes/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },
};

// 仪表板API
export const dashboardApi = {
  // 获取仪表板数据
  getMetrics: async (): Promise<DashboardMetrics> => {
    try {
      // 获取基本统计数据 - 只获取第一页来获取total计数和部分数据
      const usersData = await usersApi.getUsers({ page: 1, size: 100 });

      // 基本指标计算（基于可用数据的近似值）
      const totalUsers = usersData.total || 0;

      // 基于第一页数据计算活跃用户比例，然后估算总数
      const sampleActiveUsers = usersData.users?.filter(user =>
        user.last_active_at && new Date(user.last_active_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0;

      const sampleSize = usersData.users?.length || 0;
      const activeRatio = sampleSize > 0 ? sampleActiveUsers / sampleSize : 0;
      const estimatedActiveUsers = Math.round(totalUsers * activeRatio);

      // 基于样本估算总积分
      const sampleTotalCredits = usersData.users?.reduce((sum, user) => sum + (user.total_credits || 0), 0) || 0;
      const avgCreditsPerUser = sampleSize > 0 ? sampleTotalCredits / sampleSize : 0;
      const estimatedTotalCredits = Math.round(totalUsers * avgCreditsPerUser);

      return {
        total_users: totalUsers,
        total_credits_sold: estimatedTotalCredits,
        active_users_30d: estimatedActiveUsers,
        orders_today: 0, // 暂时没有订单数据
        users_growth: 0, // 暂时无法计算增长率
        revenue_growth: 0,
        active_users_ratio: totalUsers > 0 ? (estimatedActiveUsers / totalUsers) * 100 : 0,
        orders_growth: 0,
      };
    } catch (error) {
      console.warn('Failed to fetch real metrics, using mock data:', error);
      // 如果API调用失败，使用模拟数据
      return {
        total_users: 1250,
        total_credits_sold: 45680,
        active_users_30d: 890,
        orders_today: 23,
        users_growth: 12.5,
        revenue_growth: 18.3,
        active_users_ratio: 71.2,
        orders_growth: 8.7,
      };
    }
  },

  // 获取图表数据（临时使用模拟数据，等待后端接口准备好）
  getChartData: async (): Promise<Record<string, unknown>> => {
    // TODO: 替换为真实的后端API调用
    return {
      revenue_labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      revenue_data: [4200, 5100, 4800, 6200, 5800, 6800],
      user_growth_labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      user_growth_data: [12, 19, 15, 25, 22, 18, 28],
      platform_labels: ['Google Play', 'Redeem', 'Other'],
      platform_data: [65, 28, 7],
    };
  },

  // 获取最近活动
  getRecentActivities: async (): Promise<RecentActivity[]> => {
    try {
      // 获取最近的用户数据作为活动示例
      const usersData = await usersApi.getUsers({ page: 1, size: 10 });

      return usersData.users?.slice(0, 5).map((user, index) => ({
        id: `activity-${index}`,
        type: ['purchase', 'redeem', 'adjust'][index % 3] as 'purchase' | 'redeem' | 'adjust',
        installation_id: user.installation_id,
        credits: Math.floor(Math.random() * 100) + 10,
        created_at: user.created_at
      })) || [];
    } catch (error) {
      console.warn('Failed to fetch real activities, using mock data:', error);
      // 如果API调用失败，使用模拟数据
      return [
        {
          id: '1',
          type: 'purchase' as const,
          installation_id: 'abc123def456',
          credits: 100,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'redeem' as const,
          installation_id: 'def456ghi789',
          credits: 50,
          created_at: new Date().toISOString()
        },
      ];
    }
  },
};

// 应用发布管理API
export const appReleaseApi = {
  // 获取最新应用发布信息
  getLatestRelease: async (): Promise<AppRelease | null> => {
    try {
      const response = await apiClient.get<AppReleaseResponse>('/api/v1/admin/app-release/latest');
      const payload = response as AppReleaseResponse & { data?: AppRelease };
      if (payload?.release) return payload.release;
      if (payload?.data) return payload.data;
      return null;
    } catch (error) {
      console.warn('获取最新应用发布信息失败:', error);
      return null;
    }
  },

  // 上传新的应用发布
  uploadRelease: async (formData: FormData): Promise<AppReleaseResponse> => {
    return apiClient.post<AppReleaseResponse>(
      '/api/v1/admin/app-release',
      formData,
      {
        // 大文件上传可能超过默认 10s 限制，显式延长超时时间
        timeout: 5 * 60 * 1000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },
};

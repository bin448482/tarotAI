// 用户相关类型
export interface User {
  installation_id: string;
  email?: string;
  email_verified: boolean;
  email_verified_at?: string;
  credits: number;
  total_credits?: number; // 添加这个字段用于仪表板计算
  total_credits_purchased: number;
  total_credits_consumed: number;
  created_at: string;
  last_active_at: string;
  recent_transactions?: Transaction[];
}

export interface UserListResponse {
  success: boolean;
  users: User[];
  total: number;
  page: number;
  size: number;
}

export interface UserDetailResponse {
  success: boolean;
  user: User;
}

// 交易记录类型
export interface Transaction {
  type: string;
  credits: number;
  balance_after: number;
  description: string;
  created_at: string;
  platform?: string;
  order_id?: string;
}

// 兑换码相关类型
export interface RedeemCode {
  id: number;
  code: string;
  product_id: number;
  credits: number;
  status: 'active' | 'used' | 'expired' | 'disabled';
  used_by_user?: {
    installation_id: string;
    created_at: string;
  };
  used_at?: string;
  expires_at?: string;
  created_at: string;
  batch_id?: string;
}

export interface RedeemCodeListResponse {
  success: boolean;
  redeem_codes: RedeemCode[];
  total: number;
  page: number;
  size: number;
  stats: {
    total: number;
    active: number;
    used: number;
    expired: number;
    disabled: number;
  };
}

// 管理员认证类型
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export interface AdminProfile {
  username: string;
  role: string;
  authenticated: boolean;
}

// 仪表板数据类型
export interface DashboardMetrics {
  total_users: number;
  total_credits_sold: number;
  active_users_30d: number;
  orders_today: number;
  users_growth: number;
  revenue_growth: number;
  active_users_ratio: number;
  orders_growth: number;
}

export interface ChartData {
  revenue_labels: string[];
  revenue_data: number[];
  user_growth_labels: string[];
  user_growth_data: number[];
  platform_labels: string[];
  platform_data: number[];
}

export interface RecentActivity {
  id?: string;
  type: 'purchase' | 'redeem' | 'adjust';
  installation_id: string;
  credits: number;
  created_at: string;
}

// API响应基础类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  size: number;
}

// 用户筛选参数
export interface UserFilters extends PaginationParams {
  installation_id?: string;
  email?: string;
  email_status?: 'verified' | 'unverified' | 'none';
  min_credits?: number;
  date_range?: 'today' | 'week' | 'month';
}

// 兑换码筛选参数
export interface RedeemCodeFilters extends PaginationParams {
  status?: 'active' | 'used' | 'expired' | 'disabled';
  batch_id?: string;
  code?: string;
}

// 调整积分请求
export interface AdjustCreditsRequest {
  installation_id: string;
  credits: number;
  reason: string;
}

// 生成兑换码请求
export interface GenerateRedeemCodesRequest {
  count: number;
  credits: number;
  expires_days: number;
  batch_name?: string;
}

// 匿名邮箱认证相关
export interface EmailStatusResponse {
  success: boolean;
  installation_id: string;
  email?: string;
  email_verified: boolean;
  email_verified_at?: string;
  message?: string;
}

export interface AnonymousRedeemRequest {
  installation_id: string;
  code: string;
}

export interface AnonymousRedeemResponse {
  success: boolean;
  credits: number;
  balance: number;
  message?: string;
  transaction_id?: number | null;
}

// 应用发布信息
export interface AppRelease {
  id: number;
  version: string;
  build_number?: string;
  release_notes?: string;
  notes_url?: string;
  download_url: string;
  file_size?: number;
  checksum?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface AppReleaseResponse {
  success: boolean;
  data?: AppRelease | null;
  release?: AppRelease | null;
  message?: string;
}

// 订单管理
export interface Purchase {
  id: number;
  order_id: string;
  platform: string;
  installation_id?: string;
  email?: string;
  product_id: number | string;
  credits: number;
  amount_cents?: number;
  currency?: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

export interface PurchaseListResponse {
  success: boolean;
  purchases: Purchase[];
  total: number;
  page: number;
  size: number;
}

export interface PurchaseFilters extends PaginationParams {
  platform?: string;
  status?: string;
  installation_id?: string;
  email?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PurchaseDetailResponse {
  success: boolean;
  purchase: Purchase;
  transactions: Transaction[];
}

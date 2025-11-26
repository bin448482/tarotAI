import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API基础URL
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

// 创建axios实例
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      withCredentials: false, // 使用 JWT Bearer Token，不需要 Cookie
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加 JWT Bearer Token
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('admin_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
          hasToken: !!config.headers.Authorization
        });
        return config;
      },
      (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        // First, log the raw error to understand its structure
        console.error('Raw Response Error:', error);

        const errorInfo = {
          status: error.response?.status || 'unknown',
          statusText: error.response?.statusText || 'unknown',
          url: error.config?.url || 'unknown',
          method: error.config?.method || 'unknown',
          data: error.response?.data || 'no response data',
          headers: error.response?.headers || 'no headers',
          message: error.message || 'unknown error',
          code: error.code || 'unknown',
          isNetworkError: !error.response
        };

        console.error('Response Error Details:', JSON.stringify(errorInfo, null, 2));

        // 处理认证错误
        if (error.response?.status === 401 || error.response?.status === 403) {
          // 清除本地存储的 token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token');
            // 重定向到登录页面
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // 通用请求方法
  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.request<T>(config);
      return response.data;
    } catch (error) {
      // Log raw error first
      console.error('Raw Error in request method:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail
          || error.response?.data?.message
          || error.message
          || 'Unknown API error';

        const statusCode = error.response?.status;

        // 构建详细的错误信息对象，确保所有值都有默认值
        const errorDetails = {
          url: error.config?.url || 'unknown',
          method: error.config?.method?.toUpperCase() || 'unknown',
          status: statusCode || 'unknown',
          responseData: error.response?.data || 'no response data',
          requestData: error.config?.data || 'no request data',
          message: errorMessage,
          errorType: 'AxiosError',
          code: error.code || 'unknown',
          isNetworkError: !error.response
        };

        // 记录详细的错误信息
        console.error('API Error Details:', JSON.stringify(errorDetails, null, 2));

        // 创建更具描述性的错误
        const fullError = new Error(`API请求失败: ${errorMessage} (状态码: ${statusCode || 'network error'})`);

        throw fullError;
      }

      // 处理非Axios错误
      console.error('Non-Axios error:', {
        errorType: 'Non-Axios',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: String(error)
      });
      throw new Error(`请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET请求
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  // POST请求
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  // PUT请求
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  // DELETE请求
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }

  // 设置认证token
  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  // 清除认证token
  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
  }

  // 获取当前token
  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_token');
    }
    return null;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

// 导出基础URL供其他地方使用
export { BASE_URL };

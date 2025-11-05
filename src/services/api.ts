import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { MockAuthService, shouldUseMockAuth } from './mockAuth';

// API 基礎配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// 創建外部 API axios 實例（用於後端服務器）
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 創建內部 API axios 實例（用於 Next.js API 路由）
const internalApiClient: AxiosInstance = axios.create({
  baseURL: '', // 使用相對路徑，調用 Next.js 自己的 API 路由
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器（外部 API）
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 添加認證 token
    const token = Cookies.get('admin_token') || localStorage.getItem('admin_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // 添加請求 ID 用於追蹤
    config.headers = {
      ...config.headers,
      'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // 開發模式下記錄請求
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 External API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 請求攔截器（內部 API）
internalApiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 添加認證 token
    const token = Cookies.get('admin_token') || localStorage.getItem('admin_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // 添加請求 ID 用於追蹤
    config.headers = {
      ...config.headers,
      'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // 開發模式下記錄請求
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Internal API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器（外部 API）
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 開發模式下記錄回應
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ External API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    // 統一錯誤處理
    const { response, request, message } = error;

    if (response) {
      // 伺服器回應錯誤
      const { status, data } = response;

      switch (status) {
        case 401:
          // 未授權，清除 token 並重定向到登入頁
          Cookies.remove('admin_token');
          localStorage.removeItem('admin_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          toast.error('登入已過期，請重新登入');
          break;

        case 403:
          toast.error('權限不足');
          break;

        case 404:
          toast.error('請求的資源不存在');
          break;

        case 422:
          // 表單驗證錯誤
          if (data.errors) {
            Object.values(data.errors).forEach((errorMsg: any) => {
              toast.error(errorMsg);
            });
          } else {
            toast.error(data.message || '請求參數錯誤');
          }
          break;

        case 500:
          toast.error('伺服器內部錯誤');
          break;

        default:
          toast.error(data.message || `請求失敗 (${status})`);
      }
    } else if (request) {
      // 網路錯誤
      toast.error('網路連接失敗，請檢查網路狀態');
    } else {
      // 其他錯誤
      toast.error(message || '未知錯誤');
    }

    // 開發模式下記錄錯誤詳情
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ External API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: response?.status,
        data: response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

// 回應攔截器（內部 API）
internalApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 開發模式下記錄回應
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Internal API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    // 統一錯誤處理
    const { response, request, message } = error;

    if (response) {
      // 伺服器回應錯誤
      const { status, data } = response;

      switch (status) {
        case 401:
          // 未授權，清除 token 並重定向到登入頁
          Cookies.remove('admin_token');
          localStorage.removeItem('admin_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          toast.error('登入已過期，請重新登入');
          break;

        case 403:
          toast.error('權限不足');
          break;

        case 404:
          toast.error('請求的資源不存在');
          break;

        case 422:
          // 表單驗證錯誤
          if (data.errors) {
            Object.values(data.errors).forEach((errorMsg: any) => {
              toast.error(errorMsg);
            });
          } else {
            toast.error(data.message || '請求參數錯誤');
          }
          break;

        case 500:
          toast.error('伺服器內部錯誤');
          break;

        default:
          toast.error(data.message || `請求失敗 (${status})`);
      }
    } else if (request) {
      // 網路錯誤
      console.error('❌ Internal API Network Error:', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
      });
      toast.error('網路連接失敗，請檢查網路狀態');
    } else {
      // 其他錯誤
      toast.error(message || '未知錯誤');
    }

    // 開發模式下記錄錯誤詳情
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Internal API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: response?.status,
        data: response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

// API 服務類
export class ApiService {
  // 通用請求方法（外部 API）
  static async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.request(config);
    return response.data;
  }

  static async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get(url, config);
    return response.data;
  }

  static async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post(url, data, config);
    return response.data;
  }

  static async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put(url, data, config);
    return response.data;
  }

  static async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  }

  static async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete(url, config);
    return response.data;
  }

  // 內部 API 請求方法（用於 Next.js API 路由）
  static async internalGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await internalApiClient.get(url, config);
    return response.data;
  }

  static async internalPost<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await internalApiClient.post(url, data, config);
    return response.data;
  }

  static async internalPut<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await internalApiClient.put(url, data, config);
    return response.data;
  }

  static async internalDelete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await internalApiClient.delete(url, config);
    return response.data;
  }

  // 認證相關（使用內部 API）
  static async login(email: string, password: string) {
    // 檢查是否使用模擬認證
    if (shouldUseMockAuth()) {
      return MockAuthService.login(email, password);
    }

    try {
      return await this.internalPost('/api/auth/admin/login', { email, password });
    } catch (error: any) {
      // 如果後端服務不可用，自動切換到模擬認證
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        console.warn('後端服務不可用，切換到模擬認證模式');
        return MockAuthService.login(email, password);
      }
      throw error;
    }
  }

  static async logout() {
    if (shouldUseMockAuth()) {
      return MockAuthService.logout();
    }

    try {
      return await this.internalPost('/api/auth/admin/logout');
    } catch (error) {
      // 登出失敗不影響客戶端清理
      console.warn('後端登出失敗，但客戶端狀態已清理');
      return { success: true, message: '登出成功' };
    }
  }

  static async getProfile() {
    if (shouldUseMockAuth()) {
      const token = Cookies.get('admin_token') || localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('未找到認證 Token');
      }
      return MockAuthService.getProfile(token);
    }

    try {
      return await this.internalGet('/api/auth/admin/profile');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        const token = Cookies.get('admin_token') || localStorage.getItem('admin_token');
        if (!token) {
          throw new Error('未找到認證 Token');
        }
        return MockAuthService.getProfile(token);
      }
      throw error;
    }
  }

  // 儀表板統計（使用內部 API）
  static async getDashboardStats() {
    if (shouldUseMockAuth()) {
      return MockAuthService.getDashboardStats();
    }

    try {
      return await this.internalGet('/api/admin/dashboard/stats');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        return MockAuthService.getDashboardStats();
      }
      throw error;
    }
  }

  // 訂單管理（使用內部 API）
  static async getBookings(params?: any) {
    // 如果 params 包含 statuses 陣列，轉換為逗號分隔的字串
    if (params?.statuses && Array.isArray(params.statuses)) {
      params = {
        ...params,
        statuses: params.statuses.join(','),
      };
    }
    return this.internalGet('/api/admin/bookings', { params });
  }

  static async getBookingById(id: string) {
    return this.internalGet(`/api/admin/bookings/${id}`);
  }

  static async updateBooking(id: string, data: any) {
    return this.internalPut(`/api/admin/bookings/${id}`, data);
  }

  static async assignDriver(bookingId: string, driverId: string) {
    return this.post(`/api/booking-flow/admin/bookings/${bookingId}/assign`, { driverId });
  }

  static async autoDispatch(bookingId: string) {
    return this.post(`/api/booking-flow/admin/bookings/${bookingId}/auto-dispatch`);
  }

  // 司機管理
  static async getDrivers(params?: any) {
    return this.internalGet('/api/admin/drivers', { params });
  }

  static async getDriverById(id: string) {
    return this.internalGet(`/api/admin/drivers/${id}`);
  }

  static async createDriver(data: any) {
    return this.internalPost('/api/admin/drivers', data);
  }

  static async updateDriver(id: string, data: any) {
    return this.internalPut(`/api/admin/drivers/${id}`, data);
  }

  static async approveDriver(id: string) {
    return this.internalPost(`/api/admin/drivers/${id}/approve`);
  }

  static async rejectDriver(id: string, reason: string) {
    return this.internalPost(`/api/admin/drivers/${id}/reject`, { reason });
  }

  // 客戶管理
  static async getCustomers(params?: any) {
    return this.internalGet('/api/admin/customers', { params });
  }

  static async getCustomerById(id: string) {
    return this.internalGet(`/api/admin/customers/${id}`);
  }

  static async updateCustomer(id: string, data: any) {
    return this.internalPut(`/api/admin/customers/${id}`, data);
  }

  // 支付管理
  static async getPayments(params?: any) {
    return this.internalGet('/api/admin/payments', { params });
  }

  static async getPaymentById(id: string) {
    return this.internalGet(`/api/admin/payments/${id}`);
  }

  static async confirmOfflinePayment(id: string, notes?: string) {
    return this.internalPost(`/api/admin/payments/${id}/confirm`, { notes });
  }

  static async refundPayment(id: string, amount: number, reason: string) {
    return this.internalPost(`/api/admin/payments/${id}/refund`, { amount, reason });
  }

  // 系統設定
  static async getSystemSettings() {
    return this.internalGet('/api/admin/settings');
  }

  static async updateSystemSettings(settings: any) {
    return this.internalPut('/api/admin/settings', settings);
  }

  static async getDispatchConfig() {
    return this.internalGet('/api/booking-flow/admin/dispatch/config');
  }

  static async updateDispatchConfig(config: any) {
    return this.internalPut('/api/booking-flow/admin/dispatch/config', config);
  }

  // 報表統計
  static async getRevenueStats(params?: any) {
    return this.internalGet('/api/admin/reports/revenue', { params });
  }

  static async getDriverStats(params?: any) {
    return this.internalGet('/api/admin/reports/drivers', { params });
  }

  static async getCustomerStats(params?: any) {
    return this.internalGet('/api/admin/reports/customers', { params });
  }

  // 檔案上傳
  static async uploadFile(file: File, path?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }

    return this.post('/api/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // 健康檢查
  static async healthCheck() {
    if (shouldUseMockAuth()) {
      return MockAuthService.healthCheck();
    }

    try {
      return await this.get('/api/health');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        return MockAuthService.healthCheck();
      }
      throw error;
    }
  }
}

export default apiClient;

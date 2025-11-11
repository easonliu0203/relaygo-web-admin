import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 添加預設值和錯誤處理
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlyhwegpvpnjyocqmfqc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWh3ZWdwdnBuanlvY3FtZnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5Nzc5OTYsImV4cCI6MjA3NDU1Mzk5Nn0.qnQBjvLm3IoXvJ0IptfMvPYRni1_7Den3iE9hFj-FYY';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWh3ZWdwdnBuanlvY3FtZnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk3Nzk5NiwiZXhwIjoyMDc0NTUzOTk2fQ.nQPynfQcSIZ1QPVSjDcgscugQcEgfRPUauW0psSRTQo';

// 檢查配置是否有效
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 配置不完整，將使用模擬模式');
}

// 客戶端 Supabase 實例 (用於前端) - 添加錯誤處理
let supabase: any = null;
let supabaseAdmin: any = null;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (error) {
  console.warn('無法建立 Supabase 客戶端實例:', error);
  // 建立模擬客戶端
  supabase = {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
    }),
  };
}

try {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} catch (error) {
  console.warn('無法建立 Supabase 管理員實例:', error);
  // 建立模擬管理員客戶端
  supabaseAdmin = supabase;
}

export { supabase, supabaseAdmin };

// 資料庫表名常數
export const TABLES = {
  USERS: 'users',
  DRIVERS: 'drivers',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  DRIVER_DOCUMENTS: 'driver_documents',
  CHAT_ROOMS: 'chat_rooms',
  CHAT_MESSAGES: 'chat_messages',
  SYSTEM_SETTINGS: 'system_settings',
  DRIVER_LOCATIONS: 'driver_locations',
} as const;

// 資料庫查詢輔助函數
export class DatabaseService {
  private client;
  public supabase; // 公開 supabase 實例供 API 使用

  constructor(useAdmin = false) {
    this.client = useAdmin ? supabaseAdmin : supabase;
    this.supabase = this.client; // 提供公開訪問

    // 檢查客戶端是否正確初始化
    if (!this.client) {
      console.error('Supabase 客戶端未正確初始化');
      throw new Error('Supabase 客戶端未正確初始化');
    }
  }

  // 用戶相關查詢
  async getUsers(filters?: { role?: string; status?: string; limit?: number; offset?: number }) {
    let query = this.client.from(TABLES.USERS).select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return query.order('created_at', { ascending: false });
  }

  async getUserById(id: string) {
    return this.client
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single();
  }

  async createUser(userData: any) {
    return this.client
      .from(TABLES.USERS)
      .insert(userData)
      .select()
      .single();
  }

  async updateUser(id: string, updates: any) {
    return this.client
      .from(TABLES.USERS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  }

  // 司機相關查詢
  async getDrivers(filters?: { status?: string; vehicleType?: string; isAvailable?: boolean }) {
    let query = this.client
      .from(TABLES.USERS)
      .select(`
        *,
        driver_documents (*)
      `)
      .eq('role', 'driver');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.vehicleType) {
      query = query.eq('vehicle_type', filters.vehicleType);
    }
    if (filters?.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    return query.order('created_at', { ascending: false });
  }

  async getDriverById(id: string) {
    return this.client
      .from(TABLES.USERS)
      .select(`
        *,
        driver_documents (*)
      `)
      .eq('id', id)
      .eq('role', 'driver')
      .single();
  }

  // 預約相關查詢
  async getBookings(filters?: { 
    status?: string; 
    customerId?: string; 
    driverId?: string; 
    startDate?: string;
    endDate?: string;
    limit?: number; 
    offset?: number;
  }) {
    let query = this.client
      .from(TABLES.BOOKINGS)
      .select(`
        *,
        customer:customer_id (id, name, email, phone),
        driver:driver_id (id, name, email, phone, vehicle_type, vehicle_number)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.driverId) {
      query = query.eq('driver_id', filters.driverId);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('start_date', filters.endDate);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return query.order('created_at', { ascending: false });
  }

  async getBookingById(id: string) {
    return this.client
      .from(TABLES.BOOKINGS)
      .select(`
        *,
        customer:customer_id (id, name, email, phone),
        driver:driver_id (id, name, email, phone, vehicle_type, vehicle_number),
        payments (*)
      `)
      .eq('id', id)
      .single();
  }

  async updateBooking(id: string, updates: any) {
    return this.client
      .from(TABLES.BOOKINGS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  }

  // 支付相關查詢
  async getPayments(filters?: { 
    bookingId?: string; 
    customerId?: string; 
    status?: string; 
    type?: string;
    limit?: number; 
    offset?: number;
  }) {
    let query = this.client
      .from(TABLES.PAYMENTS)
      .select(`
        *,
        booking:booking_id (id, booking_number),
        customer:customer_id (id, name, email)
      `);

    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return query.order('created_at', { ascending: false });
  }

  async updatePayment(id: string, updates: any) {
    return this.client
      .from(TABLES.PAYMENTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  }

  // 統計查詢
  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    // 並行執行多個查詢
    const [
      totalBookingsResult,
      todayBookingsResult,
      activeDriversResult,
      activeCustomersResult,
      revenueResult,
    ] = await Promise.all([
      this.client.from(TABLES.BOOKINGS).select('id', { count: 'exact' }),
      this.client.from(TABLES.BOOKINGS).select('id', { count: 'exact' }).eq('start_date', today),
      this.client.from(TABLES.USERS).select('id', { count: 'exact' }).eq('role', 'driver').eq('status', 'active'),
      this.client.from(TABLES.USERS).select('id', { count: 'exact' }).eq('role', 'customer').eq('status', 'active'),
      this.client.from(TABLES.PAYMENTS).select('amount').eq('status', 'completed'),
    ]);

    const totalRevenue = revenueResult.data?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
    const todayRevenue = revenueResult.data?.filter((payment: any) =>
      payment.created_at?.startsWith(today)
    ).reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;

    return {
      totalBookings: totalBookingsResult.count || 0,
      todayBookings: todayBookingsResult.count || 0,
      activeDrivers: activeDriversResult.count || 0,
      activeCustomers: activeCustomersResult.count || 0,
      totalRevenue,
      todayRevenue,
    };
  }

  // 系統設定
  async getSystemSettings() {
    return this.client
      .from(TABLES.SYSTEM_SETTINGS)
      .select('*')
      .order('key');
  }

  async updateSystemSetting(key: string, value: any) {
    return this.client
      .from(TABLES.SYSTEM_SETTINGS)
      .upsert({ key, value })
      .select()
      .single();
  }
}

// 預設資料庫服務實例
export const db = new DatabaseService();
export const dbAdmin = new DatabaseService(true);

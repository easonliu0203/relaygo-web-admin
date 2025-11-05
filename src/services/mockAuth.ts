// 模擬認證服務 - 封測階段使用
import { User } from '@/types';

// 模擬用戶資料
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: '系統管理員',
    role: 'admin',
    status: 'active',
    avatar: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'manager@example.com',
    name: '營運經理',
    role: 'admin', // 修正為有效的角色
    status: 'active',
    avatar: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// 模擬密碼（實際應用中絕不能這樣做）
const MOCK_PASSWORDS: Record<string, string> = {
  'admin@example.com': 'admin123456',
  'manager@example.com': 'manager123456',
};

// 模擬 JWT Token 生成
const generateMockToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天過期
  };
  
  // 簡單的 base64 編碼（僅用於演示，實際應用需要真正的 JWT）
  return btoa(JSON.stringify(payload));
};

// 驗證 Token
const verifyMockToken = (token: string): User | null => {
  try {
    const payload = JSON.parse(atob(token));
    
    // 檢查是否過期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // 查找用戶
    const user = MOCK_USERS.find(u => u.id === payload.id);
    return user || null;
  } catch (error) {
    return null;
  }
};

// 模擬 API 延遲
const mockDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

export class MockAuthService {
  // 模擬登入
  static async login(email: string, password: string) {
    await mockDelay();
    
    // 查找用戶
    const user = MOCK_USERS.find(u => u.email === email);
    
    if (!user) {
      throw new Error('用戶不存在');
    }
    
    // 驗證密碼
    if (MOCK_PASSWORDS[email] !== password) {
      throw new Error('密碼錯誤');
    }
    
    // 檢查用戶狀態
    if (user.status !== 'active') {
      throw new Error('帳號已被停用');
    }
    
    // 生成 Token
    const token = generateMockToken(user);
    
    return {
      success: true,
      data: {
        user,
        token,
      },
      message: '登入成功',
    };
  }
  
  // 模擬登出
  static async logout() {
    await mockDelay(200);
    
    return {
      success: true,
      message: '登出成功',
    };
  }
  
  // 模擬獲取用戶資料
  static async getProfile(token: string) {
    await mockDelay(300);
    
    const user = verifyMockToken(token);
    
    if (!user) {
      throw new Error('Token 無效或已過期');
    }
    
    return {
      success: true,
      data: user,
      message: '獲取用戶資料成功',
    };
  }
  
  // 模擬健康檢查
  static async healthCheck() {
    await mockDelay(100);
    
    return {
      success: true,
      data: {
        status: 'healthy',
        service: '模擬認證服務',
        timestamp: new Date().toISOString(),
      },
      message: '服務正常',
    };
  }
  
  // 模擬儀表板統計
  static async getDashboardStats() {
    await mockDelay(500);

    return {
      success: true,
      data: {
        totalBookings: 156,
        activeBookings: 23,
        totalDrivers: 45,
        activeDrivers: 32,
        totalCustomers: 289,
        todayRevenue: 45600,
        monthlyRevenue: 1234500,
        completionRate: 0.94,
        averageRating: 4.7,
        recentBookings: [
          {
            id: 'BK202409001',
            customer: '王小明',
            driver: '司機張三',
            status: 'completed',
            amount: 1500,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'BK202409002',
            customer: '李小華',
            driver: '司機李四',
            status: 'in_progress',
            amount: 2200,
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'BK202409003',
            customer: '陳小美',
            driver: null,
            status: 'pending',
            amount: 1800,
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
        ],
      },
      message: '獲取統計資料成功',
    };
  }

  // 模擬系統設定相關 API
  static async getSystemSettings(key?: string) {
    await mockDelay(300);

    const mockSettings = {
      pricing_config: {
        vehicle_types: {
          large: {
            name: "8-9人座車型",
            code: ["A", "B"],
            packages: {
              "6_hours": {
                duration: 6,
                original_price: 70,
                discount_price: 60,
                overtime_rate: 8
              },
              "8_hours": {
                duration: 8,
                original_price: 85,
                discount_price: 75,
                overtime_rate: 8
              }
            }
          },
          small: {
            name: "3-4人座車型",
            code: ["C", "D"],
            packages: {
              "6_hours": {
                duration: 6,
                original_price: 50,
                discount_price: 40,
                overtime_rate: 5
              },
              "8_hours": {
                duration: 8,
                original_price: 60,
                discount_price: 50,
                overtime_rate: 5
              }
            }
          }
        },
        currency: "USD",
        updated_at: new Date().toISOString()
      },
      beta_testing_config: {
        auto_payment_enabled: true,
        auto_payment_delay_seconds: 5,
        auto_payment_description: "封測階段自動支付",
        enabled_until: "2025-12-31T23:59:59Z",
        notification_enabled: true
      },
      vehicle_type_mapping: {
        A: {
          name: "豪華9人座",
          capacity: 9,
          category: "large",
          description: "豪華商務車，適合商務接待"
        },
        B: {
          name: "標準8人座",
          capacity: 8,
          category: "large",
          description: "標準8人座車型，適合團體出行"
        },
        C: {
          name: "舒適4人座",
          capacity: 4,
          category: "small",
          description: "舒適轎車，適合小家庭"
        },
        D: {
          name: "經濟3人座",
          capacity: 3,
          category: "small",
          description: "經濟型車輛，適合個人或情侶"
        }
      },
      payment_settings: {
        deposit_percentage: 0.3,
        payment_timeout_hours: 24,
        refund_policy: {
          cancellation_before_24h: 0.9,
          cancellation_before_12h: 0.5,
          cancellation_before_2h: 0.1,
          no_show: 0.0
        },
        supported_currencies: ["USD", "TWD"],
        default_currency: "USD"
      }
    };

    if (key) {
      return {
        success: true,
        data: { value: mockSettings[key as keyof typeof mockSettings] },
        message: '獲取系統設定成功',
      };
    }

    return {
      success: true,
      data: mockSettings,
      message: '獲取系統設定成功',
    };
  }

  // 模擬更新系統設定
  static async updateSystemSettings(key: string, value: any) {
    await mockDelay(400);

    // 模擬儲存到 localStorage
    const storageKey = `mock_system_settings_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(value));

    return {
      success: true,
      message: '系統設定已更新',
    };
  }

  // 模擬價格計算
  static async calculateBookingPrice(vehicleType: string, duration: number, useDiscount: boolean = false) {
    await mockDelay(200);

    // 預設價格表
    const mockPricing = {
      large: {
        '6_hours': { duration: 6, original: 70, discount: 60, overtime: 8 },
        '8_hours': { duration: 8, original: 85, discount: 75, overtime: 8 },
      },
      small: {
        '6_hours': { duration: 6, original: 50, discount: 40, overtime: 5 },
        '8_hours': { duration: 8, original: 60, discount: 50, overtime: 5 },
      },
    };

    const category = ['A', 'B'].includes(vehicleType) ? 'large' : 'small';
    const packageType = duration <= 6 ? '6_hours' : '8_hours';
    const pricing = mockPricing[category][packageType];

    const basePrice = useDiscount ? pricing.discount : pricing.original;
    const overtimeHours = Math.max(0, duration - pricing.duration);
    const overtimeCost = overtimeHours * pricing.overtime;
    const totalPrice = basePrice + overtimeCost;
    const depositAmount = Math.round(totalPrice * 0.3 * 100) / 100;

    return {
      success: true,
      data: {
        base_price: basePrice,
        overtime_hours: overtimeHours,
        overtime_cost: overtimeCost,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        balance_amount: totalPrice - depositAmount,
        vehicle_category: category,
        package_type: packageType,
        discount_applied: useDiscount,
      },
      message: '價格計算成功',
    };
  }
}

// 檢查是否應該使用模擬服務
export const shouldUseMockAuth = (): boolean => {
  // 在開發環境且沒有後端服務時使用模擬認證
  return process.env.NODE_ENV === 'development' && 
         process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';
};

// 模擬用戶列表（供參考）
export const MOCK_TEST_ACCOUNTS = [
  {
    email: 'admin@example.com',
    password: 'admin123456',
    role: '系統管理員',
    description: '擁有所有權限的超級管理員',
  },
  {
    email: 'manager@example.com', 
    password: 'manager123456',
    role: '營運經理',
    description: '負責日常營運管理',
  },
];

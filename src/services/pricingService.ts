// 價格管理服務
import { ApiService } from './api';

export interface VehicleType {
  name: string;
  code: string[];
  packages: {
    [key: string]: {
      duration: number;
      original_price: number;
      discount_price: number;
      overtime_rate: number;
    };
  };
}

export interface PricingConfig {
  vehicle_types: {
    large: VehicleType;
    small: VehicleType;
  };
  currency: string;
  updated_at: string;
}

export interface PriceCalculation {
  base_price: number;
  overtime_hours: number;
  overtime_cost: number;
  total_price: number;
  deposit_amount: number;
  balance_amount: number;
  vehicle_category: string;
  package_type: string;
  discount_applied: boolean;
}

export interface BetaTestingConfig {
  auto_payment_enabled: boolean;
  auto_payment_delay_seconds: number;
  auto_payment_description: string;
  enabled_until: string;
  notification_enabled: boolean;
}

export class PricingService {
  // 獲取價格配置
  static async getPricingConfig(): Promise<PricingConfig> {
    try {
      const response = await ApiService.get('/api/admin/system-settings?key=pricing_config');
      if (response.success) {
        return response.data.value as PricingConfig;
      }
      throw new Error(response.message || '獲取價格配置失敗');
    } catch (error: any) {
      // 降級到模擬資料
      console.warn('使用模擬價格配置');
      return {
        vehicle_types: {
          large: {
            name: "8-9人座車型",
            code: ["A", "B"],
            packages: {
              "6_hours": { duration: 6, original_price: 70, discount_price: 60, overtime_rate: 8 },
              "8_hours": { duration: 8, original_price: 85, discount_price: 75, overtime_rate: 8 }
            }
          },
          small: {
            name: "3-4人座車型",
            code: ["C", "D"],
            packages: {
              "6_hours": { duration: 6, original_price: 50, discount_price: 40, overtime_rate: 5 },
              "8_hours": { duration: 8, original_price: 60, discount_price: 50, overtime_rate: 5 }
            }
          }
        },
        currency: "USD",
        updated_at: new Date().toISOString()
      };
    }
  }

  // 更新價格配置
  static async updatePricingConfig(config: PricingConfig): Promise<void> {
    try {
      const response = await ApiService.put('/api/admin/system-settings', {
        key: 'pricing_config',
        value: config
      });
      if (!response.success) {
        throw new Error(response.message || '更新價格配置失敗');
      }
    } catch (error: any) {
      throw new Error(`更新價格配置失敗: ${error.message}`);
    }
  }

  // 計算訂單價格
  static async calculatePrice(
    vehicleType: string,
    duration: number,
    useDiscount: boolean = false
  ): Promise<PriceCalculation> {
    try {
      const response = await ApiService.post('/api/admin/calculate-price', {
        vehicle_type: vehicleType,
        duration: duration,
        use_discount: useDiscount,
      });

      if (response.success) {
        return response.data as PriceCalculation;
      }
      throw new Error(response.message || '價格計算失敗');
    } catch (error: any) {
      // 降級到模擬計算
      console.warn('使用模擬價格計算');
      return this.calculatePriceMock(vehicleType, duration, useDiscount);
    }
  }

  // 獲取車型對應表
  static async getVehicleTypeMapping(): Promise<Record<string, any>> {
    try {
      const response = await ApiService.get('/api/admin/system-settings?key=vehicle_type_mapping');
      if (response.success) {
        return response.data.value;
      }
      throw new Error(response.message || '獲取車型對應表失敗');
    } catch (error: any) {
      // 降級到預設對應表
      console.warn('使用預設車型對應表');
      return {
        A: { name: '豪華9人座', category: 'large' },
        B: { name: '標準8人座', category: 'large' },
        C: { name: '舒適4人座', category: 'small' },
        D: { name: '經濟3人座', category: 'small' },
      };
    }
  }

  // 獲取封測配置
  static async getBetaTestingConfig(): Promise<BetaTestingConfig> {
    try {
      const response = await ApiService.get('/api/admin/system-settings?key=beta_testing_config');
      if (response.success) {
        return response.data.value as BetaTestingConfig;
      }
      throw new Error(response.message || '獲取封測配置失敗');
    } catch (error: any) {
      // 降級到預設配置
      console.warn('使用預設封測配置');
      return {
        auto_payment_enabled: true,
        auto_payment_delay_seconds: 5,
        auto_payment_description: "封測階段自動支付",
        enabled_until: "2025-12-31T23:59:59Z",
        notification_enabled: true
      };
    }
  }

  // 更新封測配置
  static async updateBetaTestingConfig(config: BetaTestingConfig): Promise<void> {
    try {
      const response = await ApiService.put('/api/admin/system-settings', {
        key: 'beta_testing_config',
        value: config
      });
      if (!response.success) {
        throw new Error(response.message || '更新封測配置失敗');
      }
    } catch (error: any) {
      throw new Error(`更新封測配置失敗: ${error.message}`);
    }
  }

  // 獲取支付設定
  static async getPaymentSettings(): Promise<any> {
    try {
      const response = await ApiService.get('/api/admin/system-settings?key=payment_settings');
      if (response.success) {
        return response.data.value;
      }
      throw new Error(response.message || '獲取支付設定失敗');
    } catch (error: any) {
      // 降級到預設支付設定
      console.warn('使用預設支付設定');
      return {
        deposit_percentage: 0.3,
        currency: 'USD',
        payment_methods: ['credit_card', 'paypal', 'bank_transfer'],
        auto_payment_enabled: true,
      };
    }
  }

  // 模擬價格計算（當資料庫不可用時）
  static calculatePriceMock(
    vehicleType: string,
    duration: number,
    useDiscount: boolean = false
  ): PriceCalculation {
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
      base_price: basePrice,
      overtime_hours: overtimeHours,
      overtime_cost: overtimeCost,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      balance_amount: totalPrice - depositAmount,
      vehicle_category: category,
      package_type: packageType,
      discount_applied: useDiscount,
    };
  }

  // 格式化價格顯示
  static formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // 獲取車型顯示名稱
  static getVehicleTypeName(vehicleType: string): string {
    const mapping: Record<string, string> = {
      A: '豪華9人座',
      B: '標準8人座',
      C: '舒適4人座',
      D: '經濟3人座',
    };
    return mapping[vehicleType] || `車型${vehicleType}`;
  }

  // 獲取車型類別
  static getVehicleCategory(vehicleType: string): 'large' | 'small' {
    return ['A', 'B'].includes(vehicleType) ? 'large' : 'small';
  }

  // 驗證價格配置
  static validatePricingConfig(config: PricingConfig): string[] {
    const errors: string[] = [];

    // 檢查必要欄位
    if (!config.vehicle_types) {
      errors.push('缺少車型配置');
      return errors;
    }

    // 檢查大型車配置
    if (!config.vehicle_types.large) {
      errors.push('缺少大型車配置');
    } else {
      const large = config.vehicle_types.large;
      if (!large.packages?.['6_hours'] || !large.packages?.['8_hours']) {
        errors.push('大型車缺少套餐配置');
      }
    }

    // 檢查小型車配置
    if (!config.vehicle_types.small) {
      errors.push('缺少小型車配置');
    } else {
      const small = config.vehicle_types.small;
      if (!small.packages?.['6_hours'] || !small.packages?.['8_hours']) {
        errors.push('小型車缺少套餐配置');
      }
    }

    // 檢查價格合理性
    ['large', 'small'].forEach(category => {
      const vehicleType = config.vehicle_types[category as keyof typeof config.vehicle_types];
      if (vehicleType?.packages) {
        Object.entries(vehicleType.packages).forEach(([packageKey, packageConfig]) => {
          if (packageConfig.original_price <= 0) {
            errors.push(`${category} ${packageKey} 原價必須大於0`);
          }
          if (packageConfig.discount_price <= 0) {
            errors.push(`${category} ${packageKey} 優惠價必須大於0`);
          }
          if (packageConfig.discount_price >= packageConfig.original_price) {
            errors.push(`${category} ${packageKey} 優惠價必須小於原價`);
          }
          if (packageConfig.overtime_rate <= 0) {
            errors.push(`${category} ${packageKey} 超時費率必須大於0`);
          }
        });
      }
    });

    return errors;
  }
}

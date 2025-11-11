import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

// 車型映射：資料庫車型 -> 客戶端車型
const VEHICLE_TYPE_MAPPING = {
  'A': 'small', // 3-4人座小型車
  'B': 'small', // 3-4人座小型車
  'C': 'large', // 8-9人座大型車
  'D': 'large', // 8-9人座大型車
} as const;

// 車型顯示名稱
const VEHICLE_DISPLAY_NAMES = {
  'small': '3-4人座',
  'large': '8-9人座',
} as const;

// 車型特色
const VEHICLE_FEATURES = {
  'small': [
    '專業司機服務',
    '車輛保險保障',
    '24小時客服支援',
    '3-4人座舒適空間',
    '經濟實惠',
    '適合小家庭',
  ],
  'large': [
    '專業司機服務',
    '車輛保險保障',
    '24小時客服支援',
    '8-9人座寬敞空間',
    '大型行李箱',
    '適合團體出行',
  ],
} as const;

interface VehiclePricing {
  id: string;
  vehicle_type: string;
  duration_hours: number;
  base_price: number;
  overtime_rate: number;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
}

interface VehiclePackage {
  id: string;
  name: string;
  description: string;
  duration: number;
  originalPrice: number;
  discountPrice: number;
  overtimeRate: number;
  vehicleCategory: string;
  features: string[];
}

// CORS headers for mobile app access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    let pricingData: any[] = [];
    let error: any = null;

    try {
      const db = new DatabaseService();

      // 獲取所有有效的價格配置
      const result = await db.supabase
        .from('vehicle_pricing')
        .select('*')
        .eq('is_active', true)
        .is('effective_until', null) // 只取目前有效的價格
        .order('vehicle_type', { ascending: true })
        .order('duration_hours', { ascending: true });

      pricingData = result.data || [];
      error = result.error;
    } catch (dbError) {
      console.warn('無法連接到 Supabase，使用模擬資料:', dbError);
      error = dbError;
    }

    // 如果資料庫查詢失敗或沒有資料，使用模擬資料
    if (error || !pricingData || pricingData.length === 0) {
      console.log('使用模擬價格配置資料');
      pricingData = [
        // A/B 類型：3-4人座小型車（價格較低）
        { vehicle_type: 'A', duration_hours: 6, base_price: 50, overtime_rate: 5 },
        { vehicle_type: 'A', duration_hours: 8, base_price: 60, overtime_rate: 5 },
        { vehicle_type: 'B', duration_hours: 6, base_price: 50, overtime_rate: 5 },
        { vehicle_type: 'B', duration_hours: 8, base_price: 60, overtime_rate: 5 },
        // C/D 類型：8-9人座大型車（價格較高）
        { vehicle_type: 'C', duration_hours: 6, base_price: 70, overtime_rate: 8 },
        { vehicle_type: 'C', duration_hours: 8, base_price: 85, overtime_rate: 8 },
        { vehicle_type: 'D', duration_hours: 6, base_price: 70, overtime_rate: 8 },
        { vehicle_type: 'D', duration_hours: 8, base_price: 85, overtime_rate: 8 },
      ];
    }

    if (!pricingData || pricingData.length === 0) {
      // 如果沒有價格配置，返回預設配置
      const defaultPackages = getDefaultPackages();
      return NextResponse.json({
        success: true,
        data: defaultPackages,
        source: 'default'
      }, { headers: corsHeaders });
    }

    // 轉換資料庫格式為客戶端格式
    const allPackages: VehiclePackage[] = pricingData.map((pricing: any) => {
      const clientVehicleType = VEHICLE_TYPE_MAPPING[pricing.vehicle_type as keyof typeof VEHICLE_TYPE_MAPPING];
      const displayName = VEHICLE_DISPLAY_NAMES[clientVehicleType];
      const features = [...VEHICLE_FEATURES[clientVehicleType]] as string[];

      // 8小時方案添加長時間優惠標籤
      if (pricing.duration_hours >= 8) {
        features.push('長時間包車優惠');
      }

      return {
        id: `${clientVehicleType}_${pricing.duration_hours}h`,
        name: `${displayName} ${pricing.duration_hours}小時方案`,
        description: `適合${pricing.duration_hours}小時內的${clientVehicleType === 'large' ? '大型車' : '小型車'}包車服務`,
        duration: pricing.duration_hours,
        originalPrice: pricing.base_price,
        discountPrice: pricing.base_price, // 目前沒有折扣邏輯，原價等於優惠價
        overtimeRate: pricing.overtime_rate,
        vehicleCategory: clientVehicleType,
        features: features,
      };
    });

    // 去重：因為 A/B 都映射到 small，C/D 都映射到 large
    // 使用 Map 來去重，保留第一個出現的套餐
    const uniquePackagesMap = new Map<string, VehiclePackage>();
    allPackages.forEach((pkg: any) => {
      if (!uniquePackagesMap.has(pkg.id)) {
        uniquePackagesMap.set(pkg.id, pkg);
      }
    });
    const packages = Array.from(uniquePackagesMap.values());

    console.log(`[Pricing API] 原始套餐數: ${allPackages.length}, 去重後: ${packages.length}`);

    return NextResponse.json({
      success: true,
      data: packages,
      source: 'database'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('API 錯誤:', error);
    return NextResponse.json(
      { error: '內部伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 預設套餐配置（降級使用）
function getDefaultPackages(): VehiclePackage[] {
  return [
    {
      id: 'large_6h',
      name: '8-9人座 6小時方案',
      description: '適合6小時內的大型車包車服務',
      duration: 6,
      originalPrice: 70.0,
      discountPrice: 60.0,
      overtimeRate: 8.0,
      vehicleCategory: 'large',
      features: [
        '專業司機服務',
        '車輛保險保障',
        '24小時客服支援',
        '8-9人座寬敞空間',
        '大型行李箱',
        '適合團體出行',
      ],
    },
    {
      id: 'large_8h',
      name: '8-9人座 8小時方案',
      description: '適合8小時內的大型車包車服務',
      duration: 8,
      originalPrice: 85.0,
      discountPrice: 75.0,
      overtimeRate: 8.0,
      vehicleCategory: 'large',
      features: [
        '專業司機服務',
        '車輛保險保障',
        '24小時客服支援',
        '8-9人座寬敞空間',
        '大型行李箱',
        '適合團體出行',
        '長時間包車優惠',
      ],
    },
    {
      id: 'small_6h',
      name: '3-4人座 6小時方案',
      description: '適合6小時內的小型車包車服務',
      duration: 6,
      originalPrice: 50.0,
      discountPrice: 40.0,
      overtimeRate: 5.0,
      vehicleCategory: 'small',
      features: [
        '專業司機服務',
        '車輛保險保障',
        '24小時客服支援',
        '3-4人座舒適空間',
        '經濟實惠',
        '適合小家庭',
      ],
    },
    {
      id: 'small_8h',
      name: '3-4人座 8小時方案',
      description: '適合8小時內的小型車包車服務',
      duration: 8,
      originalPrice: 60.0,
      discountPrice: 50.0,
      overtimeRate: 5.0,
      vehicleCategory: 'small',
      features: [
        '專業司機服務',
        '車輛保險保障',
        '24小時客服支援',
        '3-4人座舒適空間',
        '經濟實惠',
        '適合小家庭',
        '長時間包車優惠',
      ],
    },
  ];
}

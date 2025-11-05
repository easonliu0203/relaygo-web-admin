// 用戶相關類型
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'driver' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// 司機相關類型
export interface Driver extends User {
  role: 'driver';
  licenseNumber: string;
  vehicleType: 'A' | 'B' | 'C' | 'D';
  vehicleNumber: string;
  rating: number;
  totalTrips: number;
  isAvailable: boolean;
  documents: DriverDocument[];
  bankAccount?: BankAccount;
}

export interface DriverDocument {
  id: string;
  type: 'license' | 'vehicle_registration' | 'insurance' | 'id_card';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// 預約相關類型
export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  driverId?: string;
  vehicleType: 'A' | 'B' | 'C' | 'D';
  status: BookingStatus;
  startDate: string;
  startTime: string;
  duration: number;
  pickupLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLocation?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  specialRequirements?: string;
  pricing: BookingPricing;
  timestamps: BookingTimestamps;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 
  | 'draft'
  | 'pending_payment'
  | 'paid_deposit'
  | 'assigned'
  | 'driver_confirmed'
  | 'driver_departed'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_ended'
  | 'pending_balance'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface BookingPricing {
  basePrice: number;
  hourlyRate: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  overtimeFee?: number;
  tip?: number;
  platformFee: number;
  driverEarning: number;
}

export interface BookingTimestamps {
  createdAt: string;
  paidAt?: string;
  assignedAt?: string;
  confirmedAt?: string;
  departedAt?: string;
  arrivedAt?: string;
  tripStartedAt?: string;
  tripEndedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

// 支付相關類型
export interface Payment {
  id: string;
  transactionId: string;
  bookingId: string;
  customerId: string;
  type: 'deposit' | 'balance' | 'refund';
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentProvider: string;
  paymentMethod?: string;
  isTestMode: boolean;
  externalTransactionId?: string;
  paymentUrl?: string;
  instructions?: string;
  confirmedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

// 系統設定類型
export interface SystemSettings {
  pricing: PricingSettings;
  dispatch: DispatchSettings;
  payment: PaymentSettings;
  notification: NotificationSettings;
}

export interface PricingSettings {
  vehicleTypes: {
    [key in 'A' | 'B' | 'C' | 'D']: {
      name: string;
      basePrice: number;
      hourlyRate: number;
      description: string;
    };
  };
  depositRate: number;
  platformFeeRate: number;
  overtimeRate: number;
}

export interface DispatchSettings {
  autoDispatchEnabled: boolean;
  maxRadius: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
  priorityFactors: {
    distance: number;
    rating: number;
    experience: number;
  };
}

export interface PaymentSettings {
  provider: string;
  testMode: boolean;
  supportedMethods: string[];
  autoConfirmOfflinePayments: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  templates: {
    [key: string]: {
      title: string;
      content: string;
      enabled: boolean;
    };
  };
}

// 統計報表類型
export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  activeDrivers: number;
  activeCustomers: number;
  todayBookings: number;
  todayRevenue: number;
  completionRate: number;
  averageRating: number;
}

export interface RevenueStats {
  daily: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
  monthly: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
  byVehicleType: Array<{
    type: string;
    revenue: number;
    bookings: number;
  }>;
}

export interface DriverStats {
  id: string;
  name: string;
  totalTrips: number;
  totalEarnings: number;
  rating: number;
  completionRate: number;
  onlineHours: number;
}

// API 回應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 表單類型
export interface LoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export interface DriverForm {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleType: 'A' | 'B' | 'C' | 'D';
  vehicleNumber: string;
  bankAccount: BankAccount;
}

export interface BookingForm {
  customerId: string;
  vehicleType: 'A' | 'B' | 'C' | 'D';
  startDate: string;
  startTime: string;
  duration: number;
  pickupLocation: string;
  specialRequirements?: string;
}

// 聊天相關類型
export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderType: 'customer' | 'driver' | 'system';
  type: 'text' | 'image' | 'location' | 'system';
  content: string;
  metadata?: Record<string, any>;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoom {
  id: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  status: 'active' | 'inactive' | 'closed';
  createdAt: string;
  closedAt?: string;
  lastMessageAt?: string;
  unreadCount: {
    customer: number;
    driver: number;
  };
}

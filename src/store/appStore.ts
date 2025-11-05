import { create } from 'zustand';
import { DashboardStats, SystemSettings } from '@/types';

interface AppState {
  // 側邊欄狀態
  sidebarCollapsed: boolean;
  
  // 儀表板統計
  dashboardStats: DashboardStats | null;
  statsLoading: boolean;
  
  // 系統設定
  systemSettings: SystemSettings | null;
  settingsLoading: boolean;
  
  // 通知
  notifications: Notification[];
  unreadCount: number;
  
  // 全域載入狀態
  globalLoading: boolean;
  
  // 錯誤狀態
  globalError: string | null;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface AppActions {
  // 側邊欄控制
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // 儀表板統計
  setDashboardStats: (stats: DashboardStats) => void;
  setStatsLoading: (loading: boolean) => void;
  
  // 系統設定
  setSystemSettings: (settings: SystemSettings) => void;
  setSettingsLoading: (loading: boolean) => void;
  
  // 通知管理
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // 全域狀態
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  
  // 重設狀態
  resetAppState: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  // 初始狀態
  sidebarCollapsed: false,
  dashboardStats: null,
  statsLoading: false,
  systemSettings: null,
  settingsLoading: false,
  notifications: [],
  unreadCount: 0,
  globalLoading: false,
  globalError: null,

  // 側邊欄控制
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  // 儀表板統計
  setDashboardStats: (stats: DashboardStats) => {
    set({ dashboardStats: stats });
  },

  setStatsLoading: (loading: boolean) => {
    set({ statsLoading: loading });
  },

  // 系統設定
  setSystemSettings: (settings: SystemSettings) => {
    set({ systemSettings: settings });
  },

  setSettingsLoading: (loading: boolean) => {
    set({ settingsLoading: loading });
  },

  // 通知管理
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markNotificationAsRead: (id: string) => {
    set((state) => {
      const notifications = state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      );
      
      const unreadCount = notifications.filter((notif) => !notif.read).length;
      
      return { notifications, unreadCount };
    });
  },

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id: string) => {
    set((state) => {
      const notifications = state.notifications.filter((notif) => notif.id !== id);
      const unreadCount = notifications.filter((notif) => !notif.read).length;
      
      return { notifications, unreadCount };
    });
  },

  clearAllNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  // 全域狀態
  setGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading });
  },

  setGlobalError: (error: string | null) => {
    set({ globalError: error });
  },

  // 重設狀態
  resetAppState: () => {
    set({
      sidebarCollapsed: false,
      dashboardStats: null,
      statsLoading: false,
      systemSettings: null,
      settingsLoading: false,
      notifications: [],
      unreadCount: 0,
      globalLoading: false,
      globalError: null,
    });
  },
}));

// 選擇器 (Selectors)
export const selectSidebarState = (state: AppStore) => ({
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  setCollapsed: state.setSidebarCollapsed,
});

export const selectDashboardState = (state: AppStore) => ({
  stats: state.dashboardStats,
  loading: state.statsLoading,
  setStats: state.setDashboardStats,
  setLoading: state.setStatsLoading,
});

export const selectNotificationState = (state: AppStore) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  addNotification: state.addNotification,
  markAsRead: state.markNotificationAsRead,
  markAllAsRead: state.markAllNotificationsAsRead,
  remove: state.removeNotification,
  clearAll: state.clearAllNotifications,
});

export const selectGlobalState = (state: AppStore) => ({
  loading: state.globalLoading,
  error: state.globalError,
  setLoading: state.setGlobalLoading,
  setError: state.setGlobalError,
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiService } from '@/services/api';
import { User } from '@/types';
import Cookies from 'js-cookie';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登入
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await ApiService.login(email, password);
          
          if (response.success) {
            const { user, token } = response.data;
            
            // 儲存 token
            Cookies.set('admin_token', token, { expires: 7 }); // 7天過期
            localStorage.setItem('admin_token', token);
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || '登入失敗');
          }
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || '登入失敗',
          });
          throw error;
        }
      },

      // Google 登入
      loginWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });

          // 動態載入 Firebase Auth
          const { initializeFirebase, auth } = await import('@/lib/firebase');
          await initializeFirebase();

          if (!auth) {
            throw new Error('Firebase Auth not initialized');
          }

          const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();

          // 使用 Google 登入
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          console.log('✅ Google 登入成功:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });

          // 獲取 Firebase ID Token
          const idToken = await user.getIdToken();

          // 呼叫後端 API 驗證並創建/更新管理員帳號
          const response = await ApiService.loginWithGoogle(idToken);

          if (response.success) {
            const { user: adminUser, token } = response.data;

            // 儲存 token
            Cookies.set('admin_token', token, { expires: 7 });
            localStorage.setItem('admin_token', token);

            set({
              user: adminUser,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Google 登入失敗');
          }
        } catch (error: any) {
          console.error('❌ Google 登入失敗:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Google 登入失敗',
          });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          // 清除 token
          Cookies.remove('admin_token');
          localStorage.removeItem('admin_token');

          // Firebase Auth 登出
          try {
            const { auth } = await import('@/lib/firebase');
            if (auth?.currentUser) {
              const { signOut } = await import('firebase/auth');
              await signOut(auth);
              console.log('✅ Firebase Auth 登出成功');
            }
          } catch (error) {
            console.error('Firebase Auth 登出失敗:', error);
          }

          // 呼叫後端登出 API (可選)
          ApiService.logout().catch(console.error);

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      // 檢查認證狀態
      checkAuth: async () => {
        try {
          const token = Cookies.get('admin_token') || localStorage.getItem('admin_token');
          
          if (!token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          set({ isLoading: true });

          const response = await ApiService.getProfile();
          
          if (response.success) {
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Token 無效，清除認證狀態
            get().logout();
          }
        } catch (error: any) {
          console.error('Check auth error:', error);
          // Token 無效或網路錯誤，清除認證狀態
          get().logout();
        }
      },

      // 清除錯誤
      clearError: () => {
        set({ error: null });
      },

      // 設定載入狀態
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

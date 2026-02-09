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

      // 登入（使用 Firebase Authentication）
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔄 開始電子郵件/密碼登入流程...');

          // 動態載入 Firebase Auth
          const { FirebaseService } = await import('@/lib/firebase');

          console.log('🔄 使用 Firebase Authentication 登入...');
          // 使用 Firebase Authentication 登入
          const userCredential = await FirebaseService.signInWithEmailAndPassword(email, password);
          const user = userCredential.user;

          console.log('✅ Firebase 登入成功:', {
            uid: user.uid,
            email: user.email,
          });

          // 獲取 Firebase ID Token
          console.log('🔄 獲取 Firebase ID Token...');
          const idToken = await user.getIdToken();

          // 呼叫後端 API 驗證並創建/更新管理員帳號
          console.log('🔄 呼叫後端 API 驗證...');
          const response = await ApiService.loginWithGoogle(idToken);

          if (response.success) {
            const { user: adminUser, token } = response.data;

            console.log('✅ 後端驗證成功，儲存 token...');
            // 儲存 token
            Cookies.set('admin_token', token, { expires: 7 }); // 7天過期
            localStorage.setItem('admin_token', token);

            set({
              user: adminUser,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            console.log('✅ 電子郵件/密碼登入流程完成！');
          } else {
            throw new Error(response.message || '登入失敗');
          }
        } catch (error: any) {
          console.error('❌ 電子郵件/密碼登入失敗:', error);

          // 處理 Firebase Authentication 錯誤
          let errorMessage = '登入失敗';
          if (error.code === 'auth/user-not-found') {
            errorMessage = '帳號不存在';
          } else if (error.code === 'auth/wrong-password') {
            errorMessage = '密碼錯誤';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = '電子郵件格式無效';
          } else if (error.code === 'auth/user-disabled') {
            errorMessage = '帳號已被停用';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = '登入嘗試次數過多，請稍後再試';
          } else if (error.message) {
            errorMessage = error.message;
          }

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Google 登入
      loginWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔄 開始 Google 登入流程...');

          // 動態載入 Firebase Auth
          const { initializeFirebase, getAuth } = await import('@/lib/firebase');

          console.log('🔄 初始化 Firebase...');
          await initializeFirebase();

          const auth = getAuth();
          console.log('🔍 檢查 Firebase Auth:', { hasAuth: !!auth });

          if (!auth) {
            throw new Error('Firebase Auth not initialized - auth is null after initialization');
          }

          console.log('🔄 載入 Google Auth Provider...');
          const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
          const provider = new GoogleAuthProvider();

          console.log('🔄 彈出 Google 登入視窗...');
          // 使用 Google 登入
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          console.log('✅ Google 登入成功:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });

          // 獲取 Firebase ID Token
          console.log('🔄 獲取 Firebase ID Token...');
          const idToken = await user.getIdToken();

          // 呼叫後端 API 驗證並創建/更新管理員帳號
          console.log('🔄 呼叫後端 API 驗證...');
          const response = await ApiService.loginWithGoogle(idToken);

          if (response.success) {
            const { user: adminUser, token } = response.data;

            console.log('✅ 後端驗證成功，儲存 token...');
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

            console.log('✅ Google 登入流程完成！');
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
            const { getAuth } = await import('@/lib/firebase');
            const auth = getAuth();
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

// 不需要認證的路由
const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      // 未認證且不是公開路由，重定向到登入頁
      router.push('/login');
    } else if (isAuthenticated && isPublicRoute) {
      // 已認證但在公開路由，重定向到儀表板
      router.push('/dashboard');
    }
  }, [isAuthenticated, pathname, router, isInitialized]);

  // 顯示載入畫面
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" />
          <div className="mt-4 text-gray-600">載入中...</div>
        </div>
      </div>
    );
  }

  // 公開路由直接顯示內容
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // 需要認證的路由，檢查認證狀態
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" />
          <div className="mt-4 text-gray-600">重定向中...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminLayout from '@/components/layout/AdminLayout';

interface TemplateProps {
  children: React.ReactNode;
}

// 不需要管理佈局的路由
const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export default function Template({ children }: TemplateProps) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname);

  return (
    <AuthGuard>
      {isPublicRoute ? (
        children
      ) : (
        <AdminLayout>
          {children}
        </AdminLayout>
      )}
    </AuthGuard>
  );
}

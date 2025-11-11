'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Button, Badge, Drawer } from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  UserOutlined,
  TeamOutlined,
  CreditCardOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useAppStore, selectSidebarState, selectNotificationState } from '@/store/appStore';
import { toast } from 'react-hot-toast';

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 選單項目配置
const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '儀表板',
  },
  {
    key: '/orders',
    icon: <CarOutlined />,
    label: '訂單管理',
    children: [
      { key: '/orders', label: '所有訂單' },
      { key: '/orders/pending', label: '待處理訂單' },
      { key: '/orders/active', label: '進行中訂單' },
      { key: '/orders/completed', label: '已完成訂單' },
      { key: '/orders/create-test', label: '封測訂單測試' },
    ],
  },
  {
    key: '/drivers',
    icon: <TeamOutlined />,
    label: '司機管理',
    children: [
      { key: '/drivers', label: '所有司機' },
      { key: '/drivers/pending', label: '待審核司機' },
      { key: '/drivers/active', label: '活躍司機' },
    ],
  },
  {
    key: '/customers',
    icon: <UserOutlined />,
    label: '客戶管理',
  },
  {
    key: '/payments',
    icon: <CreditCardOutlined />,
    label: '支付管理',
    children: [
      { key: '/payments', label: '所有交易' },
      { key: '/payments/pending', label: '待確認支付' },
      { key: '/payments/offline', label: '線下支付' },
    ],
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '報表統計',
    children: [
      { key: '/reports/revenue', label: '營收分析' },
      { key: '/reports/drivers', label: '司機績效' },
      { key: '/reports/customers', label: '客戶統計' },
    ],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系統設定',
    children: [
      { key: '/settings/pricing', label: '價格設定' },
      { key: '/settings/dispatch', label: '派單設定' },
      { key: '/settings/notifications', label: '通知設定' },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { collapsed, toggle, setCollapsed } = useAppStore(selectSidebarState);
  const { notifications, unreadCount } = useAppStore(selectNotificationState);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  // 檢測螢幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [setCollapsed]);

  // 處理登出
  const handleLogout = () => {
    logout();
    toast.success('已成功登出');
    router.push('/login');
  };

  // 用戶下拉選單
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '帳號設定',
      onClick: () => router.push('/account-settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  // 通知下拉選單
  const notificationMenuItems = [
    {
      key: 'all-notifications',
      label: '查看所有通知',
      onClick: () => router.push('/notifications'),
    },
    { type: 'divider' },
    ...notifications.slice(0, 5).map((notif) => ({
      key: notif.id,
      label: (
        <div className="max-w-xs">
          <div className="font-medium text-sm">{notif.title}</div>
          <div className="text-xs text-gray-500 truncate">{notif.message}</div>
        </div>
      ),
    })),
  ];

  // 側邊欄內容
  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <div className="text-white font-bold text-lg">
          {collapsed ? '包車' : '包車服務管理'}
        </div>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        defaultOpenKeys={['/orders', '/drivers', '/payments', '/reports', '/settings']}
        items={menuItems}
        onClick={({ key }) => {
          router.push(key);
          if (isMobile) {
            setMobileDrawerVisible(false);
          }
        }}
        className="flex-1 border-r-0"
      />
    </div>
  );

  return (
    <Layout className="min-h-screen">
      {/* 桌面版側邊欄 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={256}
          collapsedWidth={80}
          className="fixed left-0 top-0 bottom-0 z-10"
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 手機版抽屜 */}
      {isMobile && (
        <Drawer
          title="選單"
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          bodyStyle={{ padding: 0 }}
          width={256}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 256 }}>
        {/* 頂部導航 */}
        <Header className="bg-white px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerVisible(true);
                } else {
                  toggle();
                }
              }}
              className="text-lg w-16 h-16"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* 通知 */}
            <Dropdown
              menu={{ items: notificationMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="text" className="flex items-center">
                <Badge count={unreadCount} size="small">
                  <BellOutlined className="text-lg" />
                </Badge>
              </Button>
            </Dropdown>

            {/* 用戶資訊 */}
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                <Avatar
                  size="small"
                  src={user?.avatar}
                  icon={<UserOutlined />}
                />
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.name || user?.email}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 主要內容區域 */}
        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm min-h-[calc(100vh-112px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

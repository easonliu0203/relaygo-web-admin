import type { Metadata } from 'next';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
});

// Ant Design 主題配置
const antdTheme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#001529',
      bodyBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1890ff',
      darkItemHoverBg: '#1890ff20',
    },
  },
};

export const metadata: Metadata = {
  title: {
    template: '%s | 包車服務後台管理',
    default: '包車服務後台管理',
  },
  description: '包車/接送叫車服務後台管理系統',
  keywords: ['包車', '叫車', '後台管理', '交通服務'],
  authors: [{ name: 'Ride Booking Team' }],
  creator: 'Ride Booking Team',
  publisher: 'Ride Booking Team',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: '/',
    title: '包車服務後台管理',
    description: '包車/接送叫車服務後台管理系統',
    siteName: '包車服務後台管理',
  },
  twitter: {
    card: 'summary_large_image',
    title: '包車服務後台管理',
    description: '包車/接送叫車服務後台管理系統',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className={`${inter.variable} ${notoSansTC.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#1890ff" />
      </head>
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={zhTW}
            theme={antdTheme}
          >
            {children}

            {/* 全域通知 */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#52c41a',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ff4d4f',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

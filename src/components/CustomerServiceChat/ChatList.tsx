'use client';

import React from 'react';
import { List, Avatar, Badge, Empty, Spin, Tabs } from 'antd';
import { UserOutlined, CarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-tw';

dayjs.extend(relativeTime);
dayjs.locale('zh-tw');

export interface CustomerServiceChat {
  id: string;
  userId: string;
  userType: 'customer' | 'driver';
  userName: string;
  userEmail?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  createdAt: Date;
  customerLang?: string;
}

interface ChatListProps {
  chats: CustomerServiceChat[];
  loading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chat: CustomerServiceChat) => void;
}

/**
 * 客服對話列表
 * 顯示所有客服對話，支援篩選（全部/客戶/司機）
 */
export const ChatList: React.FC<ChatListProps> = ({
  chats,
  loading,
  selectedChatId,
  onSelectChat,
}) => {
  const [activeTab, setActiveTab] = React.useState<'all' | 'customer' | 'driver'>('all');

  // 根據篩選條件過濾對話
  const filteredChats = React.useMemo(() => {
    if (activeTab === 'all') return chats;
    return chats.filter((chat) => chat.userType === activeTab);
  }, [chats, activeTab]);

  // 計算各分類的數量
  const counts = React.useMemo(() => {
    return {
      all: chats.length,
      customer: chats.filter((c) => c.userType === 'customer').length,
      driver: chats.filter((c) => c.userType === 'driver').length,
    };
  }, [chats]);

  const tabItems = [
    {
      key: 'all',
      label: `全部 (${counts.all})`,
    },
    {
      key: 'customer',
      label: `客戶 (${counts.customer})`,
    },
    {
      key: 'driver',
      label: `司機 (${counts.driver})`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 篩選標籤 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | 'customer' | 'driver')}
        items={tabItems}
        className="px-4"
      />

      {/* 對話列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <Empty
            description={activeTab === 'all' ? '暫無客服對話' : `暫無${activeTab === 'customer' ? '客戶' : '司機'}對話`}
            className="mt-8"
          />
        ) : (
          <List
            dataSource={filteredChats}
            renderItem={(chat) => (
              <List.Item
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedChatId === chat.id ? 'bg-blue-50' : ''
                }`}
                style={{ padding: '12px 16px' }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={chat.unreadCount} offset={[-5, 5]}>
                      <Avatar
                        icon={chat.userType === 'customer' ? <UserOutlined /> : <CarOutlined />}
                        style={{
                          backgroundColor: chat.userType === 'customer' ? '#1890ff' : '#52c41a',
                        }}
                      />
                    </Badge>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{chat.userName}</span>
                      <span className="text-xs text-gray-400">
                        {dayjs(chat.lastMessageTime).fromNow()}
                      </span>
                    </div>
                  }
                  description={
                    <div className="text-sm text-gray-500 truncate">
                      {chat.lastMessage}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};


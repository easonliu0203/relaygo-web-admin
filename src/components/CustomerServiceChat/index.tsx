'use client';

import React, { useState, useEffect } from 'react';
import { FloatingButton } from './FloatingButton';
import { ChatWidget } from './ChatWidget';
import { CustomerServiceChatService } from '@/services/customerServiceChatService';

/**
 * 客服聊天主元件
 * 包含懸浮按鈕和聊天視窗，管理開關狀態
 */
export const CustomerServiceChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminId, setAdminId] = useState('admin-001'); // TODO: 從認證狀態獲取
  const [adminName, setAdminName] = useState('客服人員'); // TODO: 從認證狀態獲取

  // 訂閱未讀訊息數量
  useEffect(() => {
    const unsubscribe = CustomerServiceChatService.subscribeToChats(
      (chats) => {
        const total = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
        setUnreadCount(total);
      },
      (error) => {
        console.error('訂閱未讀訊息數量失敗:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // TODO: 從認證狀態獲取管理員資訊
  useEffect(() => {
    // 這裡應該從 authStore 或其他認證狀態獲取管理員資訊
    // 暫時使用預設值
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <FloatingButton isOpen={isOpen} unreadCount={unreadCount} onClick={toggleChat} />
      <ChatWidget isOpen={isOpen} adminId={adminId} adminName={adminName} />
    </>
  );
};

export default CustomerServiceChat;


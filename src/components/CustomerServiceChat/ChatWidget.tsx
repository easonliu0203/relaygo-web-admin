'use client';

import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import { ChatList, CustomerServiceChat } from './ChatList';
import { ChatRoom, ChatMessage } from './ChatRoom';
import { CustomerServiceChatService } from '@/services/customerServiceChatService';

interface ChatWidgetProps {
  isOpen: boolean;
  adminId: string;
  adminName: string;
}

/**
 * 客服聊天視窗
 * 包含對話列表和對話室，支援切換檢視
 */
export const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, adminId, adminName }) => {
  const [chats, setChats] = useState<CustomerServiceChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<CustomerServiceChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // 訂閱客服對話列表
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = CustomerServiceChatService.subscribeToChats(
      (updatedChats) => {
        setChats(updatedChats);
        setLoading(false);
      },
      (error) => {
        console.error('訂閱客服對話失敗:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // 訂閱選中對話的訊息
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const unsubscribe = CustomerServiceChatService.subscribeToMessages(
      selectedChat.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setMessagesLoading(false);
      },
      (error) => {
        console.error('訂閱訊息失敗:', error);
        setMessagesLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedChat]);

  // 發送訊息
  const handleSendMessage = async (message: string) => {
    if (!selectedChat) return;

    setSending(true);
    try {
      await CustomerServiceChatService.sendMessage(
        selectedChat.id,
        message,
        adminId,
        adminName
      );
    } catch (error) {
      console.error('發送訊息失敗:', error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  // 返回對話列表
  const handleBack = () => {
    setSelectedChat(null);
  };

  // 計算未讀訊息總數
  const totalUnreadCount = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-40 shadow-2xl"
      style={{
        width: '380px',
        height: '600px',
      }}
    >
      <Card
        className="h-full"
        bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="text-base font-medium">
            {selectedChat ? '客服對話' : `客服中心 ${totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}`}
          </div>
        }
      >
        {selectedChat ? (
          <ChatRoom
            chat={selectedChat}
            messages={messages}
            loading={messagesLoading}
            sending={sending}
            onSendMessage={handleSendMessage}
            onBack={handleBack}
          />
        ) : (
          <ChatList
            chats={chats}
            loading={loading}
            selectedChatId={null}
            onSelectChat={setSelectedChat}
          />
        )}
      </Card>
    </div>
  );
};


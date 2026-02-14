'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Input, Button, Avatar, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined, CarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CustomerServiceChat } from './ChatList';

const { TextArea } = Input;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'customer' | 'driver' | 'admin';
  senderName: string;
  message: string;
  translatedMessage?: string;
  timestamp: Date;
  isRead: boolean;
}

interface ChatRoomProps {
  chat: CustomerServiceChat;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onBack: () => void;
}

/**
 * 客服對話室
 * 顯示與單一用戶的完整對話歷史，支援發送訊息
 */
export const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  messages,
  loading,
  sending,
  onSendMessage,
  onBack,
}) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    try {
      await onSendMessage(messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('發送訊息失敗:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 標題列 */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="flex-shrink-0"
        />
        <Avatar
          icon={chat.userType === 'customer' ? <UserOutlined /> : <CarOutlined />}
          style={{
            backgroundColor: chat.userType === 'customer' ? '#1890ff' : '#52c41a',
          }}
        />
        <div className="flex-1">
          <div className="font-medium">{chat.userName}</div>
          <div className="text-xs text-gray-400">
            {chat.userType === 'customer' ? '客戶' : '司機'}
            {chat.userEmail && ` · ${chat.userEmail}`}
          </div>
        </div>
      </div>

      {/* 訊息列表 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spin size="large" />
          </div>
        ) : messages.length === 0 ? (
          <Empty description="暫無訊息" className="mt-8" />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isAdmin = msg.senderType === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isAdmin
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {!isAdmin && (
                      <div className="text-xs text-gray-400 mb-1">{msg.senderName}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                    {!isAdmin && msg.translatedMessage && (
                      <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="text-xs text-gray-400 italic whitespace-pre-wrap break-words">
                          {msg.translatedMessage}
                        </div>
                      </div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        isAdmin ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {dayjs(msg.timestamp).format('HH:mm')}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 輸入框 */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <TextArea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="輸入訊息..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!messageText.trim()}
          >
            發送
          </Button>
        </div>
      </div>
    </div>
  );
};


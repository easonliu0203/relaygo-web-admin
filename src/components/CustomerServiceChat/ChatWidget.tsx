'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from 'antd';
import { ChatList, CustomerServiceChat } from './ChatList';
import { ChatRoom, ChatMessage } from './ChatRoom';
import { CustomerServiceChatService } from '@/services/customerServiceChatService';
import { translateText } from '@/services/translationService';

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
  // 翻譯快取：messageId → 中文翻譯（客人訊息 → 管理員用）
  const translationCacheRef = useRef<Map<string, string>>(new Map());
  const [translationVersion, setTranslationVersion] = useState(0);

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

  // 自動翻譯客人/司機訊息為中文（供管理員閱讀）
  // 若客人語言已是 zh-TW，則跳過翻譯
  useEffect(() => {
    const customerLang = selectedChat?.customerLang;
    // 客人使用 zh-TW 時不需翻譯（與管理員語言相同）
    if (customerLang === 'zh-TW') return;

    const cache = translationCacheRef.current;
    const untranslated = messages.filter(
      (msg) => msg.senderType !== 'admin' && !cache.has(msg.id)
    );
    if (untranslated.length === 0) return;

    untranslated.forEach((msg) => {
      translateText(msg.message, 'zh-TW').then((translated) => {
        if (translated && translated !== msg.message) {
          cache.set(msg.id, translated);
          setTranslationVersion((v) => v + 1);
        }
      });
    });
  }, [messages, selectedChat?.customerLang]);

  // 發送訊息（管理員中文 → 自動翻成客人語言）
  const handleSendMessage = async (message: string) => {
    if (!selectedChat) return;

    setSending(true);
    try {
      const customerLang = selectedChat.customerLang ?? 'en';
      // 客人語言與管理員語言（zh-TW）相同時，不需翻譯
      const translatedMessage =
        customerLang !== 'zh-TW' ? await translateText(message, customerLang) : null;

      await CustomerServiceChatService.sendMessage(
        selectedChat.id,
        message,
        adminId,
        adminName,
        translatedMessage ?? undefined
      );
    } catch (error) {
      console.error('發送訊息失敗:', error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  // 選擇對話並標記為已讀
  const handleSelectChat = (chat: CustomerServiceChat) => {
    setSelectedChat(chat);
    // 若有未讀訊息，立即重置 Firestore unreadCount 為 0
    if (chat.unreadCount > 0) {
      CustomerServiceChatService.markAsRead(chat.id);
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
            messages={messages.map((msg) => ({
              ...msg,
              translatedMessage:
                msg.translatedMessage ?? translationCacheRef.current.get(msg.id),
            }))}
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
            onSelectChat={handleSelectChat}
          />
        )}
      </Card>
    </div>
  );
};


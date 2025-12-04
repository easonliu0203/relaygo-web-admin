import { initializeFirebase, db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  where,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { CustomerServiceChat } from '@/components/CustomerServiceChat/ChatList';
import { ChatMessage } from '@/components/CustomerServiceChat/ChatRoom';

/**
 * 客服聊天服務
 * 處理 Firebase Firestore 的客服對話資料
 */
export class CustomerServiceChatService {
  /**
   * 訂閱所有客服對話列表
   */
  static subscribeToChats(
    onUpdate: (chats: CustomerServiceChat[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = async () => {
      try {
        await initializeFirebase();
        if (!db) throw new Error('Firebase not initialized');

        const chatsRef = collection(db, 'customer_service_chats');
        const q = query(chatsRef, orderBy('lastMessageTime', 'desc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const chats: CustomerServiceChat[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                userId: data.userId,
                userType: data.userType,
                userName: data.userName,
                userEmail: data.userEmail,
                lastMessage: data.lastMessage,
                lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
                unreadCount: data.unreadCount || 0,
                createdAt: data.createdAt?.toDate() || new Date(),
              };
            });
            onUpdate(chats);
          },
          (error) => {
            console.error('訂閱客服對話失敗:', error);
            onError?.(error as Error);
          }
        );
      } catch (error) {
        console.error('初始化訂閱失敗:', error);
        onError?.(error as Error);
        return () => {};
      }
    };

    let unsubscribeFn: (() => void) | null = null;
    unsubscribe().then((fn) => {
      unsubscribeFn = fn;
    });

    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }

  /**
   * 訂閱單一對話的訊息列表
   */
  static subscribeToMessages(
    chatId: string,
    onUpdate: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = async () => {
      try {
        await initializeFirebase();
        if (!db) throw new Error('Firebase not initialized');

        const messagesRef = collection(db, 'customer_service_chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const messages: ChatMessage[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                senderId: data.senderId,
                senderType: data.senderType,
                senderName: data.senderName,
                message: data.message,
                timestamp: data.timestamp?.toDate() || new Date(),
                isRead: data.isRead || false,
              };
            });
            onUpdate(messages);
          },
          (error) => {
            console.error('訂閱訊息失敗:', error);
            onError?.(error as Error);
          }
        );
      } catch (error) {
        console.error('初始化訊息訂閱失敗:', error);
        onError?.(error as Error);
        return () => {};
      }
    };

    let unsubscribeFn: (() => void) | null = null;
    unsubscribe().then((fn) => {
      unsubscribeFn = fn;
    });

    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }

  /**
   * 發送訊息（管理員）
   */
  static async sendMessage(
    chatId: string,
    message: string,
    adminId: string,
    adminName: string
  ): Promise<void> {
    try {
      await initializeFirebase();
      if (!db) throw new Error('Firebase not initialized');

      const messagesRef = collection(db, 'customer_service_chats', chatId, 'messages');
      const now = Timestamp.now();

      // 新增訊息
      await addDoc(messagesRef, {
        senderId: adminId,
        senderType: 'admin',
        senderName: adminName,
        message,
        timestamp: now,
        isRead: false,
      });

      // 更新對話的最後訊息
      const chatRef = doc(db, 'customer_service_chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: message,
        lastMessageTime: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('發送訊息失敗:', error);
      throw error;
    }
  }
}


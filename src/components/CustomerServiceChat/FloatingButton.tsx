'use client';

import React from 'react';
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';
import { Badge } from 'antd';

interface FloatingButtonProps {
  isOpen: boolean;
  unreadCount: number;
  onClick: () => void;
}

/**
 * 客服聊天懸浮按鈕
 * 顯示在畫面右下角，點擊後展開/收合聊天視窗
 */
export const FloatingButton: React.FC<FloatingButtonProps> = ({
  isOpen,
  unreadCount,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 cursor-pointer transition-all duration-300 hover:scale-110"
      style={{
        width: '56px',
        height: '56px',
      }}
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <div
          className="flex items-center justify-center rounded-full shadow-lg transition-all duration-300"
          style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          }}
        >
          {isOpen ? (
            <CloseOutlined className="text-white text-xl" />
          ) : (
            <MessageOutlined className="text-white text-xl" />
          )}
        </div>
      </Badge>
    </div>
  );
};


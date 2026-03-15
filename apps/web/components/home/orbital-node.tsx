// components/OrbitalNode.tsx
import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface OrbitalNodeProps {
  top?: string;
  left?: string;
  bottom?: string;
  right?: string;
  sizeClass?: string; // 例如 "w-12 h-12"
  shadowColor?: string; // 用于 box-shadow
  bgColor?: string; // Hex 颜色值
  avatarUrl?: string;
  Icon?: LucideIcon;
  iconColor?: string; // Tailwind 文本颜色类，例如 "text-blue-400"
}

const OrbitalNode: React.FC<OrbitalNodeProps> = ({
  top,
  left,
  bottom,
  right,
  sizeClass = "w-12 h-12",
  shadowColor,
  bgColor = "#111322",
  avatarUrl,
  Icon,
  iconColor = "text-white",
}) => {
  const isAvatar = !!avatarUrl;

  return (
    <div className="absolute" style={{ top, left, bottom, right }}>
      <motion.div
        animate={{ rotate: -360 }} // 反向旋转抵消公转
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className={`${sizeClass} rounded-xl z-10 origin-center pointer-events-auto cursor-pointer flex items-center justify-center`}
        style={{
          backgroundColor: isAvatar ? 'transparent' : bgColor,
          backgroundImage: isAvatar ? `url(${avatarUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: isAvatar || !shadowColor ? 'none' : `0 0 20px ${shadowColor}`,
          border: isAvatar ? 'none' : '1px solid rgba(255,255,255,0.05)',
          borderRadius: isAvatar ? '9999px' : '0.75rem' // 头像纯圆，图标圆角矩形
        }}
        whileHover={{ scale: 1.15 }} // 悬停放大
      >
        {!isAvatar && Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </motion.div>
    </div>
  );
};

export default OrbitalNode;
'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-3xl',
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    const [imgWidth, imgHeight] = size === 'sm' ? [32, 32] : size === 'md' ? [40, 40] : size === 'lg' ? [56, 56] : [96, 96];
    return (
      <Image
        src={src}
        alt={name}
        width={imgWidth}
        height={imgHeight}
        className={`${sizeMap[size]} rounded-full object-cover border-2 border-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-white border-2 border-white/10 ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;

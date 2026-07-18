'use client';

import React, { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/media';

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
  const [imgError, setImgError] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (resolvedSrc && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover border-2 border-white/10 ${className}`}
        onError={() => setImgError(true)}
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

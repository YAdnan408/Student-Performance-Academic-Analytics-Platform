'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div
      className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 ${
        hover ? 'hover:bg-white/10 transition-all duration-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

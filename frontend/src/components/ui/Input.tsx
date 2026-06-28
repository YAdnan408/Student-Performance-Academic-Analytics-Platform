'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-purple-200 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-12' : 'px-4'} pr-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-purple-200/40 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
              : 'border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;

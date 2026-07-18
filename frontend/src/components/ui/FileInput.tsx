'use client';

import { useRef } from 'react';

interface FileInputProps {
  label?: string;
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  buttonText?: string;
  hint?: string;
}

const FileInput = ({
  label,
  accept,
  value,
  onChange,
  buttonText = 'Choose file',
  hint,
}: FileInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-purple-200 mb-1.5">{label}</label>
      )}
      <div className="flex items-center gap-3 w-full min-h-[46px] px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
        <label className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium text-purple-100 cursor-pointer transition-colors">
          {buttonText}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
        <span className="text-sm text-purple-200/60 truncate flex-1 min-w-0">
          {value?.name || 'No file chosen'}
        </span>
        {value && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-purple-200/50 hover:text-white text-xs transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-purple-200/40">{hint}</p>}
    </div>
  );
};

export default FileInput;

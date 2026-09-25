import React from 'react';
import { KeyConfig } from '../types';

export const KeyTag: React.FC<{ k: KeyConfig }> = ({ k }) => {
  const parts: string[] = [];
  if (k.ctrl) parts.push('Ctrl');
  if (k.alt) parts.push('Alt');
  if (k.shift) parts.push('Shift');
  if (k.meta) parts.push('⌘');
  parts.push(k.key.toUpperCase());

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span 
          key={index} 
          className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-black/60 border border-white/10 rounded-md text-gray-200 shadow-sm"
        >
          {part}
        </span>
      ))}
    </div>
  );
};

import { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
}

export const Tag = ({ children }: TagProps) => (
  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600">
    {children}
  </span>
);

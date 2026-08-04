import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm text-[#2D3A45] outline-none transition placeholder:text-slate-400 focus:border-[#1F5F8B] focus:ring-2 focus:ring-[#1F5F8B]/15', className)}
    {...props}
  />
));
Input.displayName = 'Input';

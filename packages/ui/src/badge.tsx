import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from './utils';

const variants = cva('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      neutral: 'bg-[#EEF5FA] text-[#1F5F8B]',
      warning: 'bg-amber-50 text-amber-700',
      success: 'bg-emerald-50 text-emerald-700',
      danger: 'bg-[#FDEBEC] text-[#B9151B]',
      purple: 'bg-violet-50 text-violet-700',
    },
  },
  defaultVariants: { variant: 'neutral' },
});
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof variants> {}
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(variants({ variant }), className)} {...props} />;
}

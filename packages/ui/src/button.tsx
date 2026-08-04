import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5F8B] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#D71920] text-white hover:bg-[#B9151B]',
        secondary: 'bg-[#183247] text-white hover:bg-[#123B5D]',
        outline: 'border border-[#DDE5EA] bg-white text-[#2D3A45] hover:bg-[#F5F7F9]',
        ghost: 'text-[#4B5563] hover:bg-[#EEF5FA] hover:text-[#183247]',
      },
      size: { default: 'h-10 px-4', sm: 'h-9 px-3', lg: 'h-12 px-6' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

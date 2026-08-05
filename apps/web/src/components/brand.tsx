import { cn } from '@certindo/ui';

export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 items-center justify-center rounded-[10px] bg-white p-1 shadow-xs shrink-0">
        <img
          src="/logo.png"
          alt="Logo Certindo"
          className="h-8 w-auto object-contain"
        />
      </div>
      {!compact && (
        <div>
          <div className={cn('font-heading text-[15px] font-extrabold leading-tight tracking-tight', inverse ? 'text-white' : 'text-[#183247]')}>
            CERTINDO
          </div>
          <div className={cn('text-[10px] font-medium tracking-[0.14em]', inverse ? 'text-slate-300' : 'text-slate-500')}>
            CALIBRATION WORKSHEET
          </div>
        </div>
      )}
    </div>
  );
}

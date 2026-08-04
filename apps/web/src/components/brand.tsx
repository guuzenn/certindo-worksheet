import { cn } from '@certindo/ui';

export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center rounded-[10px] bg-white shadow-sm" aria-hidden="true">
        <span className="absolute h-6 w-2 rotate-45 rounded-sm bg-[#D71920]" />
        <span className="absolute h-2 w-6 rotate-45 rounded-sm bg-[#183247]" />
      </div>
      {!compact && (
        <div>
          <div className={cn('font-heading text-[15px] font-extrabold leading-tight tracking-tight', inverse ? 'text-white' : 'text-[#183247]')}>CERTINDO</div>
          <div className={cn('text-[10px] font-medium tracking-[0.14em]', inverse ? 'text-slate-300' : 'text-slate-500')}>CALIBRATION WORKSHEET</div>
        </div>
      )}
    </div>
  );
}

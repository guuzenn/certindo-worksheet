'use client';

import { Button } from '@certindo/ui';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Hapus',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-4">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          onClick={onClose}
          disabled={isLoading}
        >
          <X className="size-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-red-50 text-[#D71920]">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-[#183247]">{title}</h3>
            <p className="text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3E8ED]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-[#D71920] hover:bg-[#B9151B] text-white font-semibold gap-1.5"
          >
            <Trash2 className="size-4" />
            {isLoading ? 'Menghapus...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Button } from './ui';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,11,33,0.85)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: '#0D1230',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          className="mb-2 text-lg font-semibold text-white"
          style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
        >
          {title}
        </h2>
        <div className="mb-6 text-sm text-[rgba(255,255,255,0.55)]">{message}</div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

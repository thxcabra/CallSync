import { useState, useEffect } from 'react';
import { Spinner } from './ui';
import type { NotionPreview, NotionPreviewItem } from '../lib/types';

interface SyncResult {
  item: string;
  notion_id?: string;
  error?: string;
}

interface Props {
  open: boolean;
  preview: NotionPreview | null;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  syncResult: { results: SyncResult[]; partial: boolean; synced_count: number } | null;
  onClose: () => void;
  onSync: (items: string[]) => void;
}

const TYPE_ICONS: Record<NotionPreviewItem['type'], string> = {
  calendar: '📅',
  task: '✅',
  history_page: '📝',
};

const TYPE_LABELS: Record<NotionPreviewItem['type'], string> = {
  calendar: 'Calendário',
  task: 'Task',
  history_page: 'Histórico',
};

const TYPE_COLORS: Record<NotionPreviewItem['type'], { text: string; rgb: string }> = {
  calendar:     { text: '#2A60FB', rgb: '42,96,251' },
  task:         { text: '#00ED4F', rgb: '0,237,79' },
  history_page: { text: 'rgba(255,255,255,0.6)', rgb: '255,255,255' },
};

export function NotionReviewModal({
  open, preview, loading, error, syncing, syncResult, onClose, onSync,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (preview) setSelected(new Set(preview.items.map((i) => i.id)));
  }, [preview]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!preview) return;
    if (selected.size === preview.items.length) setSelected(new Set());
    else setSelected(new Set(preview.items.map((i) => i.id)));
  }

  const selectedCount = selected.size;
  const allSelected = preview ? selectedCount === preview.items.length : false;
  const alreadySyncedSelected = preview
    ? preview.items.filter((i) => i.synced_notion_id && selected.has(i.id)).length
    : 0;

  const grouped = preview
    ? {
        calendar: preview.items.filter((i) => i.type === 'calendar'),
        task: preview.items.filter((i) => i.type === 'task'),
        history_page: preview.items.filter((i) => i.type === 'history_page'),
      }
    : null;

  const failedItems = syncResult?.results.filter((r) => r.error) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,11,33,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !syncing) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: '#0D1230',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(42,96,251,0.08)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-[rgba(255,255,255,0.07)]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            N
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Clash Grotesk', sans-serif" }}>
              Revisar outputs para Notion
            </h2>
            {preview?.last_sync && (
              <p className="text-[11px] text-[rgba(255,255,255,0.35)] mt-0.5">
                Última sync: {new Date(preview.last_sync.synced_at).toLocaleString('pt-BR')}
                {preview.last_sync.author_name && ` · ${preview.last_sync.author_name}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={syncing}
            className="rounded-lg p-1.5 text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.07)] transition-colors disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center text-[rgba(255,255,255,0.4)]">
              <Spinner /> Carregando...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Per-item errors after sync */}
          {failedItems.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-red-300">Alguns itens falharam:</p>
              {failedItems.map((r) => (
                <p key={r.item} className="text-xs text-red-300/80">• {r.item}: {r.error}</p>
              ))}
            </div>
          )}

          {/* Overwrite warning */}
          {alreadySyncedSelected > 0 && !syncResult && (
            <div
              className="rounded-xl border px-4 py-3 flex items-start gap-2"
              style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)' }}
            >
              <span className="text-amber-400 mt-0.5 text-sm">⚠</span>
              <p className="text-xs text-amber-300">
                <span className="font-medium">{alreadySyncedSelected} item{alreadySyncedSelected !== 1 ? 's' : ''} já exist{alreadySyncedSelected !== 1 ? 'em' : 'e'} no Notion.</span>{' '}
                Ao enviar, as versões anteriores serão substituídas.
              </p>
            </div>
          )}

          {grouped && (
            <>
              <button
                onClick={toggleAll}
                className="text-xs text-[rgba(255,255,255,0.35)] hover:text-white transition-colors"
              >
                {allSelected ? '✕ Desmarcar tudo' : '✓ Selecionar tudo'}
              </button>

              {grouped.calendar.length > 0 && (
                <ItemGroup label="Calendário" items={grouped.calendar} selected={selected} onToggle={toggle} />
              )}
              {grouped.task.length > 0 && (
                <ItemGroup label={`Tasks (${grouped.task.length})`} items={grouped.task} selected={selected} onToggle={toggle} />
              )}
              {grouped.history_page.length > 0 && (
                <ItemGroup label="Histórico" items={grouped.history_page} selected={selected} onToggle={toggle} />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[rgba(255,255,255,0.07)]">
          <button
            onClick={onClose}
            disabled={syncing}
            className="rounded-xl border border-[rgba(255,255,255,0.1)] px-4 py-2 text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSync(Array.from(selected))}
            disabled={selectedCount === 0 || syncing || loading}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: selectedCount > 0 ? 'rgba(42,96,251,0.9)' : 'rgba(42,96,251,0.3)',
              color: 'white',
              boxShadow: selectedCount > 0 ? '0 0 20px rgba(42,96,251,0.35)' : 'none',
            }}
          >
            {syncing ? (
              <><Spinner /> Enviando...</>
            ) : alreadySyncedSelected > 0 ? (
              <>Reescrever {selectedCount} item{selectedCount !== 1 ? 's' : ''} ↗</>
            ) : (
              <>Enviar {selectedCount > 0 ? `${selectedCount} item${selectedCount !== 1 ? 's' : ''}` : '—'} ↗</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemGroup({
  label, items, selected, onToggle,
}: {
  label: string;
  items: NotionPreviewItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.3)] mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const isOn = selected.has(item.id);
          const colors = TYPE_COLORS[item.type];
          const alreadySynced = !!item.synced_notion_id;
          return (
            <li key={item.id}>
              <button
                onClick={() => onToggle(item.id)}
                className="w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150"
                style={{
                  borderColor: isOn ? `rgba(${colors.rgb},0.3)` : 'rgba(255,255,255,0.06)',
                  background: isOn ? `rgba(${colors.rgb},0.08)` : 'rgba(255,255,255,0.02)',
                }}
              >
                {/* Checkbox */}
                <span
                  className="h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors"
                  style={{
                    borderColor: isOn ? colors.text : 'rgba(255,255,255,0.18)',
                    background: isOn ? colors.text : 'transparent',
                  }}
                >
                  {isOn && (
                    <svg viewBox="0 0 10 8" fill="none" stroke="#0D1230" strokeWidth="1.8" className="h-2.5 w-2.5">
                      <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                {/* Type badge */}
                <span className="shrink-0 text-base">{TYPE_ICONS[item.type]}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: isOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}
                    >
                      {item.label}
                    </p>
                    {alreadySynced && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                        style={{
                          background: isOn ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
                          color: isOn ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${isOn ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {isOn ? 'substituir' : 'já enviado'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-0.5 truncate">{item.description}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

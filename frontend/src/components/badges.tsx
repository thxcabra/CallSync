import type { Call, CallAnalysis, Project } from '../lib/types';

export function SentimentBadge({ sentiment }: { sentiment: CallAnalysis['sentiment'] | null }) {
  if (!sentiment) return <span className="text-xs text-slate-500">—</span>;
  const config = {
    positive: { label: 'Positivo', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
    neutral: { label: 'Neutro', className: 'bg-slate-800 text-slate-300 border-slate-700' },
    negative: { label: 'Negativo', className: 'bg-red-900/40 text-red-300 border-red-700' },
  } as const;
  const { label, className } = config[sentiment];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  const config = {
    active: { label: 'Ativo', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
    paused: { label: 'Pausado', className: 'bg-amber-900/40 text-amber-300 border-amber-700' },
    completed: { label: 'Concluído', className: 'bg-blue-900/40 text-blue-300 border-blue-700' },
    archived: { label: 'Arquivado', className: 'bg-slate-800 text-slate-400 border-slate-700' },
  } as const;
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function TranscriptStatusBadge({ status }: { status: Call['transcript_status'] }) {
  const config = {
    pending: { label: 'Aguardando transcrição', className: 'bg-slate-800 text-slate-300 border-slate-700' },
    transcribing: { label: 'Transcrevendo...', className: 'bg-indigo-900/40 text-indigo-300 border-indigo-700' },
    transcribed: { label: 'Transcrita', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
    failed: { label: 'Erro', className: 'bg-red-900/40 text-red-300 border-red-700' },
  } as const;
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

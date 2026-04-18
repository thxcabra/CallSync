import type { Call, CallAnalysis, Project } from '../lib/types';

export function SentimentBadge({ sentiment }: { sentiment: CallAnalysis['sentiment'] | null }) {
  if (!sentiment) return <span className="text-xs text-[rgba(255,255,255,0.3)]">—</span>;
  const config = {
    positive: {
      label: 'Positivo',
      dot: '#00ED4F',
      className: 'bg-[rgba(0,237,79,0.1)] text-[#00ED4F] border-[rgba(0,237,79,0.25)]',
    },
    neutral: {
      label: 'Neutro',
      dot: 'rgba(255,255,255,0.5)',
      className: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.12)]',
    },
    negative: {
      label: 'Negativo',
      dot: '#f87171',
      className: 'bg-[rgba(248,113,113,0.1)] text-red-400 border-[rgba(248,113,113,0.25)]',
    },
  } as const;
  const { label, dot, className } = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot, boxShadow: `0 0 4px ${dot}` }} />
      {label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  const config = {
    active: {
      label: 'Ativo',
      className: 'bg-[rgba(42,96,251,0.15)] text-[#2A60FB] border-[rgba(42,96,251,0.35)]',
    },
    paused: {
      label: 'Pausado',
      className: 'bg-[rgba(251,191,36,0.1)] text-amber-400 border-[rgba(251,191,36,0.25)]',
    },
    completed: {
      label: 'Concluído',
      className: 'bg-[rgba(0,237,79,0.1)] text-[#00ED4F] border-[rgba(0,237,79,0.25)]',
    },
    archived: {
      label: 'Arquivado',
      className: 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.4)] border-[rgba(255,255,255,0.1)]',
    },
  } as const;
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function TranscriptStatusBadge({ status }: { status: Call['transcript_status'] }) {
  const config = {
    pending: {
      label: 'Aguardando',
      className: 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.4)] border-[rgba(255,255,255,0.1)]',
    },
    transcribing: {
      label: 'Transcrevendo...',
      className: 'bg-[rgba(42,96,251,0.15)] text-[#2A60FB] border-[rgba(42,96,251,0.35)] animate-pulse',
    },
    transcribed: {
      label: 'Transcrita',
      className: 'bg-[rgba(0,237,79,0.1)] text-[#00ED4F] border-[rgba(0,237,79,0.25)]',
    },
    failed: {
      label: 'Erro',
      className: 'bg-[rgba(248,113,113,0.1)] text-red-400 border-[rgba(248,113,113,0.25)]',
    },
  } as const;
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

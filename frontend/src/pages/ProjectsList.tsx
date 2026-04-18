import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/queries';
import { Button, Empty, Spinner, ErrorMsg } from '../components/ui';
import { ProjectStatusBadge, SentimentBadge } from '../components/badges';
import type { Project } from '../lib/types';

function WaveDecoration() {
  return (
    <svg
      viewBox="0 0 305 183"
      fill="currentColor"
      className="absolute -bottom-4 -right-4 h-20 w-32 opacity-[0.04] pointer-events-none"
      aria-hidden
    >
      <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
    </svg>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{
        background: accent ? 'rgba(42,96,251,0.1)' : 'rgba(255,255,255,0.03)',
        borderColor: accent ? 'rgba(42,96,251,0.3)' : 'rgba(255,255,255,0.07)',
      }}
    >
      <span
        className="text-2xl font-semibold leading-none"
        style={{ fontFamily: "'Clash Grotesk', sans-serif", color: accent ? '#2A60FB' : '#fff' }}
      >
        {value}
      </span>
      <span className="text-xs text-[rgba(255,255,255,0.4)] mt-1">{label}</span>
    </div>
  );
}

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

const sentimentChipConfig = {
  all:      { color: '#2A60FB',  rgb: '42,96,251',   dot: null },
  positive: { color: '#00ED4F',  rgb: '0,237,79',    dot: '#00ED4F' },
  neutral:  { color: 'rgba(255,255,255,0.65)', rgb: '255,255,255', dot: 'rgba(255,255,255,0.5)' },
  negative: { color: '#f87171',  rgb: '248,113,113', dot: '#f87171' },
};

function FilterChip({
  active,
  onClick,
  sentiment,
  children,
}: {
  active: boolean;
  onClick: () => void;
  sentiment?: keyof typeof sentimentChipConfig;
  children: React.ReactNode;
}) {
  const cfg = sentimentChipConfig[sentiment ?? 'all'];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: active ? `rgba(${cfg.rgb},0.5)` : 'rgba(255,255,255,0.08)',
        background: active ? `rgba(${cfg.rgb},0.12)` : 'rgba(255,255,255,0.03)',
        color: active ? cfg.color : 'rgba(255,255,255,0.45)',
        boxShadow: active ? `0 0 12px rgba(${cfg.rgb},0.18)` : 'none',
      }}
    >
      {cfg.dot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: active ? cfg.dot : 'rgba(255,255,255,0.25)',
            boxShadow: active ? `0 0 4px ${cfg.dot}` : 'none',
          }}
        />
      )}
      {children}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none"
      style={{
        borderColor: value !== 'all' ? 'rgba(42,96,251,0.5)' : 'rgba(255,255,255,0.08)',
        background: value !== 'all' ? 'rgba(42,96,251,0.12)' : 'rgba(255,255,255,0.03)',
        color: value !== 'all' ? '#2A60FB' : 'rgba(255,255,255,0.5)',
      }}
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ProjectsList() {
  const projects = useProjects();
  const navigate = useNavigate();

  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [analystFilter, setAnalystFilter] = useState('all');

  const data = projects.data ?? [];

  const { managers, analysts } = useMemo(() => {
    const mgrs = new Set<string>();
    const anls = new Set<string>();
    for (const p of data) {
      if (p.team?.manager) mgrs.add(p.team.manager);
      for (const a of p.team?.analysts ?? []) anls.add(a);
    }
    return { managers: Array.from(mgrs).sort(), analysts: Array.from(anls).sort() };
  }, [data]);

  const filtered = useMemo(() => {
    return data
      .filter((p) => sentimentFilter === 'all' || p.current_sentiment === sentimentFilter)
      .filter((p) => managerFilter === 'all' || p.team?.manager === managerFilter)
      .filter(
        (p) =>
          analystFilter === 'all' ||
          (p.team?.analysts ?? []).includes(analystFilter)
      )
      .sort((a, b) => {
        const order = { negative: 0, neutral: 1, positive: 2, null: 3 };
        return (order[a.current_sentiment as keyof typeof order] ?? 3) -
          (order[b.current_sentiment as keyof typeof order] ?? 3);
      });
  }, [data, sentimentFilter, managerFilter, analystFilter]);

  const active = data.filter((p) => p.status === 'active').length;
  const positive = data.filter((p) => p.current_sentiment === 'positive').length;
  const negative = data.filter((p) => p.current_sentiment === 'negative').length;

  const hasActiveFilters = sentimentFilter !== 'all' || managerFilter !== 'all' || analystFilter !== 'all';

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className="text-xs uppercase tracking-widest text-[rgba(255,255,255,0.3)] mb-1"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            moic.digital
          </p>
          <h1
            className="text-3xl font-semibold text-white"
            style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
          >
            Projetos
          </h1>
        </div>
        <Button onClick={() => navigate('/projects/new')}>+ Novo projeto</Button>
      </div>

      {/* Stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={data.length} />
          <StatCard label="Ativos" value={active} accent />
          <StatCard label="Positivos" value={positive} />
          <StatCard label="Em atenção" value={negative} />
        </div>
      )}

      {/* Filters */}
      {data.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.25)] mr-1">
            Filtros
          </span>

          {/* Sentiment */}
          <FilterChip active={sentimentFilter === 'all'} onClick={() => setSentimentFilter('all')}>
            Todos
          </FilterChip>
          <FilterChip sentiment="positive" active={sentimentFilter === 'positive'} onClick={() => setSentimentFilter('positive')}>
            Positivos
          </FilterChip>
          <FilterChip sentiment="neutral" active={sentimentFilter === 'neutral'} onClick={() => setSentimentFilter('neutral')}>
            Neutros
          </FilterChip>
          <FilterChip sentiment="negative" active={sentimentFilter === 'negative'} onClick={() => setSentimentFilter('negative')}>
            Em atenção
          </FilterChip>

          {/* Divider */}
          {(managers.length > 0 || analysts.length > 0) && (
            <span className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />
          )}

          {/* Manager */}
          {managers.length > 0 && (
            <FilterSelect
              value={managerFilter}
              onChange={setManagerFilter}
              options={managers}
              placeholder="Manager"
            />
          )}

          {/* Analyst */}
          {analysts.length > 0 && (
            <FilterSelect
              value={analystFilter}
              onChange={setAnalystFilter}
              options={analysts}
              placeholder="Analista"
            />
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSentimentFilter('all');
                setManagerFilter('all');
                setAnalystFilter('all');
              }}
              className="ml-1 text-xs text-[rgba(255,255,255,0.35)] hover:text-white transition-colors"
            >
              × limpar
            </button>
          )}
        </div>
      )}

      {/* Loading / Error */}
      {projects.isLoading && (
        <div className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] py-8">
          <Spinner /> Carregando projetos...
        </div>
      )}
      {projects.isError && <ErrorMsg>Falha ao carregar: {(projects.error as Error).message}</ErrorMsg>}

      {/* Empty total */}
      {!projects.isLoading && data.length === 0 && (
        <Empty>
          <div className="flex flex-col items-center gap-3">
            <svg viewBox="0 0 305 183" fill="rgba(42,96,251,0.4)" className="h-8 w-14" aria-hidden>
              <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
            </svg>
            <p>Nenhum projeto ainda.</p>
            <Link to="/projects/new" className="text-[#2A60FB] hover:underline font-medium">
              Criar o primeiro projeto
            </Link>
          </div>
        </Empty>
      )}

      {/* Empty filtered */}
      {!projects.isLoading && data.length > 0 && filtered.length === 0 && (
        <Empty>
          Nenhum projeto com os filtros selecionados.{' '}
          <button
            className="text-[#2A60FB] hover:underline"
            onClick={() => {
              setSentimentFilter('all');
              setManagerFilter('all');
              setAnalystFilter('all');
            }}
          >
            Limpar filtros
          </button>
        </Empty>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block group">
              <div
                className="relative overflow-hidden rounded-xl border transition-all duration-200 p-5 h-full flex flex-col gap-3"
                style={{ background: '#0D1230', borderColor: 'rgba(255,255,255,0.07)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(42,96,251,0.4)';
                  el.style.boxShadow = '0 0 24px rgba(42,96,251,0.1)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(255,255,255,0.07)';
                  el.style.boxShadow = 'none';
                }}
              >
                <WaveDecoration />

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-semibold text-white truncate"
                      style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
                    >
                      {p.name}
                    </h3>
                    {p.current_sentiment && (
                      <div className="mt-1.5">
                        <SentimentBadge sentiment={p.current_sentiment} />
                      </div>
                    )}
                    {p.client_name !== p.name && (
                      <p className="text-sm text-[rgba(255,255,255,0.45)] mt-1">{p.client_name}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-[rgba(255,255,255,0.35)] line-clamp-2 flex-1">
                    {p.description}
                  </p>
                )}

                {/* Team info */}
                {(p.team?.manager || (p.team?.analysts ?? []).length > 0) && (
                  <p className="text-[11px] text-[rgba(255,255,255,0.35)]">
                    {p.team?.manager && (
                      <span>
                        <span className="text-[rgba(255,255,255,0.2)]">Manager:</span>{' '}
                        {p.team.manager}
                      </span>
                    )}
                    {p.team?.manager && (p.team?.analysts ?? []).length > 0 && (
                      <span className="mx-2 text-[rgba(255,255,255,0.15)]">·</span>
                    )}
                    {(p.team?.analysts ?? []).length > 0 && (
                      <span>
                        <span className="text-[rgba(255,255,255,0.2)]">Analistas:</span>{' '}
                        {p.team!.analysts!.join(', ')}
                      </span>
                    )}
                  </p>
                )}

                <p className="text-[11px] text-[rgba(255,255,255,0.2)] mt-auto pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  {p.last_analyzed_at
                    ? <>Última análise · {new Date(p.last_analyzed_at).toLocaleDateString('pt-BR')}</>
                    : <>Criado por {p.author_name ?? '—'} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</>
                  }
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

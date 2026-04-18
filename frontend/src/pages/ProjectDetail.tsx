import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProject, useDeleteProject } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Empty, ErrorMsg, Spinner } from '../components/ui';
import { ProjectStatusBadge, SentimentBadge, TranscriptStatusBadge } from '../components/badges';
import { ConfirmModal } from '../components/ConfirmModal';
import { CollapsibleMarkdown } from '../components/Markdown';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { author } = useAuthor();
  const q = useProject(id);
  const del = useDeleteProject();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] py-12">
        <Spinner /> Carregando...
      </div>
    );
  if (q.isError) return <ErrorMsg>{(q.error as Error).message}</ErrorMsg>;
  if (!q.data || !id) return null;

  const { project, calls } = q.data;

  async function handleDelete() {
    if (!author || !id) return;
    try {
      await del.mutateAsync({ id, authorName: author });
      navigate('/');
    } catch {
      /* erro em del.error */
    }
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.4)] hover:text-[#2A60FB] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          Projetos
        </Link>
      </div>

      {/* Project Header */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0D1230] p-6 relative overflow-hidden">
        {/* Decorative wave bg */}
        <svg viewBox="0 0 305 183" fill="white" className="absolute -right-8 -top-4 h-40 w-auto opacity-[0.035] pointer-events-none" aria-hidden>
          <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
        </svg>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl font-semibold text-white"
              style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
            >
              {project.name}
            </h1>
            {project.client_name !== project.name && (
              <p className="text-[rgba(255,255,255,0.5)] mt-1">{project.client_name}</p>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <ProjectStatusBadge status={project.status} />
              {project.current_sentiment && <SentimentBadge sentiment={project.current_sentiment} />}
              {project.last_analyzed_at && (
                <span className="text-[11px] text-[rgba(255,255,255,0.3)]">
                  última análise {new Date(project.last_analyzed_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/projects/${project.id}/edit`)}>
              ✎ Editar
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <p
          className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.3)]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Informações
        </p>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {project.description && (
            <Info label="Descrição" full>
              <CollapsibleMarkdown>{project.description}</CollapsibleMarkdown>
            </Info>
          )}
          {project.start_date && (
            <Info label="Início">{new Date(project.start_date).toLocaleDateString('pt-BR')}</Info>
          )}
          {project.planned_posts_count != null && (
            <Info label="Posts planejados">{project.planned_posts_count}</Info>
          )}
          {project.team?.manager && <Info label="Manager">{project.team.manager}</Info>}
          {project.team?.analysts && project.team.analysts.length > 0 && (
            <Info label="Analistas">{project.team.analysts.join(', ')}</Info>
          )}
          {project.team?.strategists && project.team.strategists.length > 0 && (
            <Info label="Estrategistas">{project.team.strategists.join(', ')}</Info>
          )}
          {project.contacts?.length > 0 && (
            <Info label="Contatos" full>
              <ul className="space-y-1.5">
                {project.contacts.map((c, i) => (
                  <li key={i} className="flex flex-wrap gap-1.5 text-sm">
                    <span className="text-white font-medium">{c.name}</span>
                    {c.role && <span className="text-[rgba(255,255,255,0.4)]">{c.role}</span>}
                    {c.email && <span className="text-[rgba(255,255,255,0.4)]">{c.email}</span>}
                    {c.phone && <span className="text-[rgba(255,255,255,0.4)]">{c.phone}</span>}
                  </li>
                ))}
              </ul>
            </Info>
          )}
          {project.reference_links?.length > 0 && (
            <Info label="Links" full>
              <ul className="space-y-1">
                {project.reference_links.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2A60FB] hover:underline text-sm"
                    >
                      ↗ {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Info>
          )}
          {project.campaign_docs?.length > 0 && (
            <Info label="Documentos" full>
              <ul className="space-y-1">
                {project.campaign_docs.map((d, i) => (
                  <li key={i}>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-[#2A60FB] hover:underline text-sm">
                        ↗ {d.name}
                      </a>
                    ) : (
                      <span className="text-white text-sm">{d.name}</span>
                    )}
                    {d.type && <span className="text-[rgba(255,255,255,0.4)] text-xs ml-2">{d.type}</span>}
                  </li>
                ))}
              </ul>
            </Info>
          )}
        </dl>
        <p className="mt-5 border-t border-[rgba(255,255,255,0.06)] pt-4 text-[11px] text-[rgba(255,255,255,0.25)]">
          Criado por {project.author_name ?? '—'} em {new Date(project.created_at).toLocaleString('pt-BR')}
        </p>
      </Card>

      {/* Calls Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
          >
            Calls{' '}
            <span className="text-sm font-normal text-[rgba(255,255,255,0.35)]">({calls.length})</span>
          </h2>
          <Button onClick={() => navigate(`/projects/${project.id}/calls/new`)}>+ Nova call</Button>
        </div>

        {calls.length === 0 ? (
          <Empty>Nenhuma call ainda.</Empty>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => (
              <Link key={c.id} to={`/calls/${c.id}`} className="block group">
                <div
                  className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0D1230] px-5 py-4 transition-all duration-200"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(42,96,251,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-white"
                        style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
                      >
                        {c.title || '(sem título)'}
                      </p>
                      <p className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
                        {new Date(c.call_date).toLocaleString('pt-BR')} · por {c.author_name ?? '—'}
                      </p>
                    </div>
                    <TranscriptStatusBadge status={c.transcript_status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Excluir projeto?"
        message={
          <>
            <p>
              Vai apagar <strong className="text-white">{project.name}</strong> e{' '}
              <strong>todas as {calls.length} call{calls.length === 1 ? '' : 's'}</strong>{' '}
              (com áudios, transcrições e análises). Sem desfazer.
            </p>
            {del.isError && <p className="mt-3 text-red-400">{(del.error as Error).message}</p>}
          </>
        }
        confirmLabel="Excluir tudo"
        loading={del.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Info({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] mb-1">{label}</dt>
      <dd className="text-[rgba(255,255,255,0.85)]">{children}</dd>
    </div>
  );
}

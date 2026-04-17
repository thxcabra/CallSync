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

  if (q.isLoading) return <div className="flex items-center gap-2 text-slate-400"><Spinner /> Carregando...</div>;
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
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-indigo-400 hover:underline">← Projetos</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{project.name}</h1>
            <p className="text-slate-400">{project.client_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {project.current_sentiment && (
              <div className="flex flex-col items-end gap-0.5">
                <SentimentBadge sentiment={project.current_sentiment} />
                {project.last_analyzed_at && (
                  <span className="text-[10px] text-slate-500">
                    {new Date(project.last_analyzed_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
            <ProjectStatusBadge status={project.status} />
            <Button variant="secondary" onClick={() => navigate(`/projects/${project.id}/edit`)}>
              ✎ Editar
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="text-red-400 hover:bg-red-950/40">
              🗑 Excluir
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Informações</h2>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {project.description && (
            <Info label="Descrição" full>
              <CollapsibleMarkdown>{project.description}</CollapsibleMarkdown>
            </Info>
          )}
          {project.start_date && <Info label="Início">{new Date(project.start_date).toLocaleDateString('pt-BR')}</Info>}
          {project.planned_posts_count != null && <Info label="Posts planejados">{project.planned_posts_count}</Info>}
          {project.team?.manager && <Info label="Manager">{project.team.manager}</Info>}
          {project.team?.analysts && project.team.analysts.length > 0 && (
            <Info label="Analistas">{project.team.analysts.join(', ')}</Info>
          )}
          {project.team?.strategists && project.team.strategists.length > 0 && (
            <Info label="Estrategistas">{project.team.strategists.join(', ')}</Info>
          )}
          {project.contacts?.length > 0 && (
            <Info label="Contatos" full>
              <ul className="space-y-1">
                {project.contacts.map((c, i) => (
                  <li key={i}>
                    <span className="text-slate-100">{c.name}</span>
                    {c.role && <span className="text-slate-500"> ({c.role})</span>}
                    {c.email && <span className="text-slate-500"> · {c.email}</span>}
                    {c.phone && <span className="text-slate-500"> · {c.phone}</span>}
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
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                      {l.label}
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
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                        {d.name}
                      </a>
                    ) : (
                      <span className="text-slate-100">{d.name}</span>
                    )}
                    {d.type && <span className="text-slate-500"> · {d.type}</span>}
                  </li>
                ))}
              </ul>
            </Info>
          )}
        </dl>
        <p className="mt-4 text-xs text-slate-600">
          Criado por {project.author_name ?? '—'} em {new Date(project.created_at).toLocaleString('pt-BR')}
        </p>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Calls ({calls.length})</h2>
          <Button onClick={() => navigate(`/projects/${project.id}/calls/new`)}>+ Nova call</Button>
        </div>

        {calls.length === 0 ? (
          <Empty>Nenhuma call ainda.</Empty>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => (
              <Link key={c.id} to={`/calls/${c.id}`} className="block">
                <Card className="transition-colors hover:border-indigo-700">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-100">{c.title || '(sem título)'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.call_date).toLocaleString('pt-BR')} · por {c.author_name ?? '—'}
                      </p>
                    </div>
                    <TranscriptStatusBadge status={c.transcript_status} />
                  </div>
                </Card>
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
              Vai apagar <strong className="text-slate-200">{project.name}</strong> e <strong>todas as {calls.length} call{calls.length === 1 ? '' : 's'}</strong>{' '}
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
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-200">{children}</dd>
    </div>
  );
}

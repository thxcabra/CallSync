import { Link, useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/queries';
import { Button, Card, Empty, Spinner, ErrorMsg } from '../components/ui';
import { ProjectStatusBadge, SentimentBadge } from '../components/badges';

export function ProjectsList() {
  const projects = useProjects();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Projetos</h1>
        <Button onClick={() => navigate('/projects/new')}>+ Novo projeto</Button>
      </div>

      {projects.isLoading && (
        <div className="flex items-center gap-2 text-slate-400">
          <Spinner /> Carregando...
        </div>
      )}
      {projects.isError && <ErrorMsg>Falha ao carregar: {(projects.error as Error).message}</ErrorMsg>}

      {projects.data && projects.data.length === 0 && (
        <Empty>
          Nenhum projeto ainda.{' '}
          <Link to="/projects/new" className="text-indigo-400 hover:underline">
            Cria o primeiro
          </Link>
          .
        </Empty>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block">
              <Card className="transition-colors hover:border-indigo-700">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-100">{p.name}</h3>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ProjectStatusBadge status={p.status} />
                    {p.current_sentiment && <SentimentBadge sentiment={p.current_sentiment} />}
                  </div>
                </div>
                <p className="text-sm text-slate-400">{p.client_name}</p>
                {p.description && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                <p className="mt-3 text-xs text-slate-600">
                  {p.last_analyzed_at
                    ? <>Última análise {new Date(p.last_analyzed_at).toLocaleDateString('pt-BR')}</>
                    : <>Criado por {p.author_name ?? '—'} em {new Date(p.created_at).toLocaleDateString('pt-BR')}</>
                  }
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

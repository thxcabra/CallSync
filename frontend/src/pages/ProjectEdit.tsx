import { useNavigate, useParams } from 'react-router-dom';
import { useProject, useUpdateProject } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { ProjectForm, projectToFormValues } from '../components/ProjectForm';
import { ErrorMsg, Spinner } from '../components/ui';

export function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { author } = useAuthor();
  const q = useProject(id);
  const update = useUpdateProject();

  if (q.isLoading) return <div className="flex items-center gap-2 text-slate-400"><Spinner /> Carregando...</div>;
  if (q.isError) return <ErrorMsg>{(q.error as Error).message}</ErrorMsg>;
  if (!q.data || !id) return null;

  async function handleSubmit(payload: Record<string, unknown>) {
    if (!author || !id) return;
    try {
      await update.mutateAsync({ id, input: payload, authorName: author });
      navigate(`/projects/${id}`);
    } catch {
      /* erro em update.error */
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-100">Editar projeto</h1>
      <p className="mb-6 text-sm text-slate-400">{q.data.project.name}</p>
      <ProjectForm
        initialValues={projectToFormValues(q.data.project)}
        submitLabel="Salvar alterações"
        loading={update.isPending}
        error={update.isError ? (update.error as Error).message : undefined}
        disabled={!author}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/projects/${id}`)}
      />
    </div>
  );
}

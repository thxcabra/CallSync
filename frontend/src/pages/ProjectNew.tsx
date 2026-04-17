import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { ProjectForm } from '../components/ProjectForm';

export function ProjectNew() {
  const navigate = useNavigate();
  const { author } = useAuthor();
  const create = useCreateProject();

  async function handleSubmit(payload: Record<string, unknown>) {
    if (!author) return;
    try {
      const r = await create.mutateAsync({ input: payload, authorName: author });
      navigate(`/projects/${r.project.id}`);
    } catch {
      /* erro em create.error */
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">Novo projeto</h1>
      <ProjectForm
        submitLabel="Criar projeto"
        loading={create.isPending}
        error={create.isError ? (create.error as Error).message : undefined}
        disabled={!author}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />
    </div>
  );
}

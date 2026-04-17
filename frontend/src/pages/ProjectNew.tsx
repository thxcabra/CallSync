import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Field, Input, Textarea, Select, ErrorMsg } from '../components/ui';
import { DynamicList } from '../components/DynamicList';

interface FormState {
  name: string;
  client_name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  start_date: string;
  planned_posts_count: string;
  team_manager: string;
  team_analysts: string;
  team_strategists: string;
  contacts: Array<{ name: string; email: string; phone: string; role: string }>;
  reference_links: Array<{ label: string; url: string }>;
  campaign_docs: Array<{ name: string; url: string; type: string }>;
}

const initial: FormState = {
  name: '',
  client_name: '',
  description: '',
  status: 'active',
  start_date: '',
  planned_posts_count: '',
  team_manager: '',
  team_analysts: '',
  team_strategists: '',
  contacts: [],
  reference_links: [],
  campaign_docs: [],
};

export function ProjectNew() {
  const [form, setForm] = useState<FormState>(initial);
  const navigate = useNavigate();
  const { author } = useAuthor();
  const create = useCreateProject();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!author) return;

    const payload: Record<string, unknown> = {
      name: form.name,
      client_name: form.client_name,
      status: form.status,
    };
    if (form.description) payload.description = form.description;
    if (form.start_date) payload.start_date = form.start_date;
    if (form.planned_posts_count) payload.planned_posts_count = parseInt(form.planned_posts_count, 10);

    const team: Record<string, unknown> = {};
    if (form.team_manager) team.manager = form.team_manager;
    const analysts = form.team_analysts.split(',').map((s) => s.trim()).filter(Boolean);
    if (analysts.length) team.analysts = analysts;
    const strategists = form.team_strategists.split(',').map((s) => s.trim()).filter(Boolean);
    if (strategists.length) team.strategists = strategists;
    if (Object.keys(team).length) payload.team = team;

    const contacts = form.contacts
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name,
        ...(c.email && { email: c.email }),
        ...(c.phone && { phone: c.phone }),
        ...(c.role && { role: c.role }),
      }));
    if (contacts.length) payload.contacts = contacts;

    const links = form.reference_links.filter((l) => l.label && l.url);
    if (links.length) payload.reference_links = links;

    const docs = form.campaign_docs
      .filter((d) => d.name)
      .map((d) => ({
        name: d.name,
        ...(d.url && { url: d.url }),
        ...(d.type && { type: d.type }),
      }));
    if (docs.length) payload.campaign_docs = docs;

    try {
      const result = await create.mutateAsync({ input: payload, authorName: author });
      navigate(`/projects/${result.project.id}`);
    } catch {
      /* erro exibido via create.error */
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">Novo projeto</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Básico</h2>
          <div className="space-y-4">
            <Field label="Nome do projeto" required>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </Field>
            <Field label="Nome do cliente" required>
              <Input value={form.client_name} onChange={(e) => update('client_name', e.target.value)} required />
            </Field>
            <Field label="Descrição" hint="O que o cliente faz, contexto de negócio">
              <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <Select value={form.status} onChange={(e) => update('status', e.target.value as FormState['status'])}>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Concluído</option>
                  <option value="archived">Arquivado</option>
                </Select>
              </Field>
              <Field label="Data de início">
                <Input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
              </Field>
            </div>
            <Field label="Posts planejados (opcional)">
              <Input type="number" min="0" value={form.planned_posts_count} onChange={(e) => update('planned_posts_count', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Equipe</h2>
          <div className="space-y-4">
            <Field label="Manager">
              <Input value={form.team_manager} onChange={(e) => update('team_manager', e.target.value)} placeholder="Ana" />
            </Field>
            <Field label="Analistas" hint="Separados por vírgula">
              <Input value={form.team_analysts} onChange={(e) => update('team_analysts', e.target.value)} placeholder="Cabral, Bruno" />
            </Field>
            <Field label="Estrategistas" hint="Separados por vírgula">
              <Input value={form.team_strategists} onChange={(e) => update('team_strategists', e.target.value)} placeholder="Carla" />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Contatos do cliente</h2>
          <DynamicList
            items={form.contacts}
            onChange={(v) => update('contacts', v)}
            newItem={() => ({ name: '', email: '', phone: '', role: '' })}
            addLabel="+ Adicionar contato"
            render={(item, u, remove) => (
              <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-800 p-3 sm:grid-cols-4">
                <Input placeholder="Nome" value={item.name} onChange={(e) => u({ name: e.target.value })} />
                <Input placeholder="Email" type="email" value={item.email} onChange={(e) => u({ email: e.target.value })} />
                <Input placeholder="Telefone" value={item.phone} onChange={(e) => u({ phone: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="Cargo" value={item.role} onChange={(e) => u({ role: e.target.value })} />
                  <Button type="button" variant="ghost" onClick={remove}>×</Button>
                </div>
              </div>
            )}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Links de referência</h2>
          <DynamicList
            items={form.reference_links}
            onChange={(v) => update('reference_links', v)}
            newItem={() => ({ label: '', url: '' })}
            addLabel="+ Adicionar link"
            render={(item, u, remove) => (
              <div className="flex gap-2">
                <Input placeholder="Label (ex: Site)" value={item.label} onChange={(e) => u({ label: e.target.value })} />
                <Input placeholder="https://..." value={item.url} onChange={(e) => u({ url: e.target.value })} />
                <Button type="button" variant="ghost" onClick={remove}>×</Button>
              </div>
            )}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Documentos de campanha</h2>
          <DynamicList
            items={form.campaign_docs}
            onChange={(v) => update('campaign_docs', v)}
            newItem={() => ({ name: '', url: '', type: '' })}
            addLabel="+ Adicionar documento"
            render={(item, u, remove) => (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input placeholder="Nome (ex: Briefing Q2)" value={item.name} onChange={(e) => u({ name: e.target.value })} />
                <Input placeholder="URL" value={item.url} onChange={(e) => u({ url: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="Tipo (pdf, doc, ...)" value={item.type} onChange={(e) => u({ type: e.target.value })} />
                  <Button type="button" variant="ghost" onClick={remove}>×</Button>
                </div>
              </div>
            )}
          />
        </Card>

        {create.isError && <ErrorMsg>{(create.error as Error).message}</ErrorMsg>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!author}>
            Criar projeto
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import type { Project } from '../lib/types';
import { Button, Card, Field, Input, Textarea, Select, ErrorMsg } from './ui';
import { DynamicList } from './DynamicList';

export interface ProjectFormValues {
  name: string;
  client_name: string;
  description: string;
  status: Project['status'];
  start_date: string;
  planned_posts_count: string;
  team_manager: string;
  team_analysts: string;
  team_strategists: string;
  contacts: Array<{ name: string; email: string; phone: string; role: string }>;
  reference_links: Array<{ label: string; url: string }>;
  campaign_docs: Array<{ name: string; url: string; type: string }>;
}

export const EMPTY_PROJECT_VALUES: ProjectFormValues = {
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

export function projectToFormValues(p: Project): ProjectFormValues {
  return {
    name: p.name,
    client_name: p.client_name,
    description: p.description ?? '',
    status: p.status,
    start_date: p.start_date ?? '',
    planned_posts_count: p.planned_posts_count != null ? String(p.planned_posts_count) : '',
    team_manager: p.team?.manager ?? '',
    team_analysts: (p.team?.analysts ?? []).join(', '),
    team_strategists: (p.team?.strategists ?? []).join(', '),
    contacts: (p.contacts ?? []).map((c) => ({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      role: c.role ?? '',
    })),
    reference_links: (p.reference_links ?? []).map((l) => ({ label: l.label, url: l.url })),
    campaign_docs: (p.campaign_docs ?? []).map((d) => ({
      name: d.name,
      url: d.url ?? '',
      type: d.type ?? '',
    })),
  };
}

export function formValuesToPayload(form: ProjectFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name,
    client_name: form.client_name,
    status: form.status,
    description: form.description || null,
    start_date: form.start_date || null,
    planned_posts_count: form.planned_posts_count ? parseInt(form.planned_posts_count, 10) : null,
  };

  const team: Record<string, unknown> = {};
  if (form.team_manager) team.manager = form.team_manager;
  const analysts = form.team_analysts.split(',').map((s) => s.trim()).filter(Boolean);
  if (analysts.length) team.analysts = analysts;
  const strategists = form.team_strategists.split(',').map((s) => s.trim()).filter(Boolean);
  if (strategists.length) team.strategists = strategists;
  payload.team = team;

  payload.contacts = form.contacts
    .filter((c) => c.name)
    .map((c) => ({
      name: c.name,
      ...(c.email && { email: c.email }),
      ...(c.phone && { phone: c.phone }),
      ...(c.role && { role: c.role }),
    }));

  payload.reference_links = form.reference_links.filter((l) => l.label && l.url);
  payload.campaign_docs = form.campaign_docs
    .filter((d) => d.name)
    .map((d) => ({
      name: d.name,
      ...(d.url && { url: d.url }),
      ...(d.type && { type: d.type }),
    }));

  return payload;
}

interface ProjectFormProps {
  initialValues?: ProjectFormValues;
  submitLabel: string;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function ProjectForm({
  initialValues = EMPTY_PROJECT_VALUES,
  submitLabel,
  loading,
  error,
  disabled,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormValues>(initialValues);

  function update<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(formValuesToPayload(form));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Básico</h2>
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
              <Select value={form.status} onChange={(e) => update('status', e.target.value as Project['status'])}>
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
            <Input
              type="number"
              min="0"
              value={form.planned_posts_count}
              onChange={(e) => update('planned_posts_count', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Equipe</h2>
        <div className="space-y-4">
          <Field label="Manager">
            <Input value={form.team_manager} onChange={(e) => update('team_manager', e.target.value)} placeholder="Ana" />
          </Field>
          <Field label="Analistas" hint="Separados por vírgula">
            <Input value={form.team_analysts} onChange={(e) => update('team_analysts', e.target.value)} placeholder="Bruno, Carla" />
          </Field>
          <Field label="Estrategistas" hint="Separados por vírgula">
            <Input value={form.team_strategists} onChange={(e) => update('team_strategists', e.target.value)} placeholder="Diego" />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Contatos do cliente</h2>
        <DynamicList
          items={form.contacts}
          onChange={(v) => update('contacts', v)}
          newItem={() => ({ name: '', email: '', phone: '', role: '' })}
          addLabel="+ Adicionar contato"
          render={(item, u, remove) => (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-3 sm:grid-cols-4">
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
        <h2 className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Links de referência</h2>
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
        <h2 className="mb-4 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Documentos de campanha</h2>
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

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

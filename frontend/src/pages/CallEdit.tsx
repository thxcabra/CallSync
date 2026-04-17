import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCall, useUpdateCall } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Field, Input, Textarea, ErrorMsg, Spinner } from '../components/ui';
import { DynamicList } from '../components/DynamicList';

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CallEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { author } = useAuthor();
  const q = useCall(id);
  const update = useUpdateCall();

  const [title, setTitle] = useState('');
  const [callDate, setCallDate] = useState('');
  const [participants, setParticipants] = useState<Array<{ name: string; role: string }>>([]);
  const [transcript, setTranscript] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && q.data) {
      const c = q.data.call;
      setTitle(c.title ?? '');
      setCallDate(toLocalInputValue(c.call_date));
      setParticipants((c.participants ?? []).map((p) => ({ name: p.name, role: p.role ?? '' })));
      setTranscript(c.transcript ?? '');
      setHydrated(true);
    }
  }, [q.data, hydrated]);

  if (q.isLoading) return <div className="flex items-center gap-2 text-slate-400"><Spinner /> Carregando...</div>;
  if (q.isError) return <ErrorMsg>{(q.error as Error).message}</ErrorMsg>;
  if (!q.data || !id) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!author || !id) return;
    const payload: Record<string, unknown> = {
      title: title || null,
      call_date: new Date(callDate).toISOString(),
      participants: participants.filter((p) => p.name),
      transcript: transcript || null,
    };
    try {
      await update.mutateAsync({ id, input: payload, authorName: author });
      navigate(`/calls/${id}`);
    } catch {
      /* erro em update.error */
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">Editar call</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Metadata</h2>
          <div className="space-y-4">
            <Field label="Título">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(opcional)" />
            </Field>
            <Field label="Data e hora da call" required>
              <Input type="datetime-local" value={callDate} onChange={(e) => setCallDate(e.target.value)} required />
            </Field>
            <Field label="Participantes">
              <DynamicList
                items={participants}
                onChange={setParticipants}
                newItem={() => ({ name: '', role: '' })}
                addLabel="+ Adicionar participante"
                render={(item, u, remove) => (
                  <div className="flex gap-2">
                    <Input placeholder="Nome" value={item.name} onChange={(e) => u({ name: e.target.value })} />
                    <Input placeholder="Papel" value={item.role} onChange={(e) => u({ role: e.target.value })} />
                    <Button type="button" variant="ghost" onClick={remove}>×</Button>
                  </div>
                )}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Transcrição</h2>
          <Field
            label="Texto da transcrição"
            hint="Editar a transcrição NÃO invalida análises anteriores. Re-analise se quiser atualizar a IA."
          >
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={16} />
          </Field>
        </Card>

        {update.isError && <ErrorMsg>{(update.error as Error).message}</ErrorMsg>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(`/calls/${id}`)}>
            Cancelar
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!author}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}

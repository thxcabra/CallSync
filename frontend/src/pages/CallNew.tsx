import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateCall, useProject } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Field, Input, Textarea, ErrorMsg } from '../components/ui';
import { DynamicList } from '../components/DynamicList';

export function CallNew() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { author } = useAuthor();
  const project = useProject(projectId);
  const create = useCreateCall();

  const [title, setTitle] = useState('');
  const [callDate, setCallDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [participants, setParticipants] = useState<Array<{ name: string; role: string }>>([]);
  const [mode, setMode] = useState<'audio' | 'manual'>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!author || !projectId) return;

    const fd = new FormData();
    if (mode === 'audio' && audioFile) fd.append('audio', audioFile);
    fd.append('metadata', JSON.stringify({
      title: title || undefined,
      call_date: new Date(callDate).toISOString(),
      participants: participants.filter((p) => p.name),
      transcript: mode === 'manual' ? transcript : undefined,
    }));

    try {
      const r = await create.mutateAsync({ projectId, formData: fd, authorName: author });
      navigate(`/calls/${r.call.id}`);
    } catch {
      /* erro em create.error */
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-100">Nova call</h1>
      {project.data && (
        <p className="mb-6 text-sm text-slate-400">
          {project.data.project.name} · {project.data.project.client_name}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Metadata</h2>
          <div className="space-y-4">
            <Field label="Título (opcional)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Kickoff, Review semanal..." />
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
                    <Input placeholder="Papel (CEO, Analista...)" value={item.role} onChange={(e) => u({ role: e.target.value })} />
                    <Button type="button" variant="ghost" onClick={remove}>×</Button>
                  </div>
                )}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-200">Conteúdo da call</h2>
          <div className="mb-4 inline-flex rounded-md border border-slate-700 p-1">
            {(['audio', 'manual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'audio' ? '🎙 Tenho o áudio' : '📝 Tenho a transcrição'}
              </button>
            ))}
          </div>

          {mode === 'audio' && (
            <Field label="Arquivo de áudio" required hint="MP3, WAV, M4A, MP4 ou WebM. Até 500 MB.">
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.mp4,.webm"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
                required={mode === 'audio'}
              />
              {audioFile && (
                <p className="mt-2 text-xs text-slate-500">
                  {audioFile.name} · {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </Field>
          )}

          {mode === 'manual' && (
            <Field label="Transcrição em texto" required hint="Cole a transcrição completa da call.">
              <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} required={mode === 'manual'} />
            </Field>
          )}
        </Card>

        {create.isError && <ErrorMsg>{(create.error as Error).message}</ErrorMsg>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={create.isPending}
            disabled={!author || (mode === 'audio' && !audioFile) || (mode === 'manual' && !transcript)}
          >
            Criar call
          </Button>
        </div>
      </form>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { useCall, useTranscribeCall, useAnalyzeCall, useAudioUrl } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Empty, ErrorMsg, Spinner } from '../components/ui';
import { SentimentBadge, TranscriptStatusBadge } from '../components/badges';

export function CallDetail() {
  const { id } = useParams();
  const { author } = useAuthor();
  const q = useCall(id);
  const transcribe = useTranscribeCall();
  const analyze = useAnalyzeCall();
  const audioUrl = useAudioUrl(id, q.data?.call.audio_path ?? null);

  if (q.isLoading) return <div className="flex items-center gap-2 text-slate-400"><Spinner /> Carregando...</div>;
  if (q.isError) return <ErrorMsg>{(q.error as Error).message}</ErrorMsg>;
  if (!q.data) return null;

  const { call, analysis } = q.data;
  const canAnalyze = call.transcript_status === 'transcribed' && !!call.transcript;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${call.project_id}`} className="text-sm text-indigo-400 hover:underline">
          ← Projeto
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{call.title || '(sem título)'}</h1>
            <p className="text-sm text-slate-400">
              {new Date(call.call_date).toLocaleString('pt-BR')} · por {call.author_name ?? '—'}
            </p>
          </div>
          <TranscriptStatusBadge status={call.transcript_status} />
        </div>
      </div>

      {call.participants.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Participantes</h2>
          <ul className="space-y-1 text-sm text-slate-200">
            {call.participants.map((p, i) => (
              <li key={i}>
                {p.name}
                {p.role && <span className="text-slate-500"> ({p.role})</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {call.audio_path && audioUrl.data && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Áudio</h2>
          <audio controls src={audioUrl.data} className="w-full" />
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Transcrição</h2>
          {call.audio_path && call.transcript_status !== 'transcribed' && (
            <Button
              variant="secondary"
              loading={transcribe.isPending || call.transcript_status === 'transcribing'}
              onClick={() => id && transcribe.mutate(id)}
            >
              {call.transcript_status === 'failed' ? 'Tentar de novo' : 'Transcrever áudio'}
            </Button>
          )}
        </div>

        {call.transcript_error && <div className="mb-3"><ErrorMsg>Erro: {call.transcript_error}</ErrorMsg></div>}
        {transcribe.isError && <div className="mb-3"><ErrorMsg>{(transcribe.error as Error).message}</ErrorMsg></div>}

        {call.transcript ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{call.transcript}</div>
        ) : (
          <Empty>Sem transcrição ainda.</Empty>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Análise IA</h2>
          {canAnalyze && (
            <Button
              variant={analysis ? 'secondary' : 'primary'}
              loading={analyze.isPending || analysis?.status === 'analyzing'}
              disabled={!author}
              onClick={() => id && author && analyze.mutate({ callId: id, authorName: author })}
            >
              {analysis ? 'Re-analisar' : '🤖 Analisar com IA'}
            </Button>
          )}
        </div>

        {!canAnalyze && <Empty>Transcreva a call antes de analisar.</Empty>}

        {analyze.isError && <ErrorMsg>{(analyze.error as Error).message}</ErrorMsg>}

        {analysis?.status === 'failed' && analysis.error_message && (
          <ErrorMsg>{analysis.error_message}</ErrorMsg>
        )}

        {analysis?.status === 'done' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{analysis.summary}</p>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sentimento</h3>
              <div className="flex items-start gap-3">
                <SentimentBadge sentiment={analysis.sentiment} />
                <p className="text-sm text-slate-300">{analysis.sentiment_justification}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tasks ({analysis.tasks.length})
              </h3>
              {analysis.tasks.length === 0 ? (
                <Empty>Nenhuma task identificada.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.tasks.map((t, i) => (
                    <li key={i} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-sm text-slate-200">{t.description}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                        {t.owner && <span>👤 {t.owner}</span>}
                        {t.due_date && <span>📅 {t.due_date}</span>}
                        {t.priority && (
                          <span>
                            {t.priority === 'high' ? '🔴 alta' : t.priority === 'medium' ? '🟡 média' : '🟢 baixa'}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Anotações ({analysis.notes.length})
              </h3>
              {analysis.notes.length === 0 ? (
                <Empty>Sem anotações.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.notes.map((n, i) => (
                    <li key={i} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-xs font-semibold text-slate-300">{n.topic}</p>
                      <p className="mt-1 text-sm text-slate-400">{n.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Feedback do cliente ({analysis.feedback.length})
              </h3>
              {analysis.feedback.length === 0 ? (
                <Empty>Sem feedback estruturado.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.feedback.map((f, i) => (
                    <li key={i} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-300">{f.topic}</p>
                        <SentimentBadge sentiment={f.sentiment} />
                      </div>
                      <p className="text-sm text-slate-400">{f.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Análise gerada em {new Date(analysis.created_at).toLocaleString('pt-BR')} por{' '}
              {analysis.author_name ?? '—'} · modelo: {analysis.model_used}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

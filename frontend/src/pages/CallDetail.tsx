import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCall, useTranscribeCall, useAnalyzeCall, useAudioUrl, useDeleteCall, useNotionPreview, useSyncToNotion } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Button, Card, Empty, ErrorMsg, Spinner } from '../components/ui';
import { SentimentBadge, TranscriptStatusBadge } from '../components/badges';
import { ConfirmModal } from '../components/ConfirmModal';
import { NotionReviewModal } from '../components/NotionReviewModal';

function SubSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-[rgba(42,96,251,0.2)] px-1.5 py-0.5 text-[#2A60FB] font-medium">
            {count}
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}

const priorityConfig = {
  high: { label: 'alta', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  medium: { label: 'média', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  low: { label: 'baixa', color: '#00ED4F', bg: 'rgba(0,237,79,0.1)', border: 'rgba(0,237,79,0.25)' },
};

export function CallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { author } = useAuthor();
  const q = useCall(id);
  const transcribe = useTranscribeCall();
  const analyze = useAnalyzeCall();
  const del = useDeleteCall();
  const audioUrl = useAudioUrl(id, q.data?.call.audio_path ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const notionPreview = useNotionPreview(id, q.data?.analysis?.status === 'done');
  const syncNotion = useSyncToNotion();
  const lastSync = notionPreview.data?.last_sync ?? null;

  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] py-12">
        <Spinner /> Carregando...
      </div>
    );
  if (q.isError) return <ErrorMsg>{(q.error as Error).message}</ErrorMsg>;
  if (!q.data) return null;

  const { call, analysis } = q.data;
  const canAnalyze = call.transcript_status === 'transcribed' && !!call.transcript;

  async function handleDelete() {
    if (!author || !id) return;
    try {
      await del.mutateAsync({ id, authorName: author });
      navigate(`/projects/${call.project_id}`);
    } catch {
      /* erro em del.error */
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to={`/projects/${call.project_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.4)] hover:text-[#2A60FB] transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        Projeto
      </Link>

      {/* Call Header */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0D1230] p-6 relative overflow-hidden">
        <svg viewBox="0 0 305 183" fill="white" className="absolute -right-8 -top-4 h-40 w-auto opacity-[0.035] pointer-events-none" aria-hidden>
          <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
        </svg>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="mb-2">
              <TranscriptStatusBadge status={call.transcript_status} />
            </div>
            <h1
              className="text-2xl font-semibold text-white"
              style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
            >
              {call.title || '(sem título)'}
            </h1>
            <p className="text-sm text-[rgba(255,255,255,0.45)] mt-1">
              {new Date(call.call_date).toLocaleString('pt-BR')} · por {call.author_name ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/calls/${id}/edit`)}>
              ✎ Editar
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Participants */}
      {call.participants.length > 0 && (
        <Card>
          <SubSection title="Participantes">
            <ul className="flex flex-wrap gap-2">
              {call.participants.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm"
                >
                  <span className="text-white">{p.name}</span>
                  {p.role && <span className="text-[rgba(255,255,255,0.4)] ml-1.5 text-xs">{p.role}</span>}
                </li>
              ))}
            </ul>
          </SubSection>
        </Card>
      )}

      {/* Audio */}
      {call.audio_path && audioUrl.data && (
        <Card>
          <SubSection title="Áudio">
            <audio
              controls
              src={audioUrl.data}
              className="w-full rounded-lg"
              style={{ accentColor: '#2A60FB' }}
            />
          </SubSection>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <SubSection title="Transcrição">
            <></>
          </SubSection>
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

        {call.transcript_error && (
          <div className="mb-3">
            <ErrorMsg>Erro: {call.transcript_error}</ErrorMsg>
          </div>
        )}
        {transcribe.isError && (
          <div className="mb-3">
            <ErrorMsg>{(transcribe.error as Error).message}</ErrorMsg>
          </div>
        )}

        {call.transcript ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[rgba(255,255,255,0.75)] max-h-64 overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] p-4">
            {call.transcript}
          </div>
        ) : (
          <Empty>Sem transcrição ainda.</Empty>
        )}
      </Card>

      {/* AI Analysis */}
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] mb-1">Análise IA</p>
            {analysis?.status === 'done' && (
              <p className="text-[11px] text-[rgba(255,255,255,0.3)]">
                {new Date(analysis.created_at).toLocaleString('pt-BR')} · {analysis.model_used}
              </p>
            )}
          </div>
          {canAnalyze && (
            <Button
              variant={analysis ? 'secondary' : 'primary'}
              loading={analyze.isPending || analysis?.status === 'analyzing'}
              disabled={!author}
              onClick={() => id && author && analyze.mutate({ callId: id, authorName: author })}
            >
              {analysis ? 'Re-analisar' : '✦ Analisar com IA'}
            </Button>
          )}
        </div>

        {!canAnalyze && <Empty>Transcreva a call antes de analisar.</Empty>}

        {analyze.isError && <ErrorMsg>{(analyze.error as Error).message}</ErrorMsg>}

        {analysis?.status === 'failed' && analysis.error_message && (
          <ErrorMsg>{analysis.error_message}</ErrorMsg>
        )}

        {analysis?.status === 'analyzing' && (
          <div className="flex items-center gap-3 py-6 text-[rgba(255,255,255,0.5)]">
            <Spinner />
            <span className="text-sm">Analisando com Gemini...</span>
          </div>
        )}

        {analysis?.status === 'done' && (
          <div className="space-y-7">
            {/* Summary */}
            <SubSection title="Resumo executivo">
              <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.75)]">{analysis.summary}</p>
            </SubSection>

            {/* Sentiment */}
            <SubSection title="Sentimento do cliente">
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    analysis.sentiment === 'positive'
                      ? 'rgba(0,237,79,0.2)'
                      : analysis.sentiment === 'negative'
                      ? 'rgba(248,113,113,0.2)'
                      : 'rgba(255,255,255,0.08)',
                  background:
                    analysis.sentiment === 'positive'
                      ? 'rgba(0,237,79,0.05)'
                      : analysis.sentiment === 'negative'
                      ? 'rgba(248,113,113,0.05)'
                      : 'rgba(255,255,255,0.03)',
                }}
              >
                <div className="mb-2">
                  <SentimentBadge sentiment={analysis.sentiment} />
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.65)]">{analysis.sentiment_justification}</p>
              </div>
            </SubSection>

            {/* Tasks */}
            <SubSection title="Tasks" count={analysis.tasks.length}>
              {analysis.tasks.length === 0 ? (
                <Empty>Nenhuma task identificada.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.tasks.map((t, i) => {
                    const p = t.priority && priorityConfig[t.priority as keyof typeof priorityConfig];
                    return (
                      <li
                        key={i}
                        className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4"
                      >
                        <p className="text-sm text-white">{t.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {t.owner && (
                            <span className="text-xs text-[rgba(255,255,255,0.45)]">
                              <span className="text-[rgba(255,255,255,0.25)] mr-1">responsável</span>
                              {t.owner}
                            </span>
                          )}
                          {t.due_date && (
                            <span className="text-xs text-[rgba(255,255,255,0.45)]">
                              <span className="text-[rgba(255,255,255,0.25)] mr-1">prazo</span>
                              {t.due_date}
                            </span>
                          )}
                          {p && (
                            <span
                              className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                              style={{ color: p.color, background: p.bg, borderColor: p.border }}
                            >
                              {p.label}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SubSection>

            {/* Notes */}
            <SubSection title="Anotações" count={analysis.notes.length}>
              {analysis.notes.length === 0 ? (
                <Empty>Sem anotações.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.notes.map((n, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <p className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-1">{n.topic}</p>
                      <p className="text-sm text-[rgba(255,255,255,0.65)]">{n.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SubSection>

            {/* Feedback */}
            <SubSection title="Feedback do cliente" count={analysis.feedback.length}>
              {analysis.feedback.length === 0 ? (
                <Empty>Sem feedback estruturado.</Empty>
              ) : (
                <ul className="space-y-2">
                  {analysis.feedback.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-xs font-semibold text-[rgba(255,255,255,0.7)]">{f.topic}</p>
                        <SentimentBadge sentiment={f.sentiment} />
                      </div>
                      <p className="text-sm text-[rgba(255,255,255,0.6)]">{f.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SubSection>

            <p className="border-t border-[rgba(255,255,255,0.06)] pt-4 text-[11px] text-[rgba(255,255,255,0.25)]">
              Gerado em {new Date(analysis.created_at).toLocaleString('pt-BR')} por {analysis.author_name ?? '—'} ·{' '}
              {analysis.model_used}
            </p>
          </div>
        )}
      </Card>

      {/* Notion Sync */}
      {analysis?.status === 'done' && (
        <NotionSection
          callId={id!}
          author={author}
          alreadySynced={!!lastSync}
          lastSyncedAt={lastSync?.synced_at ?? null}
          lastSyncedBy={lastSync?.author_name ?? null}
          syncing={syncNotion.isPending}
          syncError={syncNotion.isError ? (syncNotion.error as Error).message : null}
          syncResult={syncNotion.data ?? null}
          onReview={() => setReviewOpen(true)}
          onSyncAll={async () => {
            if (!author) return;
            await syncNotion.mutateAsync({ callId: id!, items: 'all', authorName: author });
          }}
        />
      )}

      <NotionReviewModal
        open={reviewOpen}
        preview={notionPreview.data ?? null}
        loading={notionPreview.isLoading}
        error={notionPreview.isError ? (notionPreview.error as Error).message : null}
        syncing={syncNotion.isPending}
        syncResult={syncNotion.data ?? null}
        onClose={() => { setReviewOpen(false); syncNotion.reset(); }}
        onSync={async (items) => {
          if (!author) return;
          await syncNotion.mutateAsync({ callId: id!, items, authorName: author });
          notionPreview.refetch();
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Excluir esta call?"
        message={
          <>
            <p>
              Vai apagar a call <strong className="text-white">{call.title || '(sem título)'}</strong>, o áudio (se
              houver), a transcrição e <strong>todas as análises</strong>. Sem desfazer.
            </p>
            {del.isError && <p className="mt-3 text-red-400">{(del.error as Error).message}</p>}
          </>
        }
        confirmLabel="Excluir call"
        loading={del.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function NotionSection({
  callId: _callId,
  author,
  alreadySynced,
  lastSyncedAt,
  lastSyncedBy,
  syncing,
  syncError,
  syncResult,
  onReview,
  onSyncAll,
}: {
  callId: string;
  author: string | null;
  alreadySynced: boolean;
  lastSyncedAt: string | null;
  lastSyncedBy: string | null;
  syncing: boolean;
  syncError: string | null;
  syncResult: { results: Array<{ item: string; notion_id?: string; error?: string }>; partial: boolean; synced_count: number } | null;
  onReview: () => void;
  onSyncAll: () => void;
}) {
  const hasPartialError = syncResult?.partial === true;
  const syncSuccess = syncResult && !syncResult.partial;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center justify-center h-5 w-5 rounded text-[11px] font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              N
            </span>
            <p className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)]">Notion</p>
          </div>
          {syncSuccess ? (
            <p className="text-[11px] text-[#00ED4F]">
              ✓ {syncResult.synced_count} item{syncResult.synced_count !== 1 ? 's' : ''} enviados com sucesso
            </p>
          ) : lastSyncedAt ? (
            <p className="text-[11px] text-[rgba(255,255,255,0.3)]">
              Sincronizado em {new Date(lastSyncedAt).toLocaleString('pt-BR')}
              {lastSyncedBy && ` · ${lastSyncedBy}`}
            </p>
          ) : (
            <p className="text-[11px] text-[rgba(255,255,255,0.25)]">Ainda não sincronizado</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onReview} disabled={!author || syncing}>
            Revisar outputs
          </Button>
          <Button variant="primary" loading={syncing} disabled={!author} onClick={onSyncAll}>
            {alreadySynced ? 'Reescrever no Notion ↗' : 'Enviar para Notion ↗'}
          </Button>
        </div>
      </div>

      {syncError && (
        <div className="mt-3"><ErrorMsg>{syncError}</ErrorMsg></div>
      )}
      {hasPartialError && (
        <div className="mt-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/08 px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-amber-300">
              {syncResult.synced_count} enviados, {syncResult.results.filter(r => r.error).length} com erro:
            </p>
            {syncResult.results.filter(r => r.error).map(r => (
              <p key={r.item} className="text-[11px] text-amber-300/70">• {r.item}: {r.error}</p>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

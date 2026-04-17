import { gemini, GEMINI_MODEL } from '../lib/gemini.js';
import { supabase } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

const TRANSCRIBE_PROMPT = `Você é um transcritor profissional. Transcreva o áudio fornecido para texto em português brasileiro.

Regras:
- Transcrição literal, mas use ortografia padrão (ex: "está" em vez de "tá") quando claramente é fala informal.
- Identifique mudanças de falante quando perceptível usando "[Falante A]:", "[Falante B]:" etc.
- Use parágrafos para separar temas.
- NÃO adicione comentários, resumos ou interpretações — só a transcrição.
- Marque trechos inaudíveis com [inaudível].`;

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/m4a',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
};

export async function transcribeAudio(callId: string): Promise<string> {
  const { data: call, error: callErr } = await supabase
    .from('calls').select('audio_path').eq('id', callId).single();
  if (callErr || !call) throw new HttpError(404, 'Call não encontrada');
  if (!call.audio_path) throw new HttpError(400, 'Call não tem áudio para transcrever.');

  await supabase.from('calls').update({
    transcript_status: 'transcribing',
    transcript_error: null,
  }).eq('id', callId);

  let geminiFileName: string | null = null;
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from('call-audio')
      .download(call.audio_path);
    if (dlErr || !blob) throw new Error(`Falha ao baixar áudio: ${dlErr?.message}`);

    const ext = call.audio_path.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_BY_EXT[ext] ?? 'audio/mpeg';

    const arrayBuffer = await blob.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: mimeType });

    const uploaded = await gemini.files.upload({
      file: audioBlob,
      config: { mimeType, displayName: `call-${callId}` },
    });
    geminiFileName = uploaded.name ?? null;

    // Aguarda processar
    let active = uploaded;
    while (active.state === 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 1500));
      active = await gemini.files.get({ name: active.name! });
    }
    if (active.state === 'FAILED') throw new Error('Gemini falhou ao processar o áudio.');

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: 'user',
        parts: [
          { fileData: { fileUri: active.uri!, mimeType } },
          { text: TRANSCRIBE_PROMPT },
        ],
      }],
    });

    const transcript = response.text?.trim() ?? '';
    if (!transcript) throw new Error('Gemini retornou transcrição vazia.');

    await supabase.from('calls').update({
      transcript,
      transcript_status: 'transcribed',
      transcript_error: null,
    }).eq('id', callId);

    return transcript;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await supabase.from('calls').update({
      transcript_status: 'failed',
      transcript_error: errMsg,
    }).eq('id', callId);
    throw err;
  } finally {
    if (geminiFileName) {
      try { await gemini.files.delete({ name: geminiFileName }); } catch { /* TTL 48h cuida */ }
    }
  }
}

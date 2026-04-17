import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { requireAuthor } from '../middleware/author.js';
import { transcribeAudio } from '../services/transcribe.js';
import { analyzeCall } from '../services/analyze.js';

export const callsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const callMetadataSchema = z.object({
  title: z.string().optional(),
  call_date: z.string(),
  participants: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    email: z.string().optional(),
  })).optional(),
  transcript: z.string().optional(),
});

callsRouter.get('/projects/:projectId/calls', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('project_id', req.params.projectId)
    .order('call_date', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  res.json({ calls: data });
}));

callsRouter.post(
  '/projects/:projectId/calls',
  requireAuthor,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const { data: project, error: pErr } = await supabase
      .from('projects').select('id').eq('id', req.params.projectId).single();
    if (pErr || !project) throw new HttpError(404, 'Projeto não encontrado');

    let metadataRaw: unknown;
    try {
      metadataRaw = typeof req.body.metadata === 'string'
        ? JSON.parse(req.body.metadata)
        : req.body;
    } catch {
      throw new HttpError(400, 'Campo "metadata" inválido (não é JSON).');
    }
    const metadata = callMetadataSchema.parse(metadataRaw);

    let audioPath: string | null = null;
    let transcriptSource: 'upload' | 'manual';
    let transcriptStatus: 'pending' | 'transcribed';
    let transcript: string | null = null;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase() ?? 'mp3';
      const filename = `${req.params.projectId}/${randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('call-audio')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (upErr) throw new HttpError(500, `Falha no upload: ${upErr.message}`);
      audioPath = filename;
      transcriptSource = 'upload';
      transcriptStatus = 'pending';
    } else if (metadata.transcript) {
      transcriptSource = 'manual';
      transcriptStatus = 'transcribed';
      transcript = metadata.transcript;
    } else {
      throw new HttpError(
        400,
        'Forneça um arquivo de áudio (campo "audio") OU um transcript manual no metadata.'
      );
    }

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        project_id: req.params.projectId,
        title: metadata.title,
        call_date: metadata.call_date,
        participants: metadata.participants ?? [],
        audio_path: audioPath,
        transcript,
        transcript_source: transcriptSource,
        transcript_status: transcriptStatus,
        author_name: req.authorName,
      })
      .select()
      .single();
    if (error) throw new HttpError(500, error.message);

    res.status(201).json({ call });
  })
);

callsRouter.get('/calls/:id', asyncHandler(async (req, res) => {
  const { data: call, error } = await supabase
    .from('calls').select('*').eq('id', req.params.id).single();
  if (error) {
    if (error.code === 'PGRST116') throw new HttpError(404, 'Call não encontrada');
    throw new HttpError(500, error.message);
  }

  const { data: analyses } = await supabase
    .from('call_analyses')
    .select('*')
    .eq('call_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(1);

  res.json({ call, analysis: analyses?.[0] ?? null });
}));

callsRouter.post('/calls/:id/transcribe', asyncHandler(async (req, res) => {
  const transcript = await transcribeAudio(req.params.id);
  res.json({ transcript });
}));

callsRouter.post('/calls/:id/analyze', requireAuthor, asyncHandler(async (req, res) => {
  const analysis = await analyzeCall(req.params.id, { authorName: req.authorName });
  res.json({ analysis });
}));

callsRouter.get('/calls/:id/audio-url', asyncHandler(async (req, res) => {
  const { data: call, error } = await supabase
    .from('calls').select('audio_path').eq('id', req.params.id).single();
  if (error || !call) throw new HttpError(404, 'Call não encontrada');
  if (!call.audio_path) throw new HttpError(404, 'Call não tem áudio');

  const { data: signed, error: sErr } = await supabase.storage
    .from('call-audio')
    .createSignedUrl(call.audio_path, 3600);
  if (sErr) throw new HttpError(500, sErr.message);
  res.json({ url: signed.signedUrl });
}));

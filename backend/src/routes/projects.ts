import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { requireAuthor } from '../middleware/author.js';

export const projectsRouter = Router();

const projectInputSchema = z.object({
  name: z.string().min(1),
  client_name: z.string().min(1),
  description: z.string().nullish(),
  campaign_docs: z.array(z.object({
    name: z.string(),
    url: z.string().nullish(),
    storage_path: z.string().nullish(),
    type: z.string().nullish(),
  })).optional(),
  planned_posts_count: z.number().int().nonnegative().nullish(),
  team: z.object({
    manager: z.string().optional(),
    analysts: z.array(z.string()).optional(),
    strategists: z.array(z.string()).optional(),
  }).optional(),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    role: z.string().nullish(),
  })).optional(),
  reference_links: z.array(z.object({
    label: z.string(),
    url: z.string(),
  })).optional(),
  start_date: z.string().nullish(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

projectsRouter.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  res.json({ projects: data });
}));

projectsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects').select('*').eq('id', req.params.id).single();
  if (error) {
    if (error.code === 'PGRST116') throw new HttpError(404, 'Projeto não encontrado');
    throw new HttpError(500, error.message);
  }

  const { data: calls, error: callsErr } = await supabase
    .from('calls')
    .select('id, title, call_date, transcript_status, author_name, created_at')
    .eq('project_id', req.params.id)
    .order('call_date', { ascending: false });
  if (callsErr) throw new HttpError(500, callsErr.message);

  res.json({ project, calls });
}));

projectsRouter.post('/', requireAuthor, asyncHandler(async (req, res) => {
  const input = projectInputSchema.parse(req.body);
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, author_name: req.authorName })
    .select()
    .single();
  if (error) throw new HttpError(500, error.message);
  res.status(201).json({ project: data });
}));

projectsRouter.patch('/:id', requireAuthor, asyncHandler(async (req, res) => {
  const input = projectInputSchema.partial().parse(req.body);
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') throw new HttpError(404, 'Projeto não encontrado');
    throw new HttpError(500, error.message);
  }
  res.json({ project: data });
}));

projectsRouter.delete('/:id', requireAuthor, asyncHandler(async (req, res) => {
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
  if (error) throw new HttpError(500, error.message);
  res.status(204).end();
}));

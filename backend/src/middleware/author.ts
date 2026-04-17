import type { RequestHandler } from 'express';
import { supabase } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    authorName?: string;
  }
}

let cache: { names: Set<string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function getActiveNames(): Promise<Set<string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.names;
  const { data, error } = await supabase.from('team_members').select('name').eq('active', true);
  if (error) throw new HttpError(500, `Falha ao carregar team_members: ${error.message}`);
  const names = new Set(data.map((m: { name: string }) => m.name));
  cache = { names, expiresAt: Date.now() + CACHE_TTL_MS };
  return names;
}

export const requireAuthor: RequestHandler = async (req, res, next) => {
  try {
    const author = req.header('x-author-name');
    if (!author) {
      return next(new HttpError(400, 'Header x-author-name é obrigatório.'));
    }
    const names = await getActiveNames();
    if (!names.has(author)) {
      return next(new HttpError(400, `Autor "${author}" não está em team_members ativos.`));
    }
    req.authorName = author;
    next();
  } catch (err) {
    next(err);
  }
};

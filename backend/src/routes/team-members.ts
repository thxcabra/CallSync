import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { asyncHandler, HttpError } from '../lib/errors.js';

export const teamMembersRouter = Router();

teamMembersRouter.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, role, email, active')
    .eq('active', true)
    .order('name');
  if (error) throw new HttpError(500, error.message);
  res.json({ members: data });
}));

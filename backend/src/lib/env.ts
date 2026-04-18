import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega .env da raiz do projeto (subindo de backend/src/lib).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  NOTION_API_TOKEN: z.string().min(1),
  NOTION_ROOT_PAGE_ID: z.string().min(1),
  // Optional overrides — skip auto-discovery when set
  NOTION_CALENDAR_DB_ID: z.string().optional(),
  NOTION_KANBAN_DB_ID: z.string().optional(),
  NOTION_HISTORY_PAGE_ID: z.string().optional(),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

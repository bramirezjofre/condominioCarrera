import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

let client = null;

export function getSupabaseClient() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('Supabase no configurado: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltantes');
    return null;
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}
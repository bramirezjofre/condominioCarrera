import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  TZ: z.string().default('America/Santiago'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('condominio-documentos'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  SESSION_COOKIE_NAME: z.string().default('condominio.sid'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@condominio.cl'),
  SEED_ADMIN_USERNAME: z.string().default('admin'),
  SEED_ADMIN_FULL_NAME: z.string().default('Administrador General'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('CambiarEsto123!'),
  DATA_MODE: z.enum(['demo', 'database']).default('demo'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Error en variables de entorno:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
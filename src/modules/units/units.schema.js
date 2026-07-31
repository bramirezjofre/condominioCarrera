import { z } from 'zod';

const uuid = z.string().uuid();

export const createUnitSchema = z.object({
  towerId: uuid,
  number: z.string().trim().min(1).max(30),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  kind: z.enum(['departamento', 'local', 'bodega', 'estacionamiento', 'otro']).default('departamento'),
  prorationFactor: z.coerce.number().min(0).max(1).default(0),
  areaM2: z.coerce.number().min(0).max(100000).optional()
});

export const updateUnitSchema = z.object({
  number: z.string().trim().min(1).max(30).optional(),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  kind: z.enum(['departamento', 'local', 'bodega', 'estacionamiento', 'otro']).optional(),
  prorationFactor: z.coerce.number().min(0).max(1).optional(),
  areaM2: z.coerce.number().min(0).max(100000).optional(),
  active: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()).optional()
});
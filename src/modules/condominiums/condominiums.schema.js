import { z } from 'zod';

export const createCondominiumSchema = z.object({
  name: z.string().trim().min(2).max(200),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(50).optional(),
  address: z.string().trim().max(300).optional(),
  commune: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(60).optional(),
  currency: z.string().trim().length(3).optional()
});

export const updateCondominiumSchema = createCondominiumSchema.partial();
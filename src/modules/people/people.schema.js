import { z } from 'zod';

export const createPersonSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  nationalId: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().trim().max(500).optional()
});

export const updatePersonSchema = createPersonSchema.partial();
import { z } from 'zod';

const uuid = z.string().uuid();

export const createOccupancySchema = z.object({
  personId: uuid,
  unitId: uuid,
  occupancyType: z.enum(['owner', 'tenant', 'resident', 'authorized']),
  isPrimary: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()).default(false),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  receivesBilling: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()).default(false),
  receivesNotifications: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()).default(false),
  notes: z.string().trim().max(500).optional()
});

export const endOccupancySchema = z.object({
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
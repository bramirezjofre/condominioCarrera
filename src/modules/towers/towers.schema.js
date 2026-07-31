import { z } from 'zod';

const uuid = z.string().uuid();

export const createTowerSchema = z.object({
  condominiumId: uuid,
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/),
  addressDetail: z.string().trim().max(300).optional(),
  floorCount: z.coerce.number().int().min(0).max(200).optional()
});

export const updateTowerSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  code: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/).optional(),
  addressDetail: z.string().trim().max(300).optional(),
  floorCount: z.coerce.number().int().min(0).max(200).optional()
});

export const assignAdministratorSchema = z.object({
  userId: uuid
});
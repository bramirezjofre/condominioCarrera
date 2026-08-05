import { env } from '../../config/env.js';

export function isDemoMode() {
  return env.DATA_MODE === 'demo';
}
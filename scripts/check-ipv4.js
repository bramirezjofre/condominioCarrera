import dns from 'node:dns/promises';
import { env } from '../src/config/env.js';

async function main() {
  const url = env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no definido');
    process.exit(1);
  }
  const { hostname } = new URL(url);
  try {
    const addresses = await dns.resolve4(hostname);
    if (addresses.length === 0) {
      console.error(`El host ${hostname} no entrego una direccion IPv4`);
      process.exit(2);
    }
    console.log(`IPv4 OK: ${hostname} -> ${addresses.join(', ')}`);
    process.exit(0);
  } catch (err) {
    console.error(`Error al resolver ${hostname}:`, err.message);
    process.exit(3);
  }
}

main();
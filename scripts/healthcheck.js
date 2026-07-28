import http from 'node:http';
import { env } from '../src/config/env.js';

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        resolve(res.statusCode);
        res.resume();
      })
      .on('error', reject);
  });
}

async function main() {
  const url = `http://127.0.0.1:${env.PORT}/health/live`;
  const status = await get(url);
  if (status !== 200) {
    console.error(`Healthcheck fallo: ${status}`);
    process.exit(1);
  }
  process.exit(0);
}

main();
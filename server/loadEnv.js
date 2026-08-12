import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const parsed = dotenv.config({ path: envPath }).parsed || {};
  // Only these vars are allowed to come from .env so a Windows-global
  // TURSO_URL (e.g. pointing at another app's database) can't win silently.
  for (const key of ['TURSO_URL', 'TURSO_AUTH_TOKEN']) {
    if (parsed[key]) process.env[key] = parsed[key];
  }
}

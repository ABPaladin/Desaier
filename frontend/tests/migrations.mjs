import { readFile, readdir } from 'node:fs/promises';

export async function applyMigrations(db, after = '') {
  const directory = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort()) {
    if (file.split('_')[0] > after) await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
}

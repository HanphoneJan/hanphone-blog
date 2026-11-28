import 'dotenv/config';
import {closeDb, initDb, schemaPath} from './db.js';

async function main(): Promise<void> {
  console.log(`[migrate] schema: ${schemaPath()}`);
  await initDb();
  await closeDb();
  console.log('[migrate] ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

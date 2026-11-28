import 'dotenv/config';
import {createApp} from './api.js';
import {closeDb, initDb} from './db.js';
import {env} from './env.js';
import {startWorker, stopWorker} from './worker.js';

async function main(): Promise<void> {
  await initDb();
  await startWorker();

  const app = createApp();
  const server = app.listen(env.port, '127.0.0.1', () => {
    console.log(`[judge-server] listening on http://127.0.0.1:${env.port}`);
    console.log(`[judge-server] go-judge: ${env.goJudgeUrl}`);
    console.log(`[judge-server] data: ${env.dataDir}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[judge-server] ${signal}, shutting down`);
    server.close();
    await stopWorker();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

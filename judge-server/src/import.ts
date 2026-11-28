import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {closeDb, initDb, query} from './db.js';
import {env} from './env.js';
import {readProblemDir} from './store.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main(): Promise<void> {
  await initDb();
  const dir = path.resolve(arg('--dir') ?? env.dataDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`数据目录不存在: ${dir}`);
  }

  const problemDirs = fs
    .readdirSync(dir, {withFileTypes: true})
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name))
    .filter((d) => fs.existsSync(path.join(d, 'meta.json')))
    .sort();

  let imported = 0;
  for (const problemDir of problemDirs) {
    const loaded = readProblemDir(problemDir);
    const m = loaded.meta;
    await query(
      `INSERT INTO problems
         (id, title, platform, source_url, mode, languages, time_limit_ms,
          memory_limit_mb, compare_mode, active_test_count, full_test_count,
          provenance, enabled, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now())
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, platform=EXCLUDED.platform,
         source_url=EXCLUDED.source_url, mode=EXCLUDED.mode,
         languages=EXCLUDED.languages, time_limit_ms=EXCLUDED.time_limit_ms,
         memory_limit_mb=EXCLUDED.memory_limit_mb,
         compare_mode=EXCLUDED.compare_mode,
         active_test_count=EXCLUDED.active_test_count,
         full_test_count=EXCLUDED.full_test_count,
         provenance=EXCLUDED.provenance, enabled=true, updated_at=now()`,
      [
        m.id,
        m.title,
        m.platform,
        m.url ?? null,
        m.mode,
        m.languages,
        m.timeLimitMs,
        m.memoryLimitMb,
        m.compare,
        m.activeTestCount,
        m.fullTestCount,
        JSON.stringify(m.provenance ?? {}),
      ],
    );
    imported += 1;
    console.log(
      `[import] ${m.id}  ${m.title}  ${m.mode}  ${m.activeTestCount}/${m.fullTestCount} tests`,
    );
  }

  console.log(`[import] done: ${imported} problems from ${dir}`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

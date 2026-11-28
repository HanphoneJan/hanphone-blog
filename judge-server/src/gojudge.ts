import {env} from './env.js';
import type {GoJudgeRequest, GoJudgeResult} from './types.js';

export class GoJudgeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GoJudgeError';
  }
}

function headers(): Record<string, string> {
  const out: Record<string, string> = {'content-type': 'application/json'};
  if (env.goJudgeToken) {
    out.authorization = `Bearer ${env.goJudgeToken}`;
  }
  return out;
}

export async function goJudgeRun(
  request: GoJudgeRequest,
  timeoutMs = 30_000,
): Promise<GoJudgeResult[]> {
  const res = await fetch(`${env.goJudgeUrl}/run`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new GoJudgeError(
      `go-judge /run failed: HTTP ${res.status} ${text.slice(0, 500)}`,
      res.status,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GoJudgeError(`go-judge /run returned non-JSON: ${text.slice(0, 500)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new GoJudgeError('go-judge /run returned non-array');
  }
  return parsed as GoJudgeResult[];
}

export async function goJudgeVersion(): Promise<Record<string, unknown>> {
  const res = await fetch(`${env.goJudgeUrl}/version`, {
    headers: headers(),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    throw new GoJudgeError(`go-judge /version failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as Record<string, unknown>;
}

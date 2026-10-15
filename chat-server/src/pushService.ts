import { readFileSync } from 'node:fs';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import jwt from 'jsonwebtoken';
import { PostgresService } from './postgresService.js';

/**
 * FCM 推送（HTTP v1 REST，自实现）。
 *
 * 为什么不用 firebase-admin：其 messaging 走 HTTP/2 直连 fcm.googleapis.com，**不支持代理**；
 * 国内服务器出网到 Google 必须经代理（本项目已用 mihomo 于 127.0.0.1:7890），
 * 故改用 HTTP/1.1 + HttpsProxyAgent 走 `FCM_PROXY`。
 *
 * 凭证：`FCM_SERVICE_ACCOUNT` 指向 Firebase 服务账号 JSON（含 project_id/private_key/token_uri）。
 * 未配置时推送整体关闭（仅打日志，不影响其它功能）。
 *
 * 发送策略：
 * - 私信：由 server.ts 判断「接收方是否有在线 socket」，离线才调用本模块（避免与 socket 通知重复）；
 * - 广播（热点更新）：blog 后端采集完成后经内部接口触发。
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const PROXY = process.env.FCM_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy || '';

const agent = PROXY ? new HttpsProxyAgent(PROXY) : undefined;

let sa: ServiceAccount | null = null;
let saLoaded = false;
let accessToken: string | null = null;
let accessTokenExp = 0;

function loadServiceAccount(): boolean {
  if (saLoaded) return !!sa;
  saLoaded = true;
  const path = process.env.FCM_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    console.log('[FCM] 未配置 FCM_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS，推送功能关闭');
    return false;
  }
  try {
    sa = JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      throw new Error('服务账号 JSON 缺少 project_id/client_email/private_key');
    }
    console.log(`[FCM] 服务账号已加载：${sa.project_id}${PROXY ? `（经代理 ${PROXY}）` : ''}`);
    return true;
  } catch (e) {
    console.error('[FCM] 读取服务账号失败，推送关闭:', e);
    sa = null;
    return false;
  }
}

export function isPushEnabled(): boolean {
  return loadServiceAccount();
}

interface HttpResult {
  status: number;
  body: string;
}

function httpsRequest(
  method: 'POST',
  url: string,
  body: string | null,
  headers: Record<string, string>
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: body != null ? { 'Content-Length': Buffer.byteLength(body), ...headers } : headers,
        agent,
        timeout: 20000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('FCM 请求超时')));
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

/** 取得 OAuth2 access token（JWT 断言 → token_uri；缓存到过期前 60s） */
async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < accessTokenExp - 60_000) return accessToken;
  if (!sa) return null;

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const assertion = jwt.sign(
    { iss: sa.client_email, scope: FCM_SCOPE, aud: tokenUri, iat: now, exp: now + 3600 },
    sa.private_key,
    { algorithm: 'RS256' }
  );
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();

  const res = await httpsRequest('POST', tokenUri, form, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  if (res.status !== 200) {
    throw new Error(`获取 access token 失败: HTTP ${res.status} ${res.body.slice(0, 200)}`);
  }
  const json = JSON.parse(res.body) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('access token 响应缺少 access_token');
  accessToken = json.access_token;
  accessTokenExp = Date.now() + (json.expires_in ?? 3600) * 1000;
  return accessToken;
}

export interface PushMessage {
  title: string;
  body: string;
  /** 自定义数据（值必须为字符串）；`type` 决定 Android 通知渠道 */
  data?: Record<string, string>;
}

/** 单条发送；token 失效返回 'invalid'，其它错误返回 'error'，成功返回 'ok' */
async function sendOne(
  token: string,
  accessTokenStr: string,
  message: PushMessage,
  channelId: string
): Promise<'ok' | 'invalid' | 'error'> {
  const url = `https://fcm.googleapis.com/v1/projects/${sa!.project_id}/messages:send`;
  const payload = {
    message: {
      token,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: 'high',
        notification: { channelId, sound: 'default' },
      },
    },
  };
  try {
    const res = await httpsRequest('POST', url, JSON.stringify(payload), {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessTokenStr}`,
    });
    if (res.status === 200) return 'ok';
    // 404 NOT_FOUND（UNREGISTERED）/ 400 INVALID_ARGUMENT → token 失效
    if (res.status === 404 || res.status === 400) {
      return 'invalid';
    }
    console.error(`[FCM] 发送失败 HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    return 'error';
  } catch (e) {
    console.error('[FCM] 发送异常:', e instanceof Error ? e.message : e);
    return 'error';
  }
}

/** 发送结果：成功的 token 数 */
export async function sendPush(tokens: string[], message: PushMessage): Promise<number> {
  if (!loadServiceAccount() || tokens.length === 0) return 0;

  let accessTokenStr: string;
  try {
    const t = await getAccessToken();
    if (!t) return 0;
    accessTokenStr = t;
  } catch (e) {
    console.error('[FCM] 获取 access token 失败:', e instanceof Error ? e.message : e);
    return 0;
  }

  const channelId = message.data?.type === 'hot' ? 'hot_updates' : 'chat_messages';
  let sent = 0;
  const invalid: string[] = [];

  // 小并发（每批 10 条），避免一次打太多
  for (let i = 0; i < tokens.length; i += 10) {
    const chunk = tokens.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map((tk) => sendOne(tk, accessTokenStr, message, channelId))
    );
    results.forEach((r, idx) => {
      if (r === 'ok') sent++;
      else if (r === 'invalid') invalid.push(chunk[idx]);
    });
  }

  if (invalid.length > 0) {
    await PostgresService.deleteDeviceTokens(invalid).catch(() => { /* 忽略清理失败 */ });
    console.log(`[FCM] 已清理失效 token ${invalid.length} 个`);
  }
  return sent;
}

/** 推送给指定用户的所有设备（私信） */
export async function pushToUser(userId: number, message: PushMessage): Promise<void> {
  if (!loadServiceAccount()) return;
  const tokens = await PostgresService.getDeviceTokensByUser(userId);
  if (tokens.length === 0) return;
  const sent = await sendPush(tokens, message);
  console.log(`[FCM] 私信推送 → 用户 ${userId}：成功 ${sent}/${tokens.length}`);
}

/** 广播给全部设备（热点更新等） */
export async function pushBroadcast(message: PushMessage): Promise<void> {
  if (!loadServiceAccount()) return;
  const tokens = await PostgresService.getAllDeviceTokens();
  if (tokens.length === 0) return;
  const sent = await sendPush(tokens, message);
  console.log(`[FCM] 广播推送：成功 ${sent}/${tokens.length}`);
}

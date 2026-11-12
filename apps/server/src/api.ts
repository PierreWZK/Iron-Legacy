import type { IncomingMessage, ServerResponse } from 'node:http';
import { AccountError, accountStore, type AccountStore } from './accounts';

const MAX_BODY = 64 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

/** Routes HTTP du compte : inscription, connexion, sauvegarde, classement. Toute autre URL est ignorée. */
export function handleApi(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return false;
  const store = accountStore();
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS).end();
    return true;
  }
  if (!store) {
    send(res, 503, { error: 'Comptes indisponibles.' });
    return true;
  }
  route(req, res, url, store).catch((e: unknown) => {
    const status = e instanceof AccountError ? 400 : 500;
    send(res, status, { error: e instanceof AccountError ? e.message : 'Erreur serveur.' });
  });
  return true;
}

async function route(req: IncomingMessage, res: ServerResponse, url: URL, store: AccountStore): Promise<void> {
  const path = url.pathname;
  const method = req.method ?? 'GET';
  if (method === 'GET' && path === '/api/ranking') {
    return send(res, 200, { rows: store.ranking(Number(url.searchParams.get('limit') ?? 20)) });
  }
  if (method === 'POST' && (path === '/api/register' || path === '/api/login')) {
    const body = await readJson(req);
    const name = typeof body['name'] === 'string' ? body['name'] : '';
    const password = typeof body['password'] === 'string' ? body['password'] : '';
    const out = path === '/api/register' ? store.register(name, password) : store.login(name, password);
    return send(res, 200, { token: out.token, name: out.account.name });
  }
  const token = bearer(req);
  const account = store.account(token);
  if (!account) return send(res, 401, { error: 'Connexion requise.' });
  if (method === 'GET' && path === '/api/me') return send(res, 200, { name: account.name });
  if (method === 'POST' && path === '/api/logout') {
    store.logout(token);
    return send(res, 200, { ok: true });
  }
  if (method === 'GET' && path === '/api/progress') return send(res, 200, { data: store.loadProgress(account.id) });
  if (method === 'PUT' && path === '/api/progress') {
    store.saveProgress(account.id, await readJson(req));
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'Route inconnue.' });
}

function bearer(req: IncomingMessage): string {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new AccountError('Requête trop grande.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8') || '{}';
        const v: unknown = JSON.parse(text);
        if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error('not an object');
        resolve(v as Record<string, unknown>);
      } catch {
        reject(new AccountError('JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

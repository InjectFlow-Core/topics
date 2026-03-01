// Minimal HTTP server to read/write board state JSON
// No external deps; uses Node's http, fs, url, crypto

const http = require('http');
const { parse: parseUrl } = require('url');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { webcrypto } = require('crypto');

const PORT = process.env.PORT || 3000;
const STATE_FILE = process.env.STATE_FILE || path.resolve(__dirname, 'state.json');
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const REQUIRE_SIG = process.env.REQUIRE_SIG === 'false' ? false : true;

// Public key must match the client key (ECDSA P-256 JWK)
const SIGN_PUB_JWK = {
  key_ops: ['verify'],
  ext: true,
  kty: 'EC',
  x: 'Cb7zcKgMmZ9aswDkPa6KKGc2siMIimjaGrKXWyUqwW4',
  y: 'fkbznjZz-DUNGFHPvsuJ0AtXBbknB29LZlh1g1jM_yk',
  crv: 'P-256'
};

function send(res, status, bodyObj, headers = {}) {
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma',
    'Access-Control-Max-Age': '86400',
    ...headers,
  });
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 5e6) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function verifySignature(jwk, payload, sigB64) {
  const pub = await webcrypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const te = new TextEncoder();
  const ok = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, Buffer.from(sigB64, 'base64'), te.encode(payload));
  return ok;
}

async function safeWrite(filePath, content) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await fsp.writeFile(tmp, content);
  await fsp.rename(tmp, filePath);
}

async function ensureFile() {
  try { await fsp.access(STATE_FILE, fs.constants.F_OK); }
  catch {
    const seed = { meta: { exportedAt: new Date().toISOString(), app: 'kaban-board', version: 1 }, data: { columns: { todo: [], inprogress: [], review: [], done: [] }, cards: {}, meta: { version: 1, wip: { todo: null, inprogress: 6, review: 5, done: null } } } };
    await safeWrite(STATE_FILE, JSON.stringify(seed, null, 2));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return send(res, 204);

  const { pathname } = parseUrl(req.url || '', true);
  try {
    if (req.method === 'GET' && pathname === '/api/state') {
      await ensureFile();
      const data = await fsp.readFile(STATE_FILE, 'utf8');
      return send(res, 200, JSON.parse(data));
    }
    if (req.method === 'POST' && pathname === '/api/state') {
      const raw = await readBody(req);
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid_json' }); }
      const payload = { meta: parsed.meta || {}, data: parsed.data };
      const canon = canonicalize(payload);
      if (REQUIRE_SIG) {
        if (!parsed.sig) return send(res, 400, { error: 'missing_sig' });
        const ok = await verifySignature(SIGN_PUB_JWK, canon, parsed.sig).catch(() => false);
        if (!ok) return send(res, 400, { error: 'bad_sig' });
      }
      await ensureFile();
      await safeWrite(STATE_FILE, JSON.stringify(parsed, null, 2));
      return send(res, 200, { ok: true, meta: parsed.meta });
    }
    return send(res, 404, { error: 'not_found' });
  } catch (e) {
    console.error('server error', e);
    return send(res, 500, { error: 'server_error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`State file: ${STATE_FILE}`);
});


// Cloud backup of the whole app state, in a private Vercel Blob keyed by the user's sync code.
import { get, put } from '@vercel/blob';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

async function read(path) {
  const r = await get(path, { access: 'private', useCache: false });
  return r?.stream ? JSON.parse(await new Response(r.stream).text()) : null;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const token = req.headers['x-sync-token'] || req.query.token;
  if (!TOKEN_RE.test(token || '')) return res.status(401).json({ error: 'Missing or invalid sync code' });
  const path = `data/${token}.json`;

  if (req.method === 'GET') return res.status(200).json((await read(path)) || { rev: 0, data: null });
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { rev = 0, data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'No data sent' });

  const cur = await read(path);
  // Someone else wrote since this device last synced: hand back the current copy to merge.
  if (cur && (cur.rev || 0) !== rev) return res.status(409).json(cur);

  const next = { rev: (cur?.rev || 0) + 1, data, updated: Date.now() };
  await put(path, JSON.stringify(next), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
  });
  return res.status(200).json({ rev: next.rev, updated: next.updated });
}

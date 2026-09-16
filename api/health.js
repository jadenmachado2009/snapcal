// Apple Health bridge. An iOS Shortcut POSTs today's active calories here;
// the app GETs them back. Data lives in a private Vercel Blob per sync token.
import { get, put } from '@vercel/blob';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

async function readDays(path) {
  const r = await get(path, { access: 'private', useCache: false });
  if (!r?.stream) return {};
  return JSON.parse(await new Response(r.stream).text()).days || {};
}

const num = v => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const token = req.headers['x-sync-token'] || req.query.token;
  if (!TOKEN_RE.test(token || '')) return res.status(401).json({ error: 'Missing or invalid sync token' });
  const path = `health/${token}.json`;

  if (req.method === 'GET') return res.status(200).json({ days: await readDays(path) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const src = { ...req.query, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  const active = num(src.active);
  if (active === null) return res.status(400).json({ error: 'Send "active" (calories burned) as a number' });

  let date = /^\d{4}-\d{2}-\d{2}$/.test(src.date || '') ? src.date : null;
  if (!date) {
    try { date = new Date().toLocaleDateString('en-CA', { timeZone: src.tz || 'Asia/Singapore' }); }
    catch { date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }); }
  }

  const days = await readDays(path);
  const steps = num(src.steps);
  days[date] = { active: Math.round(active), ...(steps !== null && { steps: Math.round(steps) }), updated: Date.now() };
  const kept = Object.fromEntries(Object.keys(days).sort().slice(-120).map(k => [k, days[k]]));

  await put(path, JSON.stringify({ days: kept }), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
  });
  return res.status(200).json({ ok: true, date, ...kept[date] });
}

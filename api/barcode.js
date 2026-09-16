// Barcode -> nutrition, via the free Open Food Facts database (no API key).
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const SCORE = { a: 9, b: 7, c: 5, d: 3, e: 1 };

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const code = String(req.query.code || '').replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) return res.status(400).json({ error: 'That barcode looks wrong' });

  const fields = 'product_name,product_name_en,brands,serving_size,quantity,nutriments,nutriscore_grade';
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
    headers: { 'user-agent': 'SnapCal/1.0 (personal calorie tracker)' },
  });
  const p = (await r.json().catch(() => ({})))?.product;
  const n = p?.nutriments || {};

  // Prefer the per-serving numbers; fall back to per 100 g.
  const kcalServing = num(n['energy-kcal_serving']);
  const per100 = num(n['energy-kcal_100g']) ?? (num(n.energy_100g) != null ? num(n.energy_100g) / 4.184 : null);
  const useServing = kcalServing != null;
  const calories = useServing ? kcalServing : per100;
  if (!p || calories == null) return res.status(404).json({ error: 'Not in the food database — snap a photo instead' });

  const g = k => num(n[`${k}_${useServing ? 'serving' : '100g'}`]) ?? 0;
  const name = [p.brands?.split(',')[0]?.trim(), p.product_name_en || p.product_name].filter(Boolean).join(' ') || 'Packaged food';

  return res.status(200).json({
    is_food: true,
    name: name.slice(0, 80),
    calories: Math.round(calories),
    protein: Math.round(g('proteins') * 10) / 10,
    carbs: Math.round(g('carbohydrates') * 10) / 10,
    fat: Math.round(g('fat') * 10) / 10,
    health_score: SCORE[p.nutriscore_grade] || 5,
    ingredients: [],
    serving: useServing ? `Per serving${p.serving_size ? ` (${p.serving_size})` : ''}` : 'Per 100 g',
    barcode: code,
  });
}

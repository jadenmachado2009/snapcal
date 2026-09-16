// Vercel serverless function: photo/text -> nutrition estimate via Gemini.
// Env: GEMINI_API_KEY (required), GEMINI_MODEL (optional), ACCESS_CODE (optional gate).

const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'].filter(Boolean))];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    name: { type: 'STRING', description: 'Short dish name, e.g. "Chicken rice with egg"' },
    calories: { type: 'NUMBER' },
    protein: { type: 'NUMBER', description: 'grams' },
    carbs: { type: 'NUMBER', description: 'grams' },
    fat: { type: 'NUMBER', description: 'grams' },
    health_score: { type: 'INTEGER', description: '1 (very unhealthy) to 10 (very healthy)' },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, calories: { type: 'NUMBER' } },
        required: ['name', 'calories'],
      },
    },
  },
  required: ['is_food', 'name', 'calories', 'protein', 'carbs', 'fat', 'health_score', 'ingredients'],
};

const SYSTEM = `You are the nutrition analysis engine of a calorie tracking app.
Identify the food and drink in the photo and/or description. Estimate portion sizes from visual cues
(plate and bowl size, utensils, hands, packaging). Return totals for the ENTIRE portion shown or described,
not per 100g. Be realistic: account for cooking oil, butter, sauces, dressings and sugary drinks.
If a nutrition label is visible, use it. Break the meal into its main ingredients with calories each;
ingredient calories should roughly sum to the total. Round calories to whole numbers and macros to 1 decimal.
If there is no food or drink, set is_food to false and use zeros.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (process.env.ACCESS_CODE && req.headers['x-access-code'] !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Wrong or missing access code (set it in Settings)' });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });

  const { image, mimeType = 'image/jpeg', text, fix, previous } = req.body || {};
  if (!image && !text && !fix) return res.status(400).json({ error: 'Send an image or a description' });

  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: mimeType, data: image } });
  let prompt = text ? `Food description: ${text}` : 'Analyze this meal.';
  if (fix) {
    prompt = `A previous estimate for this meal was:\n${JSON.stringify(previous)}\n\n` +
      `The user says it needs this correction: "${fix}"\n` +
      `Apply the correction and return the full updated estimate for the whole meal.`;
  }
  parts.push({ text: prompt });

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
  });

  let lastErr = 'Unknown error';
  // Up to 3 passes over the model list, backing off when everything is overloaded.
  const attempts = [0, 1500, 4000].flatMap(wait => MODELS.map((model, i) => ({ model, wait: i ? 0 : wait })));
  for (const { model, wait } of attempts) {
    if (wait) await new Promise(r => setTimeout(r, wait));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body,
    });
    const data = await r.json().catch(() => ({}));
    // Missing or overloaded model: try the next one.
    if ([404, 429, 500, 503].includes(r.status)) { lastErr = data?.error?.message || `Model ${model} unavailable`; continue; }
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || `Gemini error ${r.status}` });

    const out = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
    try {
      const j = JSON.parse(out);
      const n = v => Math.max(0, Math.round((Number(v) || 0) * 10) / 10);
      return res.status(200).json({
        is_food: !!j.is_food,
        name: String(j.name || 'Meal').slice(0, 80),
        calories: Math.round(n(j.calories)),
        protein: n(j.protein),
        carbs: n(j.carbs),
        fat: n(j.fat),
        health_score: Math.min(10, Math.max(1, Math.round(Number(j.health_score) || 5))),
        ingredients: (j.ingredients || []).slice(0, 12).map(i => ({ name: String(i.name), calories: Math.round(n(i.calories)) })),
        model,
      });
    } catch {
      return res.status(502).json({ error: 'Could not read the AI response, try again' });
    }
  }
  return res.status(502).json({ error: lastErr });
}

// Shared helper used by all /api/* serverless functions.
// Uses Google's Gemini API, which has a genuinely free tier (no credit card
// required) — plenty of headroom for a class of 20-50 students.
const MODEL = 'gemini-3.1-flash-lite';

async function callGemini({ system, message, maxTokens = 1500 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Server is missing GEMINI_API_KEY. Set it in your environment / Vercel project settings.');
    err.statusCode = 500;
    throw err;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini API error (${res.status}): ${text}`);
    err.statusCode = res.status >= 400 && res.status < 500 ? 400 : 502;
    throw err;
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    const err = new Error('Gemini returned no response (it may have hit a safety filter or the free-tier rate limit).');
    err.statusCode = 502;
    throw err;
  }
  const parts = candidate.content && candidate.content.parts;
  return parts ? parts.map(p => p.text || '').join('') : '';
}

// Models sometimes wrap JSON in markdown fences or add stray text — strip that out.
function extractJson(raw) {
  let cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('[') === -1
    ? cleaned.indexOf('{')
    : (cleaned.indexOf('{') === -1 ? cleaned.indexOf('[') : Math.min(cleaned.indexOf('{'), cleaned.indexOf('[')));
  const endCurly = cleaned.lastIndexOf('}');
  const endSquare = cleaned.lastIndexOf(']');
  const end = Math.max(endCurly, endSquare);
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

function sendError(res, err) {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Something went wrong' });
}

module.exports = { callGemini, extractJson, sendError, MODEL };



const { callGemini, extractJson, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { notes, count } = req.body || {};
    if (!notes) return res.status(400).json({ error: 'notes are required' });
    const n = Math.min(Math.max(parseInt(count, 10) || 12, 4), 30);

    const system = `You write flashcards strictly from a student's notes. Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{"cards":[{"front":"string, a term or short question","back":"string, a concise answer or definition"}]}
Rules: cover distinct key ideas from the notes, keep the front short (a term or question), keep the back to 1-2 sentences, no duplicates.`;

    const raw = await callGemini({
      system,
      message: `Generate ${n} flashcards from these notes:\n\n"""\n${notes}\n"""`,
      maxTokens: 2500,
    });

    const parsed = extractJson(raw);
    if (!parsed.cards || !Array.isArray(parsed.cards)) throw new Error('Malformed flashcards response');
    res.status(200).json({ cards: parsed.cards });
  } catch (err) {
    sendError(res, err);
  }
};

const { callGemini, extractJson, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { notes, count } = req.body || {};
    if (!notes) return res.status(400).json({ error: 'notes are required' });
    const n = Math.min(Math.max(parseInt(count, 10) || 8, 3), 20);

    const system = `You write multiple-choice quiz questions strictly from a student's notes. Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{"questions":[{"question":"string","options":["string","string","string","string"],"correctIndex":0,"explanation":"string, one sentence"}]}
Rules: exactly 4 options per question, correctIndex is 0-based, questions must cover distinct ideas from the notes and be answerable from them alone, explanations are short and reference the notes.`;

    const raw = await callGemini({
      system,
      message: `Generate ${n} quiz questions from these notes:\n\n"""\n${notes}\n"""`,
      maxTokens: 3000,
    });

    const parsed = extractJson(raw);
    if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('Malformed quiz response');
    res.status(200).json({ questions: parsed.questions });
  } catch (err) {
    sendError(res, err);
  }
};

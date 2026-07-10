const { callGemini, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { question, notes } = req.body || {};
    if (!question || !notes) return res.status(400).json({ error: 'question and notes are required' });

    const system = `You are a focused study assistant. Answer the student's question using ONLY the notes provided below — never use outside knowledge to fill gaps. If the notes don't contain the answer, say so plainly and suggest what to check for instead. Be clear and concise, use examples or quotes from the notes where useful, and write like a helpful classmate, not a textbook.

NOTES:
"""
${notes}
"""`;

    const answer = await callGemini({
      system,
      message: question,
      maxTokens: 1000,
    });

    res.status(200).json({ answer });
  } catch (err) {
    sendError(res, err);
  }
};

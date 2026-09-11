const fetchFn = (...args) => fetch(...args);

async function generateReply(messages) {
  const key = process.env.API_KEY_GEMINI1 || process.env.API_KEY_GEMINI2;
  if (!key) { const error = new Error('No hay una API key de IA configurada.'); error.statusCode = 503; throw error; }
  const contents = messages.slice(-20).map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(message.content || '') }] }));
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const response = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: process.env.BOT_PROMPT || 'Responde en español de forma útil y segura.' }] }, contents }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error?.message || 'El proveedor de IA rechazó la solicitud.'); error.statusCode = response.status; throw error; }
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || 'No recibí contenido del modelo.';
}

async function chat(req, res, next) {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages.slice(-20) : [];
    res.json({ reply: await generateReply(messages) });
  } catch (error) { next(error); }
}

module.exports = { chat, generateReply };
